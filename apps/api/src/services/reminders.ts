import {
  composeNudge,
  describeReminderTimes,
  dueReminder,
  formatReminderTimes,
  localDateKey,
  normalizeTimezone,
  parseReminderTimes,
  shouldSend,
  type Nudge,
  type NudgeInput,
  type ReminderSlot,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { telegram, escapeMarkdown, type InlineKeyboard } from "../telegram/client.js";
import { getDailySession } from "./planner.js";
import { getDueQueue, getDueSummary } from "./vocabulary.js";

/**
 * Scheduled study reminders (§13, §17).
 *
 * Three a day by default. The decisions — when, which slot, what to say — are
 * the engine's; this module loads the learner's state, delivers the message and
 * records that it went out.
 *
 * Delivery is at-most-once per learner per slot per day, enforced by a unique
 * `Notification.dedupeKey` rather than by in-memory bookkeeping, so a restart
 * mid-sweep, a manual trigger, or a second API replica cannot double-send.
 */

export interface SweepResult {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function runReminderSweep(now: Date = new Date()): Promise<SweepResult> {
  const result: SweepResult = { considered: 0, sent: 0, skipped: 0, failed: 0 };

  if (!telegram.configured) return result;

  const candidates = await prisma.user.findMany({
    where: { remindersEnabled: true, telegramChatId: { not: null } },
    select: {
      id: true,
      displayName: true,
      telegramChatId: true,
      timezone: true,
      reminderHours: true,
      dailyTimeBudget: true,
    },
  });

  for (const user of candidates) {
    result.considered += 1;

    const due = dueReminder({
      now,
      timezone: user.timezone,
      reminderHours: user.reminderHours,
      // Comfortably wider than the sweep interval: a tick that lands at :07
      // still delivers the :00 slot, and a brief outage does not lose one.
      graceMinutes: Math.max(30, config.reminders.intervalMinutes * 3),
    });
    if (!due) {
      result.skipped += 1;
      continue;
    }

    const dateKey = localDateKey(now, user.timezone);
    const dedupeKey = due.dedupeKey(user.id, dateKey);

    try {
      const delivered = await deliver({
        userId: user.id,
        chatId: user.telegramChatId!,
        displayName: user.displayName,
        timezone: user.timezone,
        targetMinutes: user.dailyTimeBudget,
        slot: due.slot,
        dedupeKey,
        dateKey,
      });
      if (delivered) result.sent += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[reminders] ${user.id} failed:`, error);
    }
  }

  if (result.sent > 0) {
    console.log(
      `[reminders] sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`,
    );
  }

  return result;
}

interface DeliverInput {
  userId: string;
  chatId: string;
  displayName: string;
  timezone: string;
  targetMinutes: number;
  slot: ReminderSlot;
  dedupeKey: string;
  dateKey: string;
  /** Bypass the "nothing worth saying" check — used by the manual test send. */
  force?: boolean;
}

/** @returns true if a message was actually sent. */
async function deliver(input: DeliverInput): Promise<boolean> {
  // Claim the slot *before* composing anything. If the insert loses the unique
  // race, another sweep already owns this slot and there is nothing to do.
  const claimed = await claimSlot(input);
  if (!claimed) return false;

  const state = await gatherState(input);
  const nudge = composeNudge(state);

  if (!input.force && !shouldSend(state)) {
    // The claim stays, so the slot is not retried later in its grace window,
    // but it is recorded as unsent — a quiet evening is a deliberate outcome,
    // not a delivery failure.
    await prisma.notification.update({
      where: { id: claimed.id },
      data: { kind: nudge.kind, title: nudge.title, body: "(suppressed — nothing to say)" },
    });
    return false;
  }

  const sent = await telegram.sendMessage({
    chatId: input.chatId,
    text: renderNudge(nudge),
    keyboard: keyboardFor(nudge, state),
  });

  await prisma.notification.update({
    where: { id: claimed.id },
    data: { kind: nudge.kind, title: nudge.title, body: nudge.body, sent: Boolean(sent) },
  });

  if (sent) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { lastRemindedAt: new Date() },
    });
  }

  return Boolean(sent);
}

/**
 * Take ownership of one learner's slot for one day, or find it already taken.
 *
 * `createMany` with `skipDuplicates` rather than a `create` in a try/catch:
 * losing this race is the normal case — the sweep re-runs several times inside
 * a slot's grace window — and Prisma logs every unique violation as an error,
 * which would bury real failures in expected ones.
 */
async function claimSlot(input: DeliverInput) {
  const claimed = await prisma.notification.createMany({
    data: [
      {
        userId: input.userId,
        kind: "reminder",
        title: "…",
        body: "…",
        channel: "telegram",
        sent: false,
        dedupeKey: input.dedupeKey,
      },
    ],
    skipDuplicates: true,
  });

  if (claimed.count === 0) return null;
  return prisma.notification.findUniqueOrThrow({ where: { dedupeKey: input.dedupeKey } });
}

type NudgeState = NudgeInput & { drillWordId?: string };

async function gatherState(input: DeliverInput): Promise<NudgeState> {
  const [progress, due] = await Promise.all([
    prisma.userProgress.findUnique({ where: { userId: input.userId } }),
    getDueSummary(input.userId),
  ]);

  // Generating today's session here is intentional: the morning reminder is
  // often the first thing that touches the account all day, and a plan the
  // learner can act on immediately is the whole point of the message.
  const session = await getDailySession(input.userId).catch(() => null);
  const completed = session?.items.filter((item) => item.completed).length ?? 0;
  const totalItems = session?.totalItems ?? 0;

  const studiedToday = progress?.lastStudyDate
    ? localDateKey(progress.lastStudyDate, input.timezone) === input.dateKey
    : false;

  return {
    slot: input.slot,
    displayName: input.displayName,
    level: progress?.currentLevelCode ?? "A1",
    streak: progress?.currentStreak ?? 0,
    studiedToday,
    wordsDue: due.total,
    itemsRemaining: Math.max(0, totalItems - completed),
    totalItems,
    targetMinutes: session?.targetMinutes ?? input.targetMinutes,
    continueLesson: await continueLessonTitle(input.userId, progress?.resumeLessonId ?? null),
    ...(input.slot === "micro" ? await middayCard(input.userId, progress?.currentLevelCode) : {}),
  };
}

async function continueLessonTitle(userId: string, resumeLessonId: string | null) {
  if (!resumeLessonId) return null;
  const lesson = await prisma.lesson.findUnique({
    where: { id: resumeLessonId },
    select: { title: true },
  });
  return lesson?.title ?? null;
}

/**
 * The midday message carries its own exercise.
 *
 * A due word is best — answering it is a real review that feeds the SRS. When
 * nothing is due, a sentence from the learner's level still gives them one
 * concrete piece of Spanish rather than a content-free "time to study".
 */
async function middayCard(
  userId: string,
  levelCode: string | undefined,
): Promise<Pick<NudgeInput, "drillWord" | "phraseOfDay"> & { drillWordId?: string }> {
  const [next] = await getDueQueue(userId, 1);

  if (next && !next.isNew) {
    return {
      drillWord: { spanish: next.word.spanish, pronunciation: next.word.pronunciation },
      drillWordId: next.word.id,
    };
  }

  const word = await prisma.vocabularyWord.findFirst({
    where: { levelCode: levelCode ?? "A1", exampleSentence: { not: "" } },
    // Rotates through the level over time instead of always offering the same
    // first row, without needing per-user state to track what was shown.
    orderBy: { frequencyRank: "asc" },
    skip: Math.floor(Math.random() * 40),
    select: { exampleSentence: true, exampleTranslation: true },
  });

  return word
    ? { phraseOfDay: { spanish: word.exampleSentence, english: word.exampleTranslation } }
    : {};
}

function renderNudge(nudge: Nudge): string {
  // Cards the engine marked up go out as written; everything else interpolates
  // learner data — a lesson title with an underscore in it would otherwise
  // swallow half the message into italics.
  return nudge.preformatted ? nudge.body : escapeMarkdown(nudge.body);
}

function keyboardFor(nudge: Nudge, state: NudgeState): InlineKeyboard {
  const primary: Record<Nudge["action"], { text: string; callback_data: string }> = {
    daily: { text: "▶️ Start today's session", callback_data: "daily" },
    lesson: { text: "📖 Continue lesson", callback_data: "lesson" },
    review: { text: "🔁 Review words", callback_data: "review" },
    drill: {
      text: "👁 Show answer",
      callback_data: state.drillWordId ? `show:${state.drillWordId}` : "review",
    },
    progress: { text: "📊 Progress", callback_data: "progress" },
  };

  return [
    [primary[nudge.action]],
    [
      { text: "🏠 Menu", callback_data: "menu" },
      { text: "🔕 Reminder settings", callback_data: "rem" },
    ],
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences
// ─────────────────────────────────────────────────────────────────────────────

export interface ReminderSettings {
  enabled: boolean;
  /** Minutes past local midnight, so 08:45 survives as 08:45. */
  times: number[];
  timezone: string;
  description: string;
}

export async function getReminderSettings(userId: string): Promise<ReminderSettings> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { remindersEnabled: true, reminderHours: true, timezone: true },
  });

  const times = parseReminderTimes(user.reminderHours);
  return {
    enabled: user.remindersEnabled,
    times,
    timezone: user.timezone,
    description: describeReminderTimes(times),
  };
}

export async function updateReminderSettings(
  userId: string,
  patch: { enabled?: boolean; times?: number[]; timezone?: string },
): Promise<ReminderSettings> {
  // A zone the platform cannot resolve would silently fall back to UTC at send
  // time, which is the failure it is meant to fix — so it is rejected loudly.
  const timezone = patch.timezone ? normalizeTimezone(patch.timezone) : undefined;
  if (patch.timezone && !timezone) {
    throw new Error(`Unrecognised timezone: ${patch.timezone}`);
  }

  const times = patch.times ? parseReminderTimes(patch.times.map(minutesToText).join(",")) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(typeof patch.enabled === "boolean" ? { remindersEnabled: patch.enabled } : {}),
      ...(times
        ? {
            reminderHours: formatReminderTimes(times),
            // Keep the legacy single-slot column consistent for any client
            // still reading it. It only holds an hour, so it rounds.
            reminderHour: Math.floor((times[0] ?? 9 * 60) / 60),
          }
        : {}),
      ...(timezone ? { timezone } : {}),
    },
  });

  return getReminderSettings(userId);
}

function minutesToText(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Send a learner their next reminder immediately, ignoring the schedule.
 *
 * Used by the bot's "send me one now" button — the point is to prove the
 * reminders work before waiting a day to find out they do not.
 */
export async function sendTestReminder(userId: string, slot: ReminderSlot = "kickoff") {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { displayName: true, telegramChatId: true, timezone: true, dailyTimeBudget: true },
  });
  if (!user.telegramChatId) return false;

  const now = new Date();
  return deliver({
    userId,
    chatId: user.telegramChatId,
    displayName: user.displayName,
    timezone: user.timezone,
    targetMinutes: user.dailyTimeBudget,
    slot,
    // Not a scheduled slot, so it must not consume one — a distinct key per
    // request keeps test sends and real reminders independent.
    dedupeKey: `reminder-test:${userId}:${now.toISOString()}`,
    dateKey: localDateKey(now, user.timezone),
    force: true,
  });
}
