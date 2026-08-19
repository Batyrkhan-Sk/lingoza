/**
 * Study reminders (§13, §17).
 *
 * A learner who studies daily beats a learner who studies harder, so the bot's
 * job between sessions is to make starting cheap. Three nudges a day is the
 * default: one that hands over today's plan, one mid-day that is itself a
 * complete piece of learning (a single card, answerable in one tap), and one
 * in the evening that only pushes if the day is still empty.
 *
 * All of it is pure: the times, the choice of slot and the wording. The API
 * service supplies the learner's state and does the sending.
 */

/** Morning plan, midday micro-drill, evening streak check. */
export const DEFAULT_REMINDER_HOURS = [9, 13, 20] as const;

/** More than this and reminders stop being reminders and become noise. */
export const MAX_REMINDERS_PER_DAY = 6;

/**
 * What a given slot is *for*.
 *
 * Derived from position in the day rather than the clock, because a learner
 * who studies nights and sets 22:00/01:00/07:00 still wants their first
 * reminder to open the day and their last one to close it.
 */
export type ReminderSlot = "kickoff" | "micro" | "closeout";

export interface ReminderSchedule {
  hours: number[];
  slots: ReminderSlot[];
}

/** Parse the stored "9,13,20" into usable hours, discarding anything invalid. */
export function parseReminderHours(raw: string | null | undefined): number[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);

  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  return unique.length > 0 ? unique.slice(0, MAX_REMINDERS_PER_DAY) : [...DEFAULT_REMINDER_HOURS];
}

export function formatReminderHours(hours: number[]): string {
  return parseReminderHours(hours.join(",")).join(",");
}

/** Human-readable "09:00, 13:00, 20:00" for settings screens and the bot. */
export function describeReminderHours(hours: number[]): string {
  return parseReminderHours(hours.join(","))
    .map((hour) => `${String(hour).padStart(2, "0")}:00`)
    .join(", ");
}

/**
 * Assign a purpose to every configured hour.
 *
 * With a single reminder there is no "rest of the day" to plan, so an early
 * one still opens the day and a late one closes it.
 */
export function scheduleFor(rawHours: string | null | undefined): ReminderSchedule {
  const hours = parseReminderHours(rawHours);

  const slots = hours.map((hour, index): ReminderSlot => {
    if (hours.length === 1) return hour < 15 ? "kickoff" : "closeout";
    if (index === 0) return "kickoff";
    if (index === hours.length - 1) return "closeout";
    return "micro";
  });

  return { hours, slots };
}

/** The learner's local hour (0–23), so "09:00" means 09:00 where they are. */
export function localHour(date: Date = new Date(), timeZone = "UTC"): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    }).format(date);
    // "24" is how en-GB renders midnight in some ICU versions.
    return Number.parseInt(formatted, 10) % 24;
  } catch {
    return date.getUTCHours();
  }
}

/** Minutes past the hour, local to the learner. */
export function localMinute(date: Date = new Date(), timeZone = "UTC"): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      minute: "2-digit",
    }).format(date);
    return Number.parseInt(formatted, 10);
  } catch {
    return date.getUTCMinutes();
  }
}

export interface DueReminderInput {
  now: Date;
  timezone: string;
  /** Raw stored value, e.g. "9,13,20". */
  reminderHours: string | null | undefined;
  /**
   * How long after the hour a reminder may still be sent. The sweep runs on an
   * interval, so it will never tick at exactly :00; anything longer than the
   * interval guarantees no slot is ever missed.
   */
  graceMinutes?: number;
}

export interface DueReminder {
  hour: number;
  slot: ReminderSlot;
  /** Stable per learner per day — the key that makes re-sending impossible. */
  dedupeKey: (userId: string, dateKey: string) => string;
}

/**
 * Which reminder, if any, is due right now.
 *
 * Returns at most one: if the process was down for hours, the learner gets the
 * slot they are currently in, not a burst of everything they missed.
 */
