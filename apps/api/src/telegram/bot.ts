import {
  LESSON_SECTIONS,
  overallScore,
  parseLevel,
  parseReminderHours,
  type LessonSection,
  type TutorScenario,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { escapeMarkdown, progressBar, telegram, type InlineKeyboard } from "./client.js";
import { ensureProgress, getDashboard } from "../services/progress.js";
import { getDailySession, getHome } from "../services/planner.js";
import { getDueQueue, reviewVocabulary } from "../services/vocabulary.js";
import { completeLessonSection, getLesson, getNextLesson, startLesson } from "../services/learning.js";
import { submitExercise } from "../services/assessment.js";
import { sendConversationMessage, startConversation } from "../services/practice.js";
import { getSpeech, synthesisAvailable } from "../services/speech.js";
import { realUsageForWord } from "../services/media.js";
import { explainSpanishLine } from "../services/authentic.js";
import { nextBreakdownPage, startBreakdown, type BreakdownPage } from "../services/breakdown.js";
import {
  findTracks,
  keepableWords,
  recordSongQuiz,
  saveSongWords,
  songExerciseAt,
  startSongBreakdown,
  studySong,
} from "../services/songs.js";
import {
  browseFilms,
  browsePodcasts,
  getMediaOverview,
  openArticle,
  recordMediaActivity,
  searchMedia,
} from "../services/authentic.js";
import {
  getReminderSettings,
  sendTestReminder,
  updateReminderSettings,
} from "../services/reminders.js";
import {
  createWordMnemonic,
  getGrammarMnemonics,
  getWordMnemonics,
  rateMnemonic,
} from "../services/mnemonics.js";

/**
 * The Telegram bot (§17, §18).
 *
 * Every command here calls the same services the web app calls — the bot has
 * no learning logic of its own. That is deliberate and is what makes progress
 * genuinely shared: a lesson section finished in Telegram is the identical
 * write that the browser would have made, so the website picks up exactly
 * where the chat left off.
 *
 * Interaction is button-first. Callback data is kept short (Telegram caps it
 * at 64 bytes) using the form `action:arg1:arg2`.
 */

export interface TelegramUpdate {
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.callback_query) return await handleCallback(update.callback_query);
    if (update.message) return await handleMessage(update.message);
  } catch (error) {
    console.error("[telegram] update handler failed:", error);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      await telegram.sendMessage({
        chatId,
        text: "Something went wrong on our side. Try /daily to pick up where you left off.",
      });
    }
  }
}

// ─── Account resolution ──────────────────────────────────────────────────────

/**
 * Find or create the account behind a Telegram chat.
 *
 * A chat that has never been linked gets a fresh account, so someone can start
 * learning in Telegram with no web sign-up at all and link a web login later.
 */
async function resolveUser(from: { id: number; username?: string; first_name?: string }, chatId: number) {
  const telegramId = String(from.id);

  const create = {
    displayName: from.first_name ?? from.username ?? "Learner",
    telegramId,
    telegramUsername: from.username ?? null,
    telegramChatId: String(chatId),
    createdVia: "telegram",
  };

  // Telegram delivers updates in parallel, so a learner tapping two buttons at
  // once races two inserts for the same chat.
  //
  // The upsert deliberately has no nested writes: with one, Prisma cannot use
  // Postgres's atomic INSERT … ON CONFLICT and silently falls back to a
  // find-then-create, which is exactly the race we are trying to close. The
  // progress row is therefore created separately, below.
  let user;
  try {
    user = await prisma.user.upsert({
      where: { telegramId },
      create,
      update: { telegramChatId: String(chatId) },
    });
  } catch {
    // Belt and braces: if a concurrent insert still wins, the row now exists,
    // so read it rather than failing the learner's command.
    user = await prisma.user.findUniqueOrThrow({ where: { telegramId } });
  }

  await ensureProgress(user.id);
  return user;
}

// ─── Messages ────────────────────────────────────────────────────────────────

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>): Promise<void> {
  const { chat, text, from } = message;
  if (!from || !text) return;

  const user = await resolveUser(from, chat.id);
  const [command, ...args] = text.trim().split(/\s+/);

  switch (command?.toLowerCase()) {
    case "/start":
      return sendWelcome(chat.id, user.displayName);
    case "/register":
    case "/link":
      return handleLink(chat.id, user.id, args[0]);
    case "/daily":
      return sendDaily(chat.id, user.id);
    case "/lesson":
      return sendLesson(chat.id, user.id);
    case "/review":
      return sendReviewCard(chat.id, user.id);
    case "/vocabulary":
    case "/word":
      // With an argument this becomes a lookup: the learner types a word and
      // gets it in real Spanish, rather than only their own statistics.
      return args.length > 0
        ? sendWordUsage(chat.id, user.id, args.join(" "))
        : sendVocabulary(chat.id, user.id);
    case "/practice":
      return sendPractice(chat.id, user.id);
    case "/hook":
    case "/mnemonic":
      return sendHookLookup(chat.id, user.id, args.join(" "));
    case "/say":
    case "/pronounce":
      return sendPronunciation(chat.id, args.join(" "), { dialect: user.dialectPreference as "es-ES" | "es-419" });
    case "/explain":
    case "/x":
      return sendExplanation(chat.id, user.id, args.join(" "));
    case "/media":
      return sendMedia(chat.id, user.id, args.join(" "));
    case "/song":
      return sendSongSearch(chat.id, user.id, args.join(" "));
    case "/lyrics":
    case "/breakdown":
      // Newlines matter here — the passage is the argument — so the raw text
      // after the command is used rather than the whitespace-split args.
      return sendBreakdown(chat.id, user.id, text.trim().slice(command.length).trim());
    case "/watch":
      return sendWatchList(chat.id, user.id);
    case "/podcast":
    case "/podcasts":
      return sendPodcasts(chat.id, user.id);
    case "/speak":
      return sendScenarioPicker(chat.id);
    case "/progress":
      return sendProgress(chat.id, user.id);
    case "/stats":
      return sendStats(chat.id, user.id);
    case "/remind":
    case "/reminders":
      return sendReminderSettings(chat.id, user.id, args.join(" "));
    case "/help":
      return sendWelcome(chat.id, user.displayName);
    default:
      // Not a command: if a tutor conversation is open, this is the learner's
      // turn in it. Otherwise nudge them towards the buttons.
      return handleFreeText(chat.id, user.id, text);
  }
}

