import {
  LESSON_SECTIONS,
  overallScore,
  parseLevel,
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

  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (existing) {
    if (existing.telegramChatId !== String(chatId)) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { telegramChatId: String(chatId) },
      });
    }
    return existing;
  }

  const created = await prisma.user.create({
    data: {
      displayName: from.first_name ?? from.username ?? "Learner",
      telegramId,
      telegramUsername: from.username ?? null,
      telegramChatId: String(chatId),
      createdVia: "telegram",
    },
  });
  await ensureProgress(created.id);
  return created;
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
      return sendVocabulary(chat.id, user.id);
    case "/practice":
      return sendPractice(chat.id, user.id);
    case "/hook":
    case "/mnemonic":
      return sendHookLookup(chat.id, user.id, args.join(" "));
    case "/speak":
      return sendScenarioPicker(chat.id);
    case "/progress":
      return sendProgress(chat.id, user.id);
    case "/stats":
      return sendStats(chat.id, user.id);
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

    case "ghook":
      return sendGrammarHook(chatId, user.id, args[0]!);

    case "mkhook":
      return makeWordHook(chatId, user.id, args[0]!);

    case "rate":
      return rateHook(chatId, user.id, args[0]!, args[1] === "1");

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
      [{ text: "💡 Memory hook", callback_data: `hook:${wordId}` }],
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
