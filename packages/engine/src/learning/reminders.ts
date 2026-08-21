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
const DEFAULT_REMINDER_HOURS = [9, 13, 20] as const;

/**
 * The default schedule, as minutes past local midnight.
 *
 * Times are held in minutes rather than whole hours because "remind me at
 * 08:45" is a normal thing to want, and rounding it to 09:00 quietly ignores
 * the learner. Everything downstream compares minutes, so precision costs
 * nothing.
 */
export const DEFAULT_REMINDER_TIMES: number[] = DEFAULT_REMINDER_HOURS.map((h) => h * 60);

/** More than this and reminders stop being reminders and become noise. */
export const MAX_REMINDERS_PER_DAY = 6;

const MINUTES_PER_DAY = 24 * 60;

/**
 * One time of day → minutes past midnight.
 *
 * Accepts "8:45", "08:45" and a bare "9", the last of which is what accounts
 * created before minute precision have stored.
 */
export function parseTimeOfDay(raw: string): number | null {
  const match = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(raw.trim());
  if (!match) return null;

  const hour = Number.parseInt(match[1]!, 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

/** Minutes past midnight → "08:45", the form both stored and displayed. */
export function formatTimeOfDay(minutes: number): string {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(wrapped / 60);
  return `${String(hour).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/**
 * Parse the stored schedule, discarding anything invalid.
 *
 * Reads both the current "08:45,13:00,20:00" and the older "9,13,20" that
 * accounts were written with before minute precision, so no migration of
 * stored preferences is needed.
 */
export function parseReminderTimes(raw: string | null | undefined): number[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((part) => parseTimeOfDay(part))
    .filter((minutes): minutes is number => minutes !== null);

  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  return unique.length > 0 ? unique.slice(0, MAX_REMINDERS_PER_DAY) : [...DEFAULT_REMINDER_TIMES];
}

/** The canonical stored form, e.g. "08:45,13:00,20:00". */
export function formatReminderTimes(times: number[]): string {
  return parseReminderTimes(times.map(formatTimeOfDay).join(",")).map(formatTimeOfDay).join(",");
}

/** Human-readable "08:45, 13:00, 20:00" for settings screens and the bot. */
export function describeReminderTimes(times: number[]): string {
  return parseReminderTimes(times.map(formatTimeOfDay).join(","))
    .map(formatTimeOfDay)
    .join(", ");
}

/**
 * Assign a purpose to every configured time.
 *
 * With a single reminder there is no "rest of the day" to plan, so an early
 * one still opens the day and a late one closes it.
 */
export function scheduleFor(raw: string | null | undefined): ReminderSchedule {
  const times = parseReminderTimes(raw);

  const slots = times.map((minutes, index): ReminderSlot => {
    if (times.length === 1) return minutes < 15 * 60 ? "kickoff" : "closeout";
    if (index === 0) return "kickoff";
    if (index === times.length - 1) return "closeout";
    return "micro";
  });

  return { times, slots };
}

export interface ReminderSchedule {
  /** Minutes past local midnight, ascending. */
  times: number[];
  slots: ReminderSlot[];
}

/**
 * What a given slot is *for*.
 *
 * Derived from position in the day rather than the clock, because a learner
 * who studies nights and sets 22:00/01:00/07:00 still wants their first
 * reminder to open the day and their last one to close it.
 */
export type ReminderSlot = "kickoff" | "micro" | "closeout";

/**
 * The learner's local time of day, in minutes past midnight.
 *
 * This is the whole reason a learner's timezone has to be real: "08:45" has to
 * mean 08:45 where they are, not 08:45 UTC. An account still on the default
 * gets reminded at its own local time, which is exactly the bug this reads
 * against.
 */
export function localMinutes(date: Date = new Date(), timeZone = "UTC"): number {
  return localHour(date, timeZone) * 60 + localMinute(date, timeZone);
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

/**
 * Resolve whatever the learner typed into a zone `Intl` will accept.
 *
 * An IANA name is taken as-is once it is known to work. A plain offset — "+5",
 * "UTC+5", "GMT-3" — becomes the matching `Etc/GMT` zone, whose sign is
 * inverted by the POSIX convention the name inherits: UTC+5 is `Etc/GMT-5`.
 * Offsets do not track daylight saving, so a name is always preferable and the
 * caller should say so.
 */
export function normalizeTimezone(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const offset = /^(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(00|30|45))?$/i.exec(text);
  if (offset) {
    const hours = Number.parseInt(offset[2]!, 10);
    // Only whole-hour offsets have an Etc/GMT zone; the half-hour ones
    // (India, Nepal) have to be given by name.
    if (hours > 14 || (offset[3] && offset[3] !== "00")) return null;
    if (hours === 0) return "UTC";
    return `Etc/GMT${offset[1] === "+" ? "-" : "+"}${hours}`;
  }

  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: text }).format(new Date());
    return text;
  } catch {
    return null;
  }
}

/** How a zone reads to a learner: "Asia/Almaty (UTC+5, 08:45 now)". */
export function describeTimezone(timeZone: string, now: Date = new Date()): string {
  const time = formatTimeOfDay(localMinutes(now, timeZone));
  const offsetMinutes = localMinutes(now, timeZone) - localMinutes(now, "UTC");
  // Wrap the comparison: local and UTC can sit on different calendar days.
  const wrapped = ((offsetMinutes + 720 + MINUTES_PER_DAY) % MINUTES_PER_DAY) - 720;
  const sign = wrapped < 0 ? "-" : "+";
  const abs = Math.abs(wrapped);
  const offset =
    abs % 60 === 0 ? `${sign}${abs / 60}` : `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;

  return `${timeZone} (UTC${offset}, ${time} now)`;
}

export interface DueReminderInput {
  now: Date;
  timezone: string;
  /** Raw stored value, e.g. "08:45,13:00,20:00" (or a legacy "9,13,20"). */
  reminderHours: string | null | undefined;
  /**
   * How long after the hour a reminder may still be sent. The sweep runs on an
   * interval, so it will never tick at exactly :00; anything longer than the
   * interval guarantees no slot is ever missed.
   */
  graceMinutes?: number;
}

export interface DueReminder {
  /** Minutes past local midnight — the slot's configured time. */
  minutes: number;
  /** The hour it falls in, for callers that only report the coarse time. */
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
  const { times, slots } = scheduleFor(input.reminderHours);
  const grace = input.graceMinutes ?? 30;

  const minutesNow = localMinutes(input.now, input.timezone);

  let best: DueReminder | null = null;
  let bestAge = Number.POSITIVE_INFINITY;

  for (const [index, slotMinutes] of times.entries()) {
    const age = minutesNow - slotMinutes;
    if (age < 0 || age > grace) continue;
    if (age >= bestAge) continue;

    bestAge = age;
    best = {
      minutes: slotMinutes,
      hour: Math.floor(slotMinutes / 60),
      slot: slots[index] ?? "micro",
      // Keyed by the slot's own time, so editing the schedule mid-day cannot
      // re-open a slot that has already been delivered.
      dedupeKey: (userId, dateKey) =>
        `reminder:${userId}:${dateKey}:${formatTimeOfDay(slotMinutes)}`,
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
    const finished = input.totalItems - input.itemsRemaining;

    // "Good work today — 0/5 done" is a contradiction, and reads as a bot that
    // is not paying attention. Studying today and finishing part of the plan
    // are different facts, so a day where the plan was never touched gets an
    // honest nudge rather than praise for nothing.
    if (finished === 0) {
      return {
        kind: "reminder",
        title: "Still time today",
        body:
          `${name}, today's plan is still untouched — ${input.totalItems} things, ` +
          `about ${input.targetMinutes} minutes. Even the first one keeps the day alive.`,
        action: "daily",
      };
    }

    return {
      kind: "reminder",
      title: "Almost there",
      body: `Good work today, ${name} — ${finished}/${input.totalItems} done. ${input.itemsRemaining} left if you have a few minutes.`,
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