async function handleFreeText(chatId: number, userId: string, text: string): Promise<void> {
  const conversation = await prisma.conversation.findFirst({
    where: { userId, origin: "telegram", isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    // Several lines pasted at a tutor, with no conversation open, has exactly
    // one sensible reading: "help me read this". Guessing wrong costs the
    // learner a message; refusing to guess costs them the feature, since
    // nobody discovers a command by pasting.
    if (text.trim().split(/\r?\n/).filter((line) => line.trim()).length > 1) {
      return sendBreakdown(chatId, userId, text);
    }

    await telegram.sendMessage({
      chatId,
      text: "I didn't catch that. Use the buttons below, or /daily for today's session.",
      keyboard: mainMenu(),
    });
    return;
  }

  const result = await sendConversationMessage({
    userId,
    conversationId: conversation.id,
    content: text,
    source: "telegram",
  });

  // The Spanish reply comes first and stands alone — coaching is appended
  // afterwards so it reads as feedback on a finished turn, not an interruption.
  let reply = escapeMarkdown(result.reply);

  if (result.corrections.length > 0) {
    reply += "\n\n───\n*Feedback*";
    for (const correction of result.corrections) {
      reply += `\n\n❌ ${escapeMarkdown(correction.original)}\n✅ ${escapeMarkdown(correction.corrected)}\n_${escapeMarkdown(correction.explanation)}_`;
    }
  } else if (result.coaching) {
    reply += `\n\n_${escapeMarkdown(result.coaching)}_`;
  }

  const keyboard: InlineKeyboard = [
    [
      { text: "🇬🇧 Translate", callback_data: `tr:${conversation.id}` },
      { text: "⏹ End", callback_data: `endconv:${conversation.id}` },
    ],
  ];
  if (result.suggestion) {
    keyboard.unshift([{ text: `💡 ${result.suggestion.slice(0, 30)}`, callback_data: "noop" }]);
  }

  await telegram.sendMessage({ chatId, text: reply, keyboard });
}

// ─── Commands ────────────────────────────────────────────────────────────────

function mainMenu(): InlineKeyboard {
  return [
    [
      { text: "📅 Today's session", callback_data: "daily" },
      { text: "📖 Continue lesson", callback_data: "lesson" },
    ],
    [
      { text: "🔁 Review words", callback_data: "review" },
      { text: "✍️ Practice", callback_data: "practice" },
    ],
    [
      { text: "💬 Talk to tutor", callback_data: "speak" },
      { text: "📊 Progress", callback_data: "progress" },
    ],
    [
      { text: "🎬 Real Spanish", callback_data: "media" },
      { text: "🎧 Podcasts", callback_data: "podcast" },
    ],
    [{ text: "🎵 Study a song", callback_data: "songhelp" }],
  ];
}

async function sendWelcome(chatId: number, name: string): Promise<void> {
  await telegram.sendMessage({
    chatId,
    text:
      `¡Hola, ${escapeMarkdown(name)}! 👋\n\n` +
      "I'm your Spanish tutor. I'll take you from complete beginner to advanced, " +
      "one short session a day.\n\n" +
      "Everything you do here syncs with the Lingoza web app — start a lesson on " +
      "your laptop and finish it on your phone.\n\n" +
      "Pick something to get started:",
    keyboard: mainMenu(),
  });
}

async function handleLink(chatId: number, userId: string, code?: string): Promise<void> {
  if (!code) {
    await telegram.sendMessage({
      chatId,
      text:
        "To connect an existing Lingoza web account:\n\n" +
        "1. Open the web app → Settings → *Connect Telegram*\n" +
        "2. Send me `/link YOURCODE`\n\n" +
        "Your progress will then be shared between both.",
    });
    return;
  }

  const target = await prisma.user.findUnique({ where: { linkCode: code.toUpperCase() } });

  if (!target || !target.linkCodeExpires || target.linkCodeExpires < new Date()) {
    await telegram.sendMessage({
      chatId,
      text: "That code is invalid or has expired. Generate a new one in the web app.",
    });
    return;
  }

  if (target.id === userId) {
    await telegram.sendMessage({ chatId, text: "This chat is already linked to that account." });
    return;
  }

  // Move this chat's Telegram identity onto the web account. The temporary
  // Telegram-only account is removed, and its progress is not merged — doing
  // so silently would produce an unexplainable mixture of two histories.
  const telegramOnly = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.$transaction(async (tx) => {
    if (telegramOnly?.createdVia === "telegram") {
      await tx.user.delete({ where: { id: userId } });
    }
    await tx.user.update({
      where: { id: target.id },
      data: {
        telegramId: telegramOnly?.telegramId ?? null,
        telegramUsername: telegramOnly?.telegramUsername ?? null,
        telegramChatId: String(chatId),
        linkCode: null,
        linkCodeExpires: null,
      },
    });
  });

  await telegram.sendMessage({
    chatId,
    text: `✅ Linked to *${escapeMarkdown(target.displayName)}*.\n\nYour web progress is now available here.`,
    keyboard: mainMenu(),
  });
}

async function sendDaily(chatId: number, userId: string): Promise<void> {
  const session = await getDailySession(userId);
  const done = session.items.filter((i) => i.completed).length;

  const lines = [
    "*Today's Spanish session*",
    "",
    `⏱ About ${session.targetMinutes} minutes · ${done}/${session.totalItems} done`,
    "",
  ];

  for (const item of session.items) {
    lines.push(`${item.completed ? "✅" : "▫️"} *${escapeMarkdown(item.title)}* — ${item.minutes} min`);
    lines.push(`   _${escapeMarkdown(item.rationale)}_`);
  }

  const next = session.items.find((i) => !i.completed);

  await telegram.sendMessage({
    chatId,
    text: lines.join("\n"),
    keyboard: next
      ? [
          [{ text: `▶️ Start: ${next.title.slice(0, 28)}`, callback_data: `item:${next.id}` }],
          [{ text: "🏠 Menu", callback_data: "menu" }],
        ]
      : [
          [{ text: "🎉 All done — review anyway", callback_data: "review" }],
          [{ text: "🏠 Menu", callback_data: "menu" }],
        ],
  });
}

async function sendLesson(chatId: number, userId: string): Promise<void> {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const lesson = progress?.resumeLessonId
    ? await prisma.lesson.findUnique({ where: { id: progress.resumeLessonId } })
    : await getNextLesson(userId);

  if (!lesson) {
    await telegram.sendMessage({
      chatId,
      text: "You've finished everything available at your level. Try /review or /speak.",
      keyboard: mainMenu(),
    });
    return;
  }

  await startLesson(userId, lesson.id);
  await sendLessonSection(chatId, userId, lesson.slug);
}

/** Render the learner's current section of a lesson. */
async function sendLessonSection(chatId: number, userId: string, slug: string): Promise<void> {
  const lesson = await getLesson(userId, slug);
  if (!lesson) return;

  const section = lesson.sections.current;
  const body = renderSection(lesson, section);

  await telegram.sendMessage({
    chatId,
    text:
      `*${escapeMarkdown(lesson.title)}*\n` +
      `_${sectionLabel(section)} · ${Math.round(lesson.sections.progressPercent)}% through_\n\n` +
      body,
    keyboard: [
      [{ text: "✅ Done — next section", callback_data: `sec:${slug}:${section}` }],
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

function sectionLabel(section: LessonSection): string {
  return section.charAt(0).toUpperCase() + section.slice(1);
}

/** Format one lesson section for a chat window. */
function renderSection(lesson: NonNullable<Awaited<ReturnType<typeof getLesson>>>, section: LessonSection): string {
  switch (section) {
    case "explanation":
      return truncate(stripMarkdownEmphasis(lesson.explanation), 1200);
    case "examples":
      return lesson.examples
        .map((e) => `🇪🇸 ${escapeMarkdown(e.spanish)}\n🇬🇧 ${escapeMarkdown(e.english)}${e.note ? `\n_${escapeMarkdown(e.note)}_` : ""}`)
        .join("\n\n");
    case "vocabulary":
      return lesson.vocabulary
        .map((w) => `• *${escapeMarkdown(w.spanish)}* — ${escapeMarkdown(w.english)}\n  _${escapeMarkdown(w.pronunciation)}_`)
        .join("\n");
    case "grammar":
      return lesson.grammar
        .map((g) => `*${escapeMarkdown(g.title)}*\n\`${escapeMarkdown(g.formula)}\`\n\n${truncate(stripMarkdownEmphasis(g.whenToUse), 400)}`)
        .join("\n\n");
    case "listening":
      return lesson.listening
        .map(
          (l) =>
            `🎧 *${escapeMarkdown(l.title)}*\n\n` +
            l.segments
              .map((s) => `${s.speaker ? `*${escapeMarkdown(s.speaker)}:* ` : ""}${escapeMarkdown(s.spanish)}\n_${escapeMarkdown(s.english)}_`)
              .join("\n\n"),
        )
        .join("\n\n");
    case "speaking":
      return lesson.speaking
        .map(
          (s) =>
            `🎙 ${escapeMarkdown(s.instruction)}${s.targetText ? `\n\n*${escapeMarkdown(s.targetText)}*` : ""}\n\n_Say it out loud, then mark it done. For scored speaking practice, use the web app._`,
        )
        .join("\n\n");
    case "review":
      return escapeMarkdown(lesson.review);
    default:
      return "Use the button below to continue.";
  }
}

async function sendReviewCard(chatId: number, userId: string): Promise<void> {
  const queue = await getDueQueue(userId, 1);
  const item = queue[0];

  if (!item) {
    await telegram.sendMessage({
      chatId,
      text: "Nothing is due for review right now. Well done — come back later.",
      keyboard: mainMenu(),
    });
    return;
  }

  await telegram.sendMessage({
    chatId,
    text:
      `*${escapeMarkdown(item.word.spanish)}*\n` +
      `_${escapeMarkdown(item.word.pronunciation)}_\n\n` +
      (item.isNew ? "🆕 New word\n\n" : "") +
      "Do you remember what this means?",
    keyboard: [[{ text: "👁 Show answer", callback_data: `show:${item.word.id}` }], [{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

/** /hook <word> — look up the memory hook for a specific word. */
async function sendHookLookup(chatId: number, userId: string, query: string): Promise<void> {
  if (!query.trim()) {
    await telegram.sendMessage({
      chatId,
      text: "Send `/hook <word>` — for example `/hook perro` — and I will give you a memory hook for it.",
    });
    return;
  }

  const bare = query.trim().toLowerCase();
  const word = await prisma.vocabularyWord.findFirst({
    where: {
      OR: [
        { spanish: { equals: bare, mode: "insensitive" } },
        { spanish: { equals: `el ${bare}`, mode: "insensitive" } },
        { spanish: { equals: `la ${bare}`, mode: "insensitive" } },
        { english: { equals: bare, mode: "insensitive" } },
      ],
    },
  });

  if (!word) {
    await telegram.sendMessage({ chatId, text: `I do not have "${escapeMarkdown(query)}" in the vocabulary yet.` });
    return;
  }

  await sendWordHook(chatId, userId, word.id);
}

/**
 * Real Spanish (§ authentic media).
 *
 * Same constraint as the web app: lyrics and subtitles are licensed works and
 * are never sent. What the bot delivers is the preview clip the platform
 * publishes for playback, freely-licensed prose about the work, and a link to
 * the original.
 */
async function sendMedia(chatId: number, userId: string, query: string): Promise<void> {
  if (!query.trim()) {
    const overview = await getMediaOverview(userId);
    const artists = overview.suggestions.artists.slice(0, 5);
    const watching = overview.suggestions.watching.slice(0, 4);

    await telegram.sendMessage({
      chatId,
      text:
        "*Real Spanish*\n\n" +
        "Films, music and articles made for Spanish speakers — not for learners.\n\n" +
        "Send `/media <name>` — for example `/media Coco` or `/media Bad Bunny`.\n" +
        "Tap any song in the results, or send `/song <artist> <title>`, to see how much " +
        "of it you can already follow.\n\n" +
        (artists.length > 0
          ? "*Listen, easiest first*\n" +
            artists.map((a) => `• ${escapeMarkdown(a.name)} (${a.level}) — ${escapeMarkdown(a.why)}`).join("\n") +
            "\n\n"
          : "") +
        (watching.length > 0
          ? "*Watch*\n" +
            watching.map((w) => `• ${escapeMarkdown(w.title)} (${w.level}) — ${escapeMarkdown(w.why)}`).join("\n")
          : ""),
      keyboard: [
        [
          { text: "🎬 Films", callback_data: "watch" },
          { text: "🎧 Podcasts", callback_data: "podcast" },
        ],
        [{ text: "🏠 Menu", callback_data: "menu" }],
      ],
    });
    return;
  }

  await telegram.sendMessage({ chatId, text: `Searching for *${escapeMarkdown(query)}*…` });
  const results = await searchMedia(userId, query);

  const article = results.articles.items[0];
  const tracks = results.music.items.filter((t) => t.previewUrl).slice(0, 3);
  const film = results.films.items[0];

  if (!article && tracks.length === 0 && !film) {
    await telegram.sendMessage({
      chatId,
      text: `Nothing found for *${escapeMarkdown(query)}*. Try the Spanish title.`,
    });
    return;
  }

  if (article) {
    await telegram.sendMessage({
      chatId,
      text:
        `📖 *${escapeMarkdown(article.title)}*` +
        (article.description ? `\n_${escapeMarkdown(article.description)}_` : "") +
        `\n\n${escapeMarkdown(truncate(article.extract, 700))}` +
        `\n\n_Level ~${article.estimatedLevel} · ${article.wordCount} words · Wikipedia, CC BY-SA_`,
      keyboard: [
        [{ text: "📄 Read more", callback_data: `art:${article.title.slice(0, 50)}` }],
        [{ text: "🔗 Open on Wikipedia", url: article.url }],
      ],
    });
  }

  if (film) {
    await telegram.sendMessage({
      chatId,
      text:
        `🎬 *${escapeMarkdown(film.title)}* ${film.releaseYear ?? ""}\n\n` +
        escapeMarkdown(truncate(film.overview, 600)) +
        "\n\n_Synopsis in Spanish · TMDB_",
    });
  }

  // Tracks are listed with a link rather than played: a 30-second clip with no
  // lyrics to follow is noise in a chat. Listening happens on the platform,
  // and any line from it can come back here via /explain.
  //
  // "Study" sits between those two. It reads the song's lyrics to work out
  // what is in them — how much the learner already knows, which words to
  // learn first, what grammar it runs on — and reports that, without
  // reproducing the lyrics themselves.
  if (tracks.length > 0) {
    await telegram.sendMessage({
      chatId,
      text:
        "🎵 *Tracks*\n\n" +
        tracks
          .map((t) => `• ${escapeMarkdown(t.title)} — ${escapeMarkdown(t.artist)}`)
          .join("\n") +
        "\n\n_Tap a song to see how much of it you can already follow._",
      keyboard: tracks.slice(0, 3).map((t) => [
        { text: `📚 ${t.title.slice(0, 26)}`, callback_data: `song:${t.id}` },
        { text: "🔗 Listen", url: t.externalUrl },
      ]),
    });
  }

  await recordMediaActivity({ userId, kind: "reading", minutes: 3, source: "telegram" });
}

/**
 * Typed entry point: `/song Bad Bunny Tití me preguntó`.
 *
 * This runs a Deezer search before anything else, and that is the whole reason
 * it exists rather than calling the lyrics providers directly. Both providers
 * key on artist and title as *separate* fields, and a typed query arrives as
 * one undifferentiated string with no reliable way to split it. Deezer has
 * already done that split correctly, and supplies the duration LRCLIB matches
 * on, so routing through it turns a guess into a lookup.
 */
async function sendSongSearch(chatId: number, userId: string, query: string): Promise<void> {
  if (!query.trim()) {
    await telegram.sendMessage({
      chatId,
      text:
        "*Study a song*\n\n" +
        "Send `/song <artist> <title>` — for example `/song Bad Bunny Tití me preguntó`.\n\n" +
        "I'll tell you how much of it you can already follow, which words to learn first, " +
        "and what grammar it runs on.",
      keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
    });
    return;
  }

  await telegram.sendMessage({ chatId, text: `Looking for *${escapeMarkdown(query)}*…` });
  const tracks = await findTracks(query);

  if (tracks.length === 0) {
    await telegram.sendMessage({
      chatId,
      text: `Nothing found for *${escapeMarkdown(query)}*. Try adding the artist.`,
    });
    return;
  }

  // A single hit is unambiguous, so skip the pick-one step entirely.
  if (tracks.length === 1) {
    return sendSongStudy(chatId, userId, tracks[0]!.id);
  }

  await telegram.sendMessage({
    chatId,
    text: "Which one?",
    keyboard: tracks.slice(0, 5).map((t) => [
      {
        text: `${t.title.slice(0, 26)} — ${t.artist.slice(0, 18)}`,
        callback_data: `song:${t.id}`,
      },
    ]),
  });
}

/**
 * The study view for one song.
 *
 * Everything here is derived: counts, coverage, a vocabulary list, grammar
 * notes. The lyric lines that produced it were read in `studySong` and
 * dropped there, and no path through this function can print them — which is
 * deliberate, since the providers behind them carry no licence to redistribute
 * the publishers' text. The learner reads the words on Deezer, where they are
 * licensed, and brings any line they cannot crack back via /explain.
 */
async function sendSongStudy(chatId: number, userId: string, trackId: number): Promise<void> {
  await telegram.sendMessage({ chatId, text: "Reading the song…" });

  const study = await studySong(userId, trackId);
  if (!study) {
    await telegram.sendMessage({ chatId, text: "Couldn't find that track." });
    return;
  }

  const { track, analysis, gloss } = study;
  const header = `🎵 *${escapeMarkdown(track.title)}*\n_${escapeMarkdown(track.artist)}_`;

  if (analysis.totalWords === 0) {
    await telegram.sendMessage({
      chatId,
      text: `${header}\n\n${escapeMarkdown(study.message ?? "Nothing to analyse.")}`,
      keyboard: [[{ text: "🔗 Listen", url: track.externalUrl }]],
    });
    return;
  }

  const coverage = Math.round(analysis.coverage * 100);
  const difficulty = { accessible: "easy to follow", moderate: "a stretch", hard: "hard" }[
    analysis.difficulty
  ];

  // Pace is the figure learners find most surprising — a song can be built
  // entirely from words they know and still be unfollowable at speed — so it
  // is stated in words per second rather than hidden inside the grade.
  const pace =
    analysis.pace != null ? `${analysis.pace.toFixed(1)} words/sec — ${difficulty}` : difficulty;

  const lines: string[] = [
    header,
    "",
    `You already know *${coverage}%* of the words here.`,
    `${analysis.distinctWords} distinct words · ${pace}`,
  ];

  if (analysis.repetition >= 0.3) {
    lines.push(
      `_${Math.round(analysis.repetition * 100)}% of the lines repeat — the chorus does your revision for you._`,
    );
  }

  if (analysis.newWords.length > 0) {
    lines.push("", "*Learn these first*");
    for (const item of analysis.newWords.slice(0, 12)) {
      const glossed = gloss?.words.find(
        (w) => w.word.toLowerCase() === item.word.toLowerCase(),
      );
      const meaning = glossed ? ` — ${escapeMarkdown(glossed.meaning)}` : "";
      const register = glossed?.register ? ` _(${escapeMarkdown(glossed.register)})_` : "";
      const repeats = item.occurrences > 1 ? ` ×${item.occurrences}` : "";
      lines.push(`• *${escapeMarkdown(item.word)}*${meaning}${register}${repeats}`);
    }
    if (analysis.newWords.length > 12) {
      lines.push(`_…and ${analysis.newWords.length - 12} more._`);
    }
  }

  // Contractions get their own section rather than joining the vocabulary
  // list, because the instruction attached to them is the opposite one:
  // recognise these by ear, never write them.
  if (analysis.elisions.length > 0) {
    lines.push("", "*Sung, not written*");
    lines.push(
      analysis.elisions
        .slice(0, 8)
        .map((e) => `${escapeMarkdown(e.word)} = ${escapeMarkdown(e.standard)}`)
        .join(" · "),
    );
    lines.push("_Learn to hear these. Don't write them._");
  }

  if (gloss?.grammar.length) {
    lines.push("", "*Grammar in this song*");
    for (const point of gloss.grammar.slice(0, 3)) {
      lines.push(`• *${escapeMarkdown(point.point)}* — ${escapeMarkdown(point.explanation)}`);
    }
  }

  if (gloss?.register) {
    lines.push("", `_${escapeMarkdown(gloss.register)}_`);
  }

  if (study.message) {
    lines.push("", `_${escapeMarkdown(study.message)}_`);
  }

  // Where the words themselves come from depends on the provider that found
  // them. With a licensed one they can be read here; without, the learner
  // reads them where they are licensed and pastes them back — which is not a
  // fallback so much as the normal path, and works on any song ever released.
  if (study.lines?.length) {
    lines.push("", "_Read it line by line below._");
    if (study.attribution) lines.push(`_${escapeMarkdown(study.attribution)}_`);
  } else {
    lines.push(
      "",
      "_Open the words on Deezer and paste them back to me — I'll go through them " +
        "line by line, with the meaning under each one._",
    );
  }

  // The follow-ups are what turn a readout into a lesson: read it, practise
  // the words, keep them so they come back before they are forgotten. Each is
  // offered only when there is something behind it — a button that apologises
  // when pressed is worse than no button.
  const keepable = keepableWords(study);
  const actions: InlineKeyboard = [];
  if (study.lines?.length) {
    actions.push([{ text: "📝 Read it line by line", callback_data: `songread:${track.id}` }]);
  }
  if (keepable > 0) {
    actions.push([
      { text: "✍️ Quiz me on it", callback_data: `songq:${track.id}:0:0` },
      { text: `➕ Keep ${keepable} words`, callback_data: `songadd:${track.id}` },
    ]);
  }

  await telegram.sendMessage({
    chatId,
    text: lines.join("\n"),
    keyboard: [
      ...actions,
      [{ text: "🔗 Listen on Deezer", url: track.externalUrl }],
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

/**
 * One question from the song's quiz.
 *
 * The running score travels in the callback data rather than in a session:
 * five questions is a short enough run that carrying two small integers
 * through the buttons is simpler, and correct, than keeping per-chat state
 * that would have to be expired.
 */
async function sendSongQuestion(
  chatId: number,
  userId: string,
  trackId: number,
  index: number,
  score: number,
): Promise<void> {
  if (index === 0) {
    await telegram.sendMessage({ chatId, text: "Writing you some questions…" });
  }

  const { exercise, total } = await songExerciseAt(userId, trackId, index);

  if (!exercise) {
    if (total === 0) {
      await telegram.sendMessage({
        chatId,
        text: "I couldn't put a quiz together for this one. The word list above still stands.",
        keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
      });
      return;
    }
    return finishSongQuiz(chatId, userId, trackId, score, total);
  }

  await telegram.sendMessage({
    chatId,
    text:
      `*Question ${index + 1} of ${total}*\n\n` +
      escapeMarkdown(exercise.prompt),
    keyboard: exercise.options.map((option, optionIndex) => [
      {
        text: option.slice(0, 60),
        callback_data: `songa:${trackId}:${index}:${optionIndex}:${score}`,
      },
    ]),
  });
}

async function answerSongQuestion(
  chatId: number,
  userId: string,
  trackId: number,
  index: number,
  choice: number,
  score: number,
): Promise<void> {
  const { exercise, total } = await songExerciseAt(userId, trackId, index);
  if (!exercise) return;

  const correct = choice === exercise.correctIndex;
  const next = score + (correct ? 1 : 0);

  await telegram.sendMessage({
    chatId,
    text:
      (correct
        ? "✅ *Correcto*"
        : `❌ Not quite — it's *${escapeMarkdown(exercise.options[exercise.correctIndex] ?? "")}*`) +
      (exercise.explanation ? `\n\n_${escapeMarkdown(exercise.explanation)}_` : ""),
    keyboard: [
      [
        index + 1 < total
          ? { text: "➡️ Next question", callback_data: `songq:${trackId}:${index + 1}:${next}` }
          : { text: "🏁 See how you did", callback_data: `songq:${trackId}:${total}:${next}` },
      ],
    ],
  });
}

async function finishSongQuiz(
  chatId: number,
  userId: string,
  trackId: number,
  score: number,
  total: number,
): Promise<void> {
  await recordSongQuiz(userId, score, total);

  await telegram.sendMessage({
    chatId,
    text:
      `*${score}/${total}*\n\n` +
      (score === total
        ? "Every one. That song is yours — go and listen to it again."
        : score * 2 >= total
          ? "Solid. Keep the words and they will come back before you forget them."
          : "That song is ahead of you for now, which is exactly what the reviews are for."),
    keyboard: [
      [{ text: "➕ Keep the words", callback_data: `songadd:${trackId}` }],
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

/** Move a song's new words into the learner's reviews. */
async function keepSongWords(chatId: number, userId: string, trackId: number): Promise<void> {
  await telegram.sendMessage({ chatId, text: "Building the cards…" });

  const result = await saveSongWords(userId, trackId);

  if (result.message) {
    await telegram.sendMessage({ chatId, text: escapeMarkdown(result.message) });
    return;
  }

  const lines: string[] = [];
  if (result.added.length > 0) {
    lines.push(`➕ *${result.added.length} words added to your reviews*`, "");
    for (const word of result.added) {
      lines.push(`• *${escapeMarkdown(word.spanish)}* — ${escapeMarkdown(word.english)}`);
    }
    lines.push("", "_They are due now, and they will show up in your reminders._");
  }
  if (result.already.length > 0) {
    lines.push(
      "",
      `_Already in your reviews: ${escapeMarkdown(result.already.join(", "))}._`,
    );
  }

  await telegram.sendMessage({
    chatId,
    text: lines.join("\n"),
    keyboard: [
      [{ text: "🔁 Review now", callback_data: "review" }],
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

/**
 * Line by line through a passage the learner pasted.
 *
 * The layout is the point: the line as it stands, what it means underneath,
 * and only the words that would have stopped them. A song read this way is a
 * lesson; the same song reduced to a word list is a glossary, which is what
 * the learner could have got from a dictionary.
 *
 * The words come from the learner — they are reading them on the platform
 * that licensed them and pasting them here — so this works on any song ever
 * released, which is more than any lyrics API can say.
 */
async function sendBreakdown(
  chatId: number,
  userId: string,
  passage: string,
  context?: string,
): Promise<void> {
  if (!passage.trim()) {
    await telegram.sendMessage({
      chatId,
      text:
        "*Read something line by line*\n\n" +
        "Paste the words — a verse, a whole song, a scene of dialogue — and I'll go " +
        "through them a line at a time: what each line means, and the words worth " +
        "stopping on.\n\n" +
        "You can paste straight into the chat, with or without `/lyrics` in front.",
      keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
    });
    return;
  }

  await telegram.sendMessage({ chatId, text: "Reading it line by line…" });
  await renderBreakdownPage(chatId, await startBreakdown(userId, passage, { context }));
}

async function sendBreakdownPage(chatId: number, userId: string): Promise<void> {
  await renderBreakdownPage(chatId, await nextBreakdownPage(userId));
}

/**
 * Read a fetched song line by line.
 *
 * Only reachable when the provider that supplied the lyric carries display
 * rights; the button that leads here is not drawn otherwise. The null branch
 * is still handled, because a cache entry can expire between the message being
 * drawn and the button being pressed and be rebuilt from a different provider.
 */
async function sendSongReading(chatId: number, userId: string, trackId: number): Promise<void> {
  await telegram.sendMessage({ chatId, text: "Reading it line by line…" });

  const page = await startSongBreakdown(userId, trackId);
  if (!page) {
    await telegram.sendMessage({
      chatId,
      text:
        "I can't show the words for this one — the source I have them from is not " +
        "licensed to reproduce them. Open them on Deezer and paste them back to me, " +
        "and I'll take you through line by line.",
      keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
    });
    return;
  }

  await renderBreakdownPage(chatId, page);
}

/** Telegram rejects anything over 4096 characters; leave room for the markup. */
const MESSAGE_BUDGET = 3500;

async function renderBreakdownPage(chatId: number, page: BreakdownPage): Promise<void> {
  if (page.message) {
    await telegram.sendMessage({
      chatId,
      text: escapeMarkdown(page.message),
      keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
    });
    return;
  }

  if (page.lines.length === 0) {
    await telegram.sendMessage({
      chatId,
      text: "That's the whole passage. 🎉",
      keyboard: [
        [{ text: "🔁 Review words", callback_data: "review" }],
        [{ text: "🏠 Menu", callback_data: "menu" }],
      ],
    });
    return;
  }

  const blocks: string[] = [
    `*Lines ${page.from}–${page.to} of ${page.total}*` +
      // The credit rides on every page rather than only the first: a licence
      // that requires attribution requires it wherever the words appear, and
      // in a chat each page is its own screen.
      (page.attribution ? `\n_${escapeMarkdown(page.attribution)}_` : ""),
  ];

  for (const line of page.lines) {
    const block = [`🇪🇸 *${escapeMarkdown(line.original)}*`];
    if (line.translation) block.push(`🇬🇧 ${escapeMarkdown(line.translation)}`);

    for (const word of line.words) {
      const note = word.note ? ` _(${escapeMarkdown(word.note)})_` : "";
      block.push(`  • ${escapeMarkdown(word.surface)} — ${escapeMarkdown(word.meaning)}${note}`);
    }

    // Grammar and dialect are marked differently on purpose: one is a rule to
    // learn and use, the other a sound to recognise and never write. A learner
    // skimming a long passage should be able to tell them apart at a glance.
    //
    // They are also set off from the glosses by a blank line, because the two
    // read at different speeds — a gloss is scanned, an explanation is read —
    // and running them together turns the whole entry into one grey block.
    const notes: string[] = line.grammar.map(
      (point) => `  🧩 *${escapeMarkdown(point.point)}* — ${escapeMarkdown(point.explanation)}`,
    );
    if (line.dialect) notes.push(`  🗣 _${escapeMarkdown(line.dialect)}_`);

    if (notes.length > 0) {
      if (line.words.length > 0) block.push("");
      block.push(...notes);
    }

    blocks.push(block.join("\n"));
  }

  // Packed into as few messages as fit rather than one per line: a chat that
  // arrives as twenty notifications is unreadable on a phone.
  const messages: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length + 2 > MESSAGE_BUDGET) {
      messages.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) messages.push(current);

  for (const [index, text] of messages.entries()) {
    const last = index === messages.length - 1;
    await telegram.sendMessage({
      chatId,
      text,
      // The keyboard rides on the final message so the button sits at the
      // bottom of the passage, where the reader has just arrived.
      keyboard: last
        ? page.done
          ? [
              [{ text: "🔁 Review words", callback_data: "review" }],
              [{ text: "🏠 Menu", callback_data: "menu" }],
            ]
          : [[{ text: `➡️ Next lines (${page.total - page.to} to go)`, callback_data: "brk" }]]
        : undefined,
    });
  }
}

async function sendWatchList(chatId: number, userId: string): Promise<void> {
  const result = await browseFilms(userId, { animationOnly: true });

  if (result.items.length === 0) {
    const suggestions = result.suggestions.slice(0, 6);
    await telegram.sendMessage({
      chatId,
      text:
        "*Watch in Spanish*\n\n" +
        (result.error ? `_${escapeMarkdown(result.error)}_\n\n` : "") +
        suggestions
          .map((s) => `🎬 *${escapeMarkdown(s.title)}* (${s.level}, ${escapeMarkdown(s.country)})\n   _${escapeMarkdown(s.why)}_`)
          .join("\n\n"),
      keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
    });
    return;
  }

  await telegram.sendMessage({
    chatId,
    text:
      "*Cartoons in Spanish*\n\n" +
      "Animation is the easiest way in: dubbed dialogue is recorded clean and paced for children.\n\n" +
      result.items
        .slice(0, 5)
        .map((f) => `🎬 *${escapeMarkdown(f.title)}* ${f.releaseYear ?? ""}\n_${escapeMarkdown(truncate(f.overview, 220))}_`)
        .join("\n\n"),
    keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

async function sendPodcasts(chatId: number, userId: string): Promise<void> {
  const result = await browsePodcasts(userId);

  const shows = result.shows
    .map((s) => `• *${escapeMarkdown(s.publisher)}* (${s.level}) — ${escapeMarkdown(s.description)}`)
    .join("\n");

  await telegram.sendMessage({
    chatId,
    text: `*Spanish podcasts*\n\n${shows}\n\n_Long-form listening is what turns "understands exercises" into "understands people"._`,
  });

  for (const episode of result.items.slice(0, 3)) {
    if (!episode.audioUrl) continue;
    await telegram.sendAudio({
      chatId,
      audioUrl: episode.audioUrl,
      title: truncate(episode.title, 60),
      performer: episode.publisher,
      caption:
        `🎧 *${escapeMarkdown(truncate(episode.title, 90))}*\n` +
        `_${escapeMarkdown(episode.publisher)}${episode.durationSeconds ? ` · ${Math.round(episode.durationSeconds / 60)} min` : ""}_`,
      keyboard: [[{ text: "🔗 Episode page", url: episode.pageUrl }]],
    });
  }

  if (result.items.length > 0) {
    await recordMediaActivity({ userId, kind: "listening", minutes: 5, source: "telegram" });
  }
}

/** The fuller article text, when the learner asks for more. */
async function sendArticle(chatId: number, userId: string, title: string): Promise<void> {
  const article = await openArticle(userId, title);
  if (!article) {
    await telegram.sendMessage({ chatId, text: "Could not load that article." });
    return;
  }

  await telegram.sendMessage({
    chatId,
    text:
      `📖 *${escapeMarkdown(article.title)}*\n\n` +
      escapeMarkdown(truncate(article.extract, 3200)) +
      "\n\n_Wikipedia, CC BY-SA 4.0_",
    keyboard: [[{ text: "🔗 Full article", url: article.url }]],
  });

  await recordMediaActivity({ userId, kind: "reading", minutes: 5, source: "telegram" });
}

/**
 * Send pronunciation audio for a word or sentence.
 *
 * A real native recording is used where one exists and synthesis fills the
 * gaps; the learner is told which they got, because "a speaker from Sinaloa
 * said this" is more useful information than a generic clip.
 */
async function sendPronunciation(
  chatId: number,
  text: string,
  options: { slow?: boolean; dialect?: "es-ES" | "es-419" } = {},
): Promise<void> {
  const clean = text.trim();

  if (!clean) {
    await telegram.sendMessage({
      chatId,
      text:
        "Send `/say <word or sentence>` and I will pronounce it.\n\n" +
        "For example: `/say perro` or `/say ¿Dónde está el baño?`",
    });
    return;
  }

  const audio = await getSpeech(clean, { slow: options.slow, dialect: options.dialect });

  if (!audio) {
    await telegram.sendMessage({
      chatId,
      text: synthesisAvailable()
        ? `Could not produce audio for "${escapeMarkdown(clean)}".`
        : "Pronunciation needs an AI provider for anything but single common words. Add GEMINI_API_KEY.",
    });
    return;
  }

  const caption =
    `🔊 *${escapeMarkdown(truncate(clean, 200))}*` +
    (audio.credit ? `\n_${escapeMarkdown(audio.credit)}_` : "") +
    (audio.origin === "synthesis" ? "\n_Synthesised_" : "");

  // Only synthesis can be slowed down; a recording is fixed.
  const keyboard: InlineKeyboard = options.slow
    ? []
    : [[{ text: "🐢 Slower", callback_data: `say:${clean.slice(0, 55)}` }]];

  await telegram.sendVoiceNote({
    chatId,
    audio: audio.data,
    format: audio.format,
    caption,
    filename: `pronunciation.${audio.format}`,
    keyboard: keyboard.length > 0 ? keyboard : undefined,
  });
}

/**
 * Break down one line of Spanish the learner pastes.
 *
 * The learner reads lyrics, subtitles or anything else wherever it is licensed,
 * and brings a line here. Analysing supplied text needs no content licence,
 * which is why this works where hosting the text never could — and the
 * breakdown is the part with the teaching value anyway.
 */
async function sendExplanation(chatId: number, userId: string, line: string): Promise<void> {
  const clean = line.trim();

  if (!clean) {
    await telegram.sendMessage({
      chatId,
      text:
        "*Break down a line*\n\n" +
        "Send `/explain <line>` with any Spanish you have run into — a lyric, a subtitle, " +
        "a sign, a message.\n\n" +
        "You get the translation, every word explained, the grammar, and what the " +
        "dropped letters actually are.\n\n" +
        "Try: `/explain Se me olvidó que to' pasa por algo`",
    });
    return;
  }

  if (clean.length > 400) {
    await telegram.sendMessage({
      chatId,
      text: "One line at a time — send up to about 400 characters and I will go through it properly.",
    });
    return;
  }

  await telegram.sendMessage({ chatId, text: "🔍 Working through it…" });

  const { explanation, message } = await explainSpanishLine(userId, clean);
  if (!explanation) {
    await telegram.sendMessage({ chatId, text: escapeMarkdown(message ?? "Could not analyse that.") });
    return;
  }

  const lines = [
    `🇪🇸 *${escapeMarkdown(explanation.original)}*`,
    `🇬🇧 ${escapeMarkdown(explanation.translation)}`,
  ];

  if (explanation.literal) {
    lines.push("", `_Literally: ${escapeMarkdown(explanation.literal)}_`);
  }

  if (explanation.words.length > 0) {
    lines.push("", "*Word by word*");
    for (const word of explanation.words.slice(0, 18)) {
      // The standard spelling matters most: it is what turns an unrecognisable
      // written form back into a word the learner already knows.
      const standard = word.standardForm ? ` _(= ${escapeMarkdown(word.standardForm)})_` : "";
      const note = word.note ? ` — ${escapeMarkdown(word.note)}` : "";
      lines.push(`• *${escapeMarkdown(word.surface)}*${standard} — ${escapeMarkdown(word.meaning)}${note}`);
    }
  }

  if (explanation.grammar.length > 0) {
    lines.push("", "*Grammar*");
    for (const point of explanation.grammar.slice(0, 4)) {
      lines.push(`▸ *${escapeMarkdown(point.point)}* — ${escapeMarkdown(point.explanation)}`);
    }
  }

  if (explanation.dialect) {
    lines.push("", `*Dialect* — ${escapeMarkdown(explanation.dialect)}`);
  }

  if (explanation.estimatedLevel) {
    lines.push("", `_This line is around ${explanation.estimatedLevel}._`);
  }

  await telegram.sendMessage({
    chatId,
    text: lines.join("\n"),
    keyboard: [[{ text: "🔊 Hear the line", callback_data: `say:${clean.slice(0, 55)}` }]],
  });
}

/**
 * One word, shown as it is actually used.
 *
 * The curated example is pitched at the learner's level and shows meaning; the
 * sourced ones show behaviour — which register the word belongs to, what it
 * collocates with, and often that it has senses the dictionary entry omitted.
 */
async function sendWordUsage(chatId: number, userId: string, query: string): Promise<void> {
  const bare = query.trim().toLowerCase();

  const word = await prisma.vocabularyWord.findFirst({
    where: {
      OR: [
        { spanish: { equals: bare, mode: "insensitive" } },
        { spanish: { equals: `el ${bare}`, mode: "insensitive" } },
        { spanish: { equals: `la ${bare}`, mode: "insensitive" } },
        { english: { equals: bare, mode: "insensitive" } },
      ],
    },
  });

  if (!word) {
    await telegram.sendMessage({
      chatId,
      text:
        `I do not have *${escapeMarkdown(query)}* in the vocabulary yet.\n\n` +
        "Send `/explain " + escapeMarkdown(query) + "` and I will break it down anyway.",
    });
    return;
  }

  await telegram.sendMessage({ chatId, text: "🔍 Looking for it in real Spanish…" });
  const usage = await realUsageForWord(userId, word.id);

  const lines = [
    `*${escapeMarkdown(word.spanish)}* — ${escapeMarkdown(word.english)}`,
    `_${escapeMarkdown(word.pronunciation)}_${word.gender ? ` · ${word.gender === "m" ? "masculine" : "feminine"}` : ""} · ${word.levelCode}`,
    "",
    `🇪🇸 ${escapeMarkdown(usage.authored.sentence)}`,
    `🇬🇧 _${escapeMarkdown(usage.authored.translation)}_`,
  ];

  const labels: Record<string, string> = {
    everyday: "Everyday",
    news: "In the news",
    encyclopedic: "Formal / written",
  };

  if (usage.examples.length > 0) {
    lines.push("", "───", "*In real Spanish*");
    for (const example of usage.examples.slice(0, 5)) {
      lines.push("", `_${labels[example.register] ?? example.register}_`);
      lines.push(escapeMarkdown(truncate(example.sentence, 200)));
      if (example.translation) lines.push(`_${escapeMarkdown(example.translation)}_`);
      lines.push(`— ${escapeMarkdown(example.source)}`);
    }
  } else {
    lines.push("", "_No real-world examples found for this one right now._");
  }

  await telegram.sendMessage({
    chatId,
    text: lines.join("\n"),
    keyboard: [
      [
        { text: "🔊 Hear it", callback_data: `hear:${word.id}` },
        { text: "💡 Memory hook", callback_data: `hook:${word.id}` },
      ],
      [{ text: "➕ Add to my reviews", callback_data: `learn:${word.id}` }],
    ],
  });
}

/** Put a word into the learner's spaced-repetition queue, due now. */
async function startLearningWord(chatId: number, userId: string, wordId: string): Promise<void> {
  const word = await prisma.vocabularyWord.findUnique({ where: { id: wordId } });
  if (!word) return;

  const existing = await prisma.vocabularyProgress.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  if (existing) {
    await telegram.sendMessage({
      chatId,
      text: `*${escapeMarkdown(word.spanish)}* is already in your reviews — next due ${existing.dueAt < new Date() ? "now" : "later"}.`,
    });
    return;
  }

  // Deliberately outside the daily new-word budget: the learner asked for this
  // specific word, which is a different act from being handed today's ten.
  await prisma.vocabularyProgress.create({
    data: { userId, wordId, dueAt: new Date(), status: "learning" },
  });

  await telegram.sendMessage({
    chatId,
    text: `➕ *${escapeMarkdown(word.spanish)}* added. It will come back in your reviews, and in your reminders.`,
    keyboard: [[{ text: "🔁 Review now", callback_data: "review" }]],
  });
}

async function sendVocabulary(chatId: number, userId: string): Promise<void> {
  const [total, learning, mastered, due] = await Promise.all([
    prisma.vocabularyProgress.count({ where: { userId } }),
    prisma.vocabularyProgress.count({ where: { userId, status: "learning" } }),
    prisma.vocabularyProgress.count({ where: { userId, status: "mastered" } }),
    prisma.vocabularyProgress.count({ where: { userId, dueAt: { lte: new Date() } } }),
  ]);

  const recent = await prisma.vocabularyProgress.findMany({
    where: { userId },
    orderBy: { lastReviewedAt: "desc" },
    take: 8,
    include: { word: true },
  });

  await telegram.sendMessage({
    chatId,
    text:
      "*Your vocabulary*\n\n" +
      `📚 ${total} words started\n` +
      `📖 ${learning} still learning\n` +
      `🏆 ${mastered} mastered\n` +
      `🔔 ${due} due now\n\n` +
      (recent.length > 0
        ? "*Recently studied*\n" +
          recent.map((r) => `• ${escapeMarkdown(r.word.spanish)} — ${escapeMarkdown(r.word.english)}`).join("\n")
        : "Start a review to build your list."),
    keyboard: [[{ text: `🔁 Review ${due} due`, callback_data: "review" }], [{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

/** Send one grammar practice question with its options as buttons. */
async function sendPractice(chatId: number, userId: string): Promise<void> {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const level = parseLevel(progress?.currentLevelCode);

  const exercise = await prisma.exercise.findFirst({
    where: {
      section: { in: ["practice", "test"] },
      lesson: { module: { course: { level: { code: level } } } },
      questions: { some: { kind: "multiple_choice" } },
    },
    include: { questions: { include: { options: { orderBy: { orderIndex: "asc" } } } } },
    orderBy: { orderIndex: "asc" },
  });

  const question = exercise?.questions.find((q) => q.options.length > 1);

  if (!exercise || !question) {
    await telegram.sendMessage({
      chatId,
      text: "No practice questions available at your level yet. Try /lesson.",
      keyboard: mainMenu(),
    });
    return;
  }

  await telegram.sendMessage({
    chatId,
    text: `*Practice*\n\n${escapeMarkdown(question.prompt)}${question.context ? `\n\n_${escapeMarkdown(question.context)}_` : ""}`,
    keyboard: [
      ...question.options.map((option) => [
        { text: option.text.slice(0, 60), callback_data: `ans:${question.id}:${option.id}` },
      ]),
      ...(exercise.grammarTopicId
        ? [[{ text: "💡 Memory hook", callback_data: `ghook:${exercise.grammarTopicId}` }]]
        : []),
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

/** Curated acronyms and decision tests for a grammar structure. */
async function sendGrammarHook(chatId: number, userId: string, topicId: string): Promise<void> {
  const [topic, result] = await Promise.all([
    prisma.grammarTopic.findUnique({ where: { id: topicId } }),
    getGrammarMnemonics(userId, topicId),
  ]);
  if (!topic) return;

  if (result.mnemonics.length === 0) {
    await telegram.sendMessage({
      chatId,
      text: `No hook yet for *${escapeMarkdown(topic.title)}*.`,
    });
    return;
  }

  const lines = [`💡 *${escapeMarkdown(topic.title)}*`, ""];
  for (const mnemonic of result.mnemonics.slice(0, 3)) {
    lines.push(escapeMarkdown(mnemonic.hook));
    if (mnemonic.explanation) lines.push(`_${escapeMarkdown(mnemonic.explanation)}_`);
    lines.push("");
  }

  const top = result.mnemonics[0]!;
  await telegram.sendMessage({
    chatId,
    text: lines.join("\n"),
    keyboard: [
      [
        { text: "👍 Helped", callback_data: `rate:${top.id}:1` },
        { text: "👎 Didn't", callback_data: `rate:${top.id}:0` },
      ],
      [{ text: "➡️ Back to practice", callback_data: "practice" }],
    ],
  });
}

function sendScenarioPicker(chatId: number): Promise<void> {
  return telegram
    .sendMessage({
      chatId,
      text: "*Talk with your tutor*\n\nPick a situation. I'll stay in character and correct you afterwards, not mid-sentence.",
      keyboard: [
        [
          { text: "☕ Casual", callback_data: "conv:casual" },
          { text: "🍽 Restaurant", callback_data: "conv:restaurant" },
        ],
        [
          { text: "✈️ Travel", callback_data: "conv:travel" },
          { text: "🛍 Shopping", callback_data: "conv:shopping" },
        ],
        [
          { text: "💼 Job interview", callback_data: "conv:job_interview" },
          { text: "🗣 Debate", callback_data: "conv:debate" },
        ],
        [{ text: "🎲 Free conversation", callback_data: "conv:free" }],
      ],
    })
    .then(() => undefined);
}

async function sendProgress(chatId: number, userId: string): Promise<void> {
  const [dashboard, home] = await Promise.all([getDashboard(userId), getHome(userId)]);

  const skills = [
    ["Vocabulary", dashboard.skills.vocabulary],
    ["Grammar", dashboard.skills.grammar],
    ["Listening", dashboard.skills.listening],
    ["Reading", dashboard.skills.reading],
    ["Speaking", dashboard.skills.speaking],
    ["Writing", dashboard.skills.writing],
  ] as const;

  await telegram.sendMessage({
    chatId,
    text:
      "*Your Spanish*\n\n" +
      `Level: *${dashboard.level}*\n` +
      `Course progress\n${progressBar(dashboard.courseProgress)}\n\n` +
      skills.map(([label, value]) => `${label}\n${progressBar(value)}`).join("\n") +
      `\n\n🔥 ${dashboard.currentStreak}-day streak · ⭐ ${dashboard.xp} XP\n` +
      `📚 ${dashboard.wordsLearned} words · ✅ ${dashboard.lessonsCompleted} lessons\n\n` +
      (home.weakAreas.length > 0
        ? `*Focus on:* ${home.weakAreas.map((w) => escapeMarkdown(w.label)).join(", ")}`
        : "Nicely balanced across the board."),
    keyboard: [[{ text: "📅 Today's session", callback_data: "daily" }], [{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

async function sendStats(chatId: number, userId: string): Promise<void> {
  const dashboard = await getDashboard(userId);
  const hours = Math.floor(dashboard.totalStudyMinutes / 60);
  const minutes = dashboard.totalStudyMinutes % 60;

  await telegram.sendMessage({
    chatId,
    text:
      "*Statistics*\n\n" +
      `Overall proficiency: ${Math.round(overallScore(dashboard.skills))}%\n` +
      `Time studied: ${hours}h ${minutes}m\n` +
      `Today: ${dashboard.minutesToday}/${dashboard.dailyTimeBudget} min\n\n` +
      `Current streak: ${dashboard.currentStreak} days\n` +
      `Longest streak: ${dashboard.longestStreak} days\n\n` +
      `XP: ${dashboard.xp} (level ${dashboard.playerLevel})\n` +
      `Next level in ${dashboard.xpForNextLevel} XP\n\n` +
      `Words: ${dashboard.wordsLearned} learned, ${dashboard.wordsMastered} mastered\n` +
      `Grammar topics mastered: ${dashboard.grammarMastered}\n` +
      `Due for review: ${dashboard.wordsDue}`,
    keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

/**
 * /remind — reminder times, in the learner's own words and timezone.
 *
 * Three a day by default, each with a different job: the morning one hands
 * over the plan, the midday one *is* a review card, the evening one only
 * pushes if the day is still empty. Arguments set custom hours directly
 * (`/remind 8 13 21`); with none, the buttons cover the common shapes.
 */
async function sendReminderSettings(chatId: number, userId: string, args = ""): Promise<void> {
  const requested = parseHourArgs(args);

  const settings = requested
    ? await updateReminderSettings(userId, { enabled: true, hours: requested })
    : await getReminderSettings(userId);

  const lines = requested ? ["✅ *Reminders updated*", ""] : ["🔔 *Study reminders*", ""];

  if (settings.enabled) {
    lines.push(`On — ${settings.description} (${settings.timezone})`, "");
    lines.push("What each one does:");
    lines.push("• *Morning* — today's plan, one tap to start");
    lines.push("• *Midday* — a single word to recall, right in the chat");
    lines.push("• *Evening* — only if the day is still empty, so your streak survives");
  } else {
    lines.push("Currently *off*. Nothing will be sent.");
  }

  lines.push("", "Set your own with `/remind 8 13 21`.");

  const keyboard: InlineKeyboard = [
    [
      { text: "🌅 7 · 12 · 19", callback_data: "remset:early" },
      { text: "☀️ 9 · 13 · 20", callback_data: "remset:standard" },
    ],
    [
      { text: "🌆 10 · 15 · 22", callback_data: "remset:late" },
      { text: "🌙 12 · 18 · 23", callback_data: "remset:owl" },
    ],
    settings.enabled
      ? [
          { text: "📨 Send one now", callback_data: "remtest" },
          { text: "🔕 Turn off", callback_data: "remoff" },
        ]
      : [{ text: "🔔 Turn on", callback_data: "remon" }],
    [{ text: "🏠 Menu", callback_data: "menu" }],
  ];

  await telegram.sendMessage({ chatId, text: lines.join("\n"), keyboard });
}

const REMINDER_PRESETS: Record<string, number[]> = {
  early: [7, 12, 19],
  standard: [9, 13, 20],
  late: [10, 15, 22],
  owl: [12, 18, 23],
};

async function applyReminderPreset(chatId: number, userId: string, preset: string): Promise<void> {
  const hours = REMINDER_PRESETS[preset];
  if (!hours) return;

  const settings = await updateReminderSettings(userId, { enabled: true, hours });
  await telegram.sendMessage({
    chatId,
    text: `✅ Reminders set to *${settings.description}* (${settings.timezone}).`,
    keyboard: [
      [{ text: "📨 Send one now", callback_data: "remtest" }],
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

async function toggleReminders(chatId: number, userId: string, enabled: boolean): Promise<void> {
  const settings = await updateReminderSettings(userId, { enabled });
  await telegram.sendMessage({
    chatId,
    text: enabled
      ? `🔔 Reminders on — ${escapeMarkdown(settings.description)}.`
      : "🔕 Reminders off. Turn them back on any time with /remind.",
    keyboard: [[{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

/** Deliver the next reminder immediately, so it can be seen before trusting it. */
async function sendReminderPreview(chatId: number, userId: string): Promise<void> {
  const sent = await sendTestReminder(userId, "kickoff");
  if (!sent) {
    await telegram.sendMessage({
      chatId,
      text: "Could not send a sample reminder just now — try again in a moment.",
    });
  }
}

/** "8 13 21" or "8,13,21" → [8, 13, 21]; anything else → null. */
function parseHourArgs(args: string): number[] | null {
  const trimmed = args.trim();
  if (!trimmed) return null;
  if (!/^[\d\s,:]+$/.test(trimmed)) return null;

  // "9:00" is a natural thing to type; only the hour is significant.
  const hours = trimmed
    .split(/[\s,]+/)
    .map((part) => Number.parseInt(part.split(":")[0] ?? "", 10))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);

  return hours.length > 0 ? parseReminderHours(hours.join(",")) : null;
}

async function handleCallback(query: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
  const chatId = query.message?.chat.id;
  if (!chatId || !query.data) return;

  const user = await resolveUser(query.from, chatId);
  const [action, ...args] = query.data.split(":");

  await telegram.answerCallback(query.id);

  switch (action) {
    case "menu":
      return sendWelcome(chatId, user.displayName);
    case "daily":
      return sendDaily(chatId, user.id);
    case "lesson":
      return sendLesson(chatId, user.id);
    case "review":
      return sendReviewCard(chatId, user.id);
    case "practice":
      return sendPractice(chatId, user.id);
    case "speak":
      return sendScenarioPicker(chatId);
    case "media":
      return sendMedia(chatId, user.id, "");
    case "songhelp":
      return sendSongSearch(chatId, user.id, "");
    case "progress":
      return sendProgress(chatId, user.id);
    case "noop":
      return;

    case "show":
      return revealAnswer(chatId, args[0]!);

    case "grade":
      return gradeWord(chatId, user.id, args[0]!, args[1] as "again" | "hard" | "good" | "easy");

    case "sec":
      return advanceSection(chatId, user.id, args[0]!, args[1] as LessonSection);

    case "ans":
      return answerQuestion(chatId, user.id, args[0]!, args[1]!);

    case "conv":
      return beginConversation(chatId, user.id, args[0] as TutorScenario);

    case "endconv":
      return endConversation(chatId, args[0]!);

    case "tr":
      return translateLast(chatId, args[0]!);

    case "item":
      return startDailyItem(chatId, user.id, args[0]!);

    case "hook":
      return sendWordHook(chatId, user.id, args[0]!);

    case "learn":
      return startLearningWord(chatId, user.id, args[0]!);

    case "hear": {
      const word = await prisma.vocabularyWord.findUnique({ where: { id: args[0]! } });
      if (!word) return;
      return sendPronunciation(chatId, word.spanish.replace(/^(el|la|los|las)\s+/, ""), {
        dialect: user.dialectPreference as "es-ES" | "es-419",
      });
    }

    case "ghook":
      return sendGrammarHook(chatId, user.id, args[0]!);

    case "mkhook":
      return makeWordHook(chatId, user.id, args[0]!);

    case "rate":
      return rateHook(chatId, user.id, args[0]!, args[1] === "1");

    case "song":
      return sendSongStudy(chatId, user.id, Number(args[0]));

    case "songq":
      return sendSongQuestion(chatId, user.id, Number(args[0]), Number(args[1]), Number(args[2]));

    case "songa":
      return answerSongQuestion(
        chatId,
        user.id,
        Number(args[0]),
        Number(args[1]),
        Number(args[2]),
        Number(args[3]),
      );

    case "songadd":
      return keepSongWords(chatId, user.id, Number(args[0]));

    case "brk":
      return sendBreakdownPage(chatId, user.id);

    case "songread":
      return sendSongReading(chatId, user.id, Number(args[0]));

    case "watch":
      return sendWatchList(chatId, user.id);

    case "podcast":
      return sendPodcasts(chatId, user.id);

    case "say":
      // Rejoined because the text may itself contain ":".
      return sendPronunciation(chatId, args.join(":"), {
        slow: true,
        dialect: user.dialectPreference as "es-ES" | "es-419",
      });

    case "art":
      // Titles can contain ":", which is also the callback separator.
      return sendArticle(chatId, user.id, args.join(":"));

    case "rem":
      return sendReminderSettings(chatId, user.id);

    case "remset":
      return applyReminderPreset(chatId, user.id, args[0]!);

    case "remoff":
      return toggleReminders(chatId, user.id, false);

    case "remon":
      return toggleReminders(chatId, user.id, true);

    case "remtest":
      return sendReminderPreview(chatId, user.id);

    default:
      return;
  }
}

async function revealAnswer(chatId: number, wordId: string): Promise<void> {
  const word = await prisma.vocabularyWord.findUnique({ where: { id: wordId } });
  if (!word) return;

  await telegram.sendMessage({
    chatId,
    text:
      `*${escapeMarkdown(word.spanish)}* — ${escapeMarkdown(word.english)}\n\n` +
      `🇪🇸 ${escapeMarkdown(word.exampleSentence)}\n🇬🇧 _${escapeMarkdown(word.exampleTranslation)}_\n\n` +
      "How well did you know it?",
    keyboard: [
      [
        { text: "❌ Again", callback_data: `grade:${wordId}:again` },
        { text: "😕 Hard", callback_data: `grade:${wordId}:hard` },
      ],
      [
        { text: "🙂 Good", callback_data: `grade:${wordId}:good` },
        { text: "😎 Easy", callback_data: `grade:${wordId}:easy` },
      ],
      // Offered only here, on the revealed card — never on the prompt, where
      // it would replace the recall attempt that does the actual work.
      [
        { text: "💡 Memory hook", callback_data: `hook:${wordId}` },
        { text: "🔊 Hear it", callback_data: `hear:${wordId}` },
      ],
    ],
  });
}

/** Show the memory hooks for a word, with the option to generate a personal one. */
async function sendWordHook(chatId: number, userId: string, wordId: string): Promise<void> {
  const [word, result] = await Promise.all([
    prisma.vocabularyWord.findUnique({ where: { id: wordId } }),
    getWordMnemonics(userId, wordId),
  ]);
  if (!word) return;

  if (result.mnemonics.length === 0) {
    await telegram.sendMessage({
      chatId,
      text: `No hook yet for *${escapeMarkdown(word.spanish)}*.`,
      keyboard: result.canGenerate
        ? [[{ text: "✨ Make me one", callback_data: `mkhook:${wordId}` }]]
        : undefined,
    });
    return;
  }

  const lines = [`💡 *${escapeMarkdown(word.spanish)}* — ${escapeMarkdown(word.english)}`, ""];

  // A hook the learner no longer needs is said so, rather than silently hidden.
  if (!result.offer.show) lines.push(`_${escapeMarkdown(result.offer.reason)}_`, "");

  for (const mnemonic of result.mnemonics.slice(0, 2)) {
    if (mnemonic.keyword) lines.push(`Sounds like: *${escapeMarkdown(mnemonic.keyword)}*`);
    lines.push(escapeMarkdown(mnemonic.hook));
    if (mnemonic.imagery) lines.push(`_${escapeMarkdown(mnemonic.imagery)}_`);
    if (mnemonic.explanation) lines.push(escapeMarkdown(mnemonic.explanation));
    lines.push("");
  }

  lines.push(`_${escapeMarkdown(result.mnemonics[0]!.coaching)}_`);

  const top = result.mnemonics[0]!;
  const keyboard: InlineKeyboard = [
    [
      { text: "👍 Helped", callback_data: `rate:${top.id}:1` },
      { text: "👎 Didn't", callback_data: `rate:${top.id}:0` },
    ],
  ];
  if (result.canGenerate) {
    keyboard.push([{ text: "✨ Make me another", callback_data: `mkhook:${wordId}` }]);
  }

  await telegram.sendMessage({ chatId, text: lines.join("\n"), keyboard });
}

async function gradeWord(
  chatId: number,
  userId: string,
  wordId: string,
  grade: "again" | "hard" | "good" | "easy",
): Promise<void> {
  const result = await reviewVocabulary({ userId, wordId, grade, source: "telegram" });

  const days = result.intervalDays;
  const when = days < 1 ? "later today" : days < 2 ? "tomorrow" : `in ${Math.round(days)} days`;

  await telegram.sendMessage({
    chatId,
    text: `${result.correct ? "✅" : "🔁"} *${escapeMarkdown(result.word.spanish)}* — next review ${when}.`,
  });

  // Straight into the next card: the flow should never require another tap.
  await sendReviewCard(chatId, userId);
}

async function advanceSection(
  chatId: number,
  userId: string,
  slug: string,
  section: LessonSection,
): Promise<void> {
  const lesson = await prisma.lesson.findUnique({ where: { slug } });
  if (!lesson) return;

  const result = await completeLessonSection({
    userId,
    lessonId: lesson.id,
    section,
    minutes: 2,
    source: "telegram",
  });

  if (result.completed) {
    // The lesson-complete report (§18).
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    const next = await getNextLesson(userId);

    let text =
      "*Lesson completed* ✅\n\n" +
      `Topic:\n${escapeMarkdown(lesson.title)}\n\n` +
      `Score:\n${Math.round(progress?.score ?? 0)}%\n\n` +
      `XP earned: +${result.activity.xpEarned}\n` +
      `🔥 ${result.activity.streak}-day streak`;

    if (result.activity.unlockedAchievements.length > 0) {
      text += "\n\n🏅 *Unlocked:* " +
        result.activity.unlockedAchievements.map((a) => escapeMarkdown(a.title)).join(", ");
    }
    if (next) {
      text += `\n\nNext recommended lesson:\n${escapeMarkdown(next.title)}`;
    }

    await telegram.sendMessage({
      chatId,
      text,
      keyboard: next
        ? [[{ text: "▶️ Continue", callback_data: "lesson" }], [{ text: "🏠 Menu", callback_data: "menu" }]]
        : [[{ text: "🏠 Menu", callback_data: "menu" }]],
    });
    return;
  }

  await sendLessonSection(chatId, userId, slug);
}

async function answerQuestion(
  chatId: number,
  userId: string,
  questionId: string,
  optionId: string,
): Promise<void> {
  const [question, option] = await Promise.all([
    prisma.question.findUnique({ where: { id: questionId } }),
    prisma.answerOption.findUnique({ where: { id: optionId } }),
  ]);
  if (!question || !option) return;

  // Graded through the same service the web app uses, so the attempt, the XP
  // and the grammar mastery update are all identical.
  const result = await submitExercise({
    userId,
    exerciseId: question.exerciseId,
    answers: [{ questionId, answer: option.text }],
    source: "telegram",
  });

  const feedback = result.feedback[0];

  await telegram.sendMessage({
    chatId,
    text:
      `${feedback?.correct ? "✅ Correct!" : `❌ Not quite — the answer is *${escapeMarkdown(feedback?.correctAnswer ?? "")}*`}\n\n` +
      `_${escapeMarkdown(feedback?.optionFeedback || feedback?.explanation || "")}_\n\n` +
      `+${result.xp} XP`,
    keyboard: [
      [{ text: "➡️ Another question", callback_data: "practice" }],
      [{ text: "🏠 Menu", callback_data: "menu" }],
    ],
  });
}

async function beginConversation(chatId: number, userId: string, scenario: TutorScenario): Promise<void> {
  // Only one conversation is live in a chat at a time — otherwise a free-text
  // message is ambiguous about which one it belongs to.
  await prisma.conversation.updateMany({
    where: { userId, origin: "telegram", isActive: true },
    data: { isActive: false },
  });

  const conversation = await startConversation({ userId, scenario, origin: "telegram" });
  const opening = conversation.messages[0];

  await telegram.sendMessage({
    chatId,
    text:
      `*${escapeMarkdown(conversation.title)}*\n` +
      (conversation.goal ? `_Goal: ${escapeMarkdown(conversation.goal)}_\n` : "") +
      "\nJust reply in Spanish — I'll correct you after each message.\n\n" +
      (conversation.usefulPhrases.length > 0
        ? `*Useful phrases*\n${conversation.usefulPhrases.map((p) => `• ${escapeMarkdown(p)}`).join("\n")}\n\n`
        : "") +
      `───\n\n${escapeMarkdown(opening?.content ?? "¡Hola!")}`,
    keyboard: [[{ text: "⏹ End conversation", callback_data: `endconv:${conversation.conversationId}` }]],
  });
}

async function endConversation(chatId: number, conversationId: string): Promise<void> {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { isActive: false },
    include: { messages: { include: { corrections: true } } },
  });

  const corrections = conversation.messages.flatMap((m) => m.corrections);
  const turns = conversation.messages.filter((m) => m.role === "user").length;

  await telegram.sendMessage({
    chatId,
    text:
      "*Conversation finished*\n\n" +
      `You wrote ${turns} message${turns === 1 ? "" : "s"}.\n` +
      (corrections.length > 0
        ? `\n*Things to work on*\n${corrections
            .slice(0, 5)
            .map((c) => `❌ ${escapeMarkdown(c.original)}\n✅ ${escapeMarkdown(c.corrected)}`)
            .join("\n\n")}`
        : "\nNo important mistakes — nicely done."),
    keyboard: [[{ text: "💬 Another conversation", callback_data: "speak" }], [{ text: "🏠 Menu", callback_data: "menu" }]],
  });
}

async function translateLast(chatId: number, conversationId: string): Promise<void> {
  const last = await prisma.conversationMessage.findFirst({
    where: { conversationId, role: "tutor" },
    orderBy: { createdAt: "desc" },
  });

  await telegram.sendMessage({
    chatId,
    text: last?.translation
      ? `🇬🇧 _${escapeMarkdown(last.translation)}_`
      : "No translation available for that message.",
  });
}

async function startDailyItem(chatId: number, userId: string, itemId: string): Promise<void> {
  const item = await prisma.dailySessionItem.findFirst({
    where: { id: itemId, session: { userId } },
  });
  if (!item) return;

  switch (item.kind) {
    case "review":
    case "vocabulary":
      return sendReviewCard(chatId, userId);
    case "lesson":
      return sendLesson(chatId, userId);
    case "grammar":
    case "exercise":
      return sendPractice(chatId, userId);
    case "conversation":
    case "speaking":
      return sendScenarioPicker(chatId);
    default:
      return sendDaily(chatId, userId);
  }
}

/** Generate a personal hook, then show it. */
async function makeWordHook(chatId: number, userId: string, wordId: string): Promise<void> {
  await telegram.sendMessage({ chatId, text: "✨ Thinking of a hook…" });

  const result = await createWordMnemonic(userId, wordId);
  if (!result.created) {
    await telegram.sendMessage({ chatId, text: escapeMarkdown(result.message ?? "No luck.") });
    return;
  }

  await sendWordHook(chatId, userId, wordId);
}

async function rateHook(
  chatId: number,
  userId: string,
  mnemonicId: string,
  helpful: boolean,
): Promise<void> {
  await rateMnemonic(userId, mnemonicId, helpful);
  await telegram.sendMessage({
    chatId,
    text: helpful
      ? "Noted — hooks other learners find helpful get shown first."
      : "Noted. Try generating your own — an image you invent yourself sticks better than a borrowed one.",
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Lesson text is authored in full markdown; Telegram supports a subset. */
function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^> /gm, "")
    .replace(/^#+ /gm, "")
    .replace(/\|/g, " ");
}

export { LESSON_SECTIONS };
