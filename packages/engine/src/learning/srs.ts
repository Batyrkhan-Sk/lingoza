import type { RecallGrade, ReviewState, VocabularyStatus } from "../core/types.js";

/**
 * Spaced repetition (§4).
 *
 * An SM-2 derivative with three changes that matter for language learning:
 *
 *  1. Lapses shorten the interval rather than resetting it to zero — a word
 *     you have known for months and slip on once should not go back to "new".
 *  2. `strength` (0–1) is tracked separately from the interval, so the UI and
 *     the adaptivity engine can talk about how well a word is known without
 *     having to interpret ease factors.
 *  3. Intervals are fuzzed slightly so a big study day does not reassemble
 *     itself as one enormous review day weeks later.
 */

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const MASTERY_INTERVAL_DAYS = 21;
const MASTERY_STRENGTH = 0.9;

const GRADE_QUALITY: Record<RecallGrade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

/** Learning-phase steps in days, used before a word graduates to review. */
const LEARNING_STEPS = [0.007, 1, 3] as const; // ~10 minutes, 1 day, 3 days

export function initialReviewState(difficulty = 2, now: Date = new Date()): ReviewState {
  return {
    strength: 0,
    // Harder words start with a slightly lower ease so they come back sooner.
    easeFactor: clamp(2.6 - difficulty * 0.08, MIN_EASE, MAX_EASE),
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    timesSeen: 0,
    timesCorrect: 0,
    status: "new",
    lastReviewedAt: null,
    dueAt: now,
  };
}

export interface ReviewOptions {
  now?: Date;
  /** Adds ±5% jitter to intervals. Disable for deterministic tests. */
  fuzz?: boolean;
}

/**
 * Advance a word's SRS state after a single review.
 * Pure: returns a new state, never mutates the input.
 */
export function reviewWord(
  state: ReviewState,
  grade: RecallGrade,
  options: ReviewOptions = {},
): ReviewState {
  const { now = new Date(), fuzz = true } = options;
  const quality = GRADE_QUALITY[grade];
  const correct = quality >= 3;

  const timesSeen = state.timesSeen + 1;
  const timesCorrect = state.timesCorrect + (correct ? 1 : 0);

  let { easeFactor, intervalDays, repetitions, lapses } = state;

  // SM-2 ease update, applied on every review including failures.
  easeFactor = clamp(
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    MIN_EASE,
    MAX_EASE,
  );

  if (!correct) {
    lapses += 1;
    repetitions = 0;
    // Keep a fraction of the earned interval instead of dropping to zero.
    intervalDays = intervalDays > 1 ? Math.max(1, intervalDays * 0.3) : LEARNING_STEPS[0];
  } else {
    repetitions += 1;
    if (repetitions <= LEARNING_STEPS.length) {
      intervalDays = LEARNING_STEPS[repetitions - 1] ?? 1;
    } else {
      const multiplier = grade === "hard" ? 1.2 : grade === "easy" ? easeFactor * 1.3 : easeFactor;
      intervalDays = Math.max(1, intervalDays * multiplier);
    }
    // Never schedule beyond a year out.
    intervalDays = Math.min(intervalDays, 365);
  }

  const strength = nextStrength(state.strength, grade);
  const effectiveInterval = fuzz ? applyFuzz(intervalDays) : intervalDays;

  return {
    strength,
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    timesSeen,
    timesCorrect,
    status: deriveStatus({ strength, intervalDays, repetitions, correct }),
    lastReviewedAt: now,
    dueAt: addDays(now, effectiveInterval),
  };
}

/**
 * Strength moves fast upward on success and fast downward on failure, so the
 * dashboard reacts to what the learner did today rather than lagging weeks.
 */
function nextStrength(current: number, grade: RecallGrade): number {
  switch (grade) {
    case "again":
      return clamp(current * 0.5, 0, 1);
    case "hard":
      return clamp(current + (1 - current) * 0.12, 0, 1);
    case "good":
      return clamp(current + (1 - current) * 0.3, 0, 1);
    case "easy":
      return clamp(current + (1 - current) * 0.45, 0, 1);
  }
}

function deriveStatus(input: {
  strength: number;
  intervalDays: number;
  repetitions: number;
  correct: boolean;
}): VocabularyStatus {
  if (!input.correct) return "learning";
  if (input.intervalDays >= MASTERY_INTERVAL_DAYS && input.strength >= MASTERY_STRENGTH) {
    return "mastered";
  }
  if (input.repetitions > LEARNING_STEPS.length) return "review";
  return "learning";
}

/**
 * Map a graded answer onto a recall grade. Response time distinguishes a
 * confident recall from a laboured one, which SM-2 needs to schedule well.
 */
export function gradeFromAnswer(input: {
  isCorrect: boolean;
  seconds?: number;
  usedHint?: boolean;
  similarity?: number;
}): RecallGrade {
  if (!input.isCorrect) return "again";
  if (input.usedHint) return "hard";
  if ((input.similarity ?? 1) < 0.99) return "hard";
  const seconds = input.seconds ?? 0;
  if (seconds > 0 && seconds <= 3) return "easy";
  if (seconds > 12) return "hard";
  return "good";
}

export interface DueQuery<T> {
  items: T[];
  dueAt: (item: T) => Date;
  status: (item: T) => VocabularyStatus;
  now?: Date;
  limit?: number;
  /** Cap on brand-new words in one sitting, so reviews are never crowded out. */
  newLimit?: number;
}

/**
 * Select what to study now: overdue reviews first (most overdue first), then
 * learning items, then a bounded number of new words.
 */
export function selectDue<T>(query: DueQuery<T>): T[] {
  const { items, dueAt, status, now = new Date(), limit = 20, newLimit = 10 } = query;

  const due = items.filter((item) => dueAt(item).getTime() <= now.getTime());

  const reviews = due
    .filter((i) => status(i) === "review" || status(i) === "mastered")
    .sort((a, b) => dueAt(a).getTime() - dueAt(b).getTime());

  const learning = due
    .filter((i) => status(i) === "learning")
    .sort((a, b) => dueAt(a).getTime() - dueAt(b).getTime());

  const fresh = due.filter((i) => status(i) === "new").slice(0, newLimit);

  return [...reviews, ...learning, ...fresh].slice(0, limit);
}

/** How many items are waiting, split by kind — drives the dashboard badge. */
export function dueCounts<T>(query: Omit<DueQuery<T>, "limit" | "newLimit">): {
  total: number;
  reviews: number;
  learning: number;
  fresh: number;
} {
  const { items, dueAt, status, now = new Date() } = query;
  const due = items.filter((item) => dueAt(item).getTime() <= now.getTime());
  const counts = { total: due.length, reviews: 0, learning: 0, fresh: 0 };
  for (const item of due) {
    const s = status(item);
    if (s === "new") counts.fresh += 1;
    else if (s === "learning") counts.learning += 1;
    else counts.reviews += 1;
  }
  return counts;
}

/** Predict retention right now, for explaining "why am I seeing this again?". */
export function retention(state: ReviewState, now: Date = new Date()): number {
  if (!state.lastReviewedAt || state.intervalDays <= 0) return 0;
  const elapsedDays = (now.getTime() - state.lastReviewedAt.getTime()) / 86_400_000;
  // Exponential forgetting curve with stability proportional to the interval.
  return clamp(Math.exp(-elapsedDays / Math.max(state.intervalDays, 0.1)), 0, 1);
}

function applyFuzz(days: number): number {
  if (days < 1) return days;
  const factor = 0.95 + Math.random() * 0.1;
  return days * factor;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