export function dueReminder(input: DueReminderInput): DueReminder | null {
  const { hours, slots } = scheduleFor(input.reminderHours);
  const grace = input.graceMinutes ?? 30;

  const hour = localHour(input.now, input.timezone);
  const minute = localMinute(input.now, input.timezone);
  const minutesNow = hour * 60 + minute;

  let best: DueReminder | null = null;
  let bestAge = Number.POSITIVE_INFINITY;

  for (const [index, slotHour] of hours.entries()) {
    const age = minutesNow - slotHour * 60;
    if (age < 0 || age > grace) continue;
    if (age >= bestAge) continue;

    bestAge = age;
    best = {
      hour: slotHour,
      slot: slots[index] ?? "micro",
      dedupeKey: (userId, dateKey) => `reminder:${userId}:${dateKey}:${slotHour}`,
    };
  }

  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wording
// ─────────────────────────────────────────────────────────────────────────────

export interface NudgeInput {
  slot: ReminderSlot;
  displayName: string;
  level: string;
  streak: number;
  /** Whether anything was studied today, in the learner's own timezone. */
  studiedToday: boolean;
  wordsDue: number;
  /** Items left in today's generated session. */
  itemsRemaining: number;
  totalItems: number;
  targetMinutes: number;
  /** Title of the lesson the learner would continue. */
  continueLesson?: string | null;
  /** One word for the midday card — the reminder *is* the exercise. */
  drillWord?: { spanish: string; pronunciation: string } | null;
  /** A short phrase to notice today, when there is nothing else to say. */
  phraseOfDay?: { spanish: string; english: string } | null;
}

export interface Nudge {
  /** Matches Notification.kind: reminder | streak | report. */
  kind: "reminder" | "streak" | "report";
  title: string;
  body: string;
  /** What the primary button should do, resolved to a callback by the bot. */
  action: "daily" | "lesson" | "review" | "drill" | "progress";
  /**
   * The body already contains deliberate markdown and must be sent as-is.
   * Everything else interpolates learner-supplied text — lesson titles, names —
   * and has to be escaped before it reaches Telegram.
   */
  preformatted?: boolean;
}

/**
 * Whether this slot has anything worth saying.
 *
 * A reminder that arrives when the learner has already done everything trains
 * them to ignore reminders, so the closeout stays silent on a finished day
 * unless there is a streak worth celebrating.
 */
export function shouldSend(input: NudgeInput): boolean {
  if (input.slot !== "closeout") return true;
  if (!input.studiedToday) return true;
  return input.itemsRemaining > 0 || input.streak > 0;
}

export function composeNudge(input: NudgeInput): Nudge {
  const name = input.displayName.split(" ")[0] ?? input.displayName;

  switch (input.slot) {
    case "kickoff":
      return kickoff(input, name);
    case "micro":
      return micro(input, name);
    case "closeout":
      return closeout(input, name);
  }
}

function kickoff(input: NudgeInput, name: string): Nudge {
  const streakLine =
    input.streak > 1 ? `🔥 ${input.streak}-day streak — day ${input.streak + 1} starts now.\n\n` : "";

  if (input.itemsRemaining === 0 && input.totalItems > 0) {
    return {
      kind: "reminder",
      title: "Today is already done",
      body: `¡Buenos días, ${name}! ${streakLine}Today's session is complete. Anything now is a bonus — a few extra words, or a chat with your tutor.`,
      action: "review",
    };
  }

  const parts = [`¡Buenos días, ${name}! ☀️`, ""];
  if (streakLine) parts.push(streakLine.trim(), "");
  parts.push(`Today: about ${input.targetMinutes} minutes, ${input.itemsRemaining} things to do.`);
  if (input.wordsDue > 0) parts.push(`🔁 ${input.wordsDue} words due for review.`);
  if (input.continueLesson) parts.push(`📖 Next up: ${input.continueLesson}`);

  return {
    kind: "reminder",
    title: "Today's session",
    body: parts.join("\n"),
    action: "daily",
  };
}

function micro(input: NudgeInput, name: string): Nudge {
  // The point of the midday slot is that it costs one tap. A word beats a
  // summary, because answering it *is* the study session if nothing else fits.
  if (input.drillWord) {
    return {
      kind: "reminder",
      title: "One word",
      body:
        `*${input.drillWord.spanish}*\n_${input.drillWord.pronunciation}_\n\n` +
        "Thirty seconds: do you remember what this means?",
      action: "drill",
      preformatted: true,
    };
  }

  if (input.phraseOfDay) {
    return {
      kind: "reminder",
      title: "Phrase of the day",
      body: `🇪🇸 *${input.phraseOfDay.spanish}*\n🇬🇧 _${input.phraseOfDay.english}_\n\nSay it out loud once — that is today's midday Spanish.`,
      action: "review",
      preformatted: true,
    };
  }

  return {
    kind: "reminder",
    title: "A few minutes?",
    body: `${name}, nothing is due right now — so this is a good moment to learn something new instead of repeating.`,
    action: "daily",
  };
}

function closeout(input: NudgeInput, name: string): Nudge {
  if (!input.studiedToday && input.streak > 0) {
    return {
      kind: "streak",
      title: "Streak at risk",
      body:
        `🔥 Your ${input.streak}-day streak ends at midnight, ${name}.\n\n` +
        (input.wordsDue > 0
          ? `${input.wordsDue} words are due — five of them is enough to keep it.`
          : "One review is enough to keep it."),
      action: "review",
    };
  }

  if (!input.studiedToday) {
    return {
      kind: "reminder",
      title: "Still time today",
      body: `${name}, there's still time for a short one. ${input.targetMinutes} minutes, or as little as one review card.`,
      action: "daily",
    };
  }

  if (input.itemsRemaining > 0) {
    return {
      kind: "reminder",
      title: "Almost there",
      body: `Good work today, ${name} — ${input.totalItems - input.itemsRemaining}/${input.totalItems} done. ${input.itemsRemaining} left if you have a few minutes.`,
      action: "daily",
    };
  }

  return {
    kind: "report",
    title: "Day complete",
    body:
      `✅ Full session done, ${name}.` +
      (input.streak > 0 ? ` 🔥 ${input.streak}-day streak intact.` : "") +
      `\n\nLevel ${input.level}. Hasta mañana. 🌙`,
    action: "progress",
  };
}
