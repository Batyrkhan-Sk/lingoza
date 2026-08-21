import {
  checkAnswer,
  localDateKey,
  dueCounts,
  gradeFromAnswer,
  initialReviewState,
  parseLevel,
  reviewWord,
  selectDue,
  servableLevels,
  XP_REWARDS,
  type Interface,
  type RecallGrade,
  type ReviewState,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { recordActivity, refreshDerivedCounters } from "./progress.js";
import { advanceDailyItem } from "./dailyProgress.js";

/**
 * Vocabulary and spaced repetition (§4).
 *
 * The scheduling maths lives in the engine; this service is responsible for
 * loading state, persisting it, and choosing which words to introduce next —
 * always in frequency order, so the most useful words are learned first.
 */

export interface NewWordBudget {
  /** How many new words today's plan allocated. */
  target: number;
  /** How many have already been introduced today. */
  introduced: number;
  /** What is left. Zero means the session should stop offering new words. */
  remaining: number;
  /** True once the day's allocation is used up. */
  reached: boolean;
}

/**
 * How many new words the learner may still start today.
 *
 * The daily plan does not just describe the day, it *budgets* it. Introducing
 * thirty words in one sitting feels productive and then produces an
 * unmanageable review pile two days later — which is the point at which people
 * abandon spaced repetition altogether. Capping introductions keeps future load
 * proportional to the time the learner actually has.
 *
 * Reviews are never capped: they are already due, and skipping them is what
 * loses words.
 */
export async function getNewWordBudget(userId: string): Promise<NewWordBudget> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const today = localDateKey(new Date(), user.timezone);

  const session = await prisma.dailySession.findUnique({
    where: { userId_date: { userId, date: today } },
    include: { items: true },
  });

  // The plan's own allocation, falling back to the engine's default shape when
  // today's session has not been generated yet.
  const target =
    // An explicit setting always wins: a learner who asked for 30 a day meant it.
    user.newWordsPerDay ??
    session?.items.find((item) => item.kind === "vocabulary")?.quantity ??
    Math.max(5, Math.round((user.dailyTimeBudget / 20) * 10));

  // Count today's introductions by local date rather than a UTC window, so a
  // learner in Almaty and one in Madrid both get a day that starts at midnight
  // where they are. The 36-hour prefilter keeps this to an indexed range scan.
  const recent = await prisma.vocabularyProgress.findMany({
    where: { userId, firstSeenAt: { gte: new Date(Date.now() - 36 * 3600_000) } },
    select: { firstSeenAt: true },
  });
  const introduced = recent.filter(
    (row) => localDateKey(row.firstSeenAt, user.timezone) === today,
  ).length;

  const remaining = Math.max(0, target - introduced);
  return { target, introduced, remaining, reached: remaining === 0 };
}

export interface DueQueueOptions {
  /**
   * Restrict the queue to one half of it. Today's plan reviews and introduces
   * as two separate items with two separate budgets, so each needs to be able
   * to ask for its own material rather than whatever comes off the top.
   */
  only?: "due" | "new";
}

export async function getDueQueue(userId: string, limit = 20, options: DueQueueOptions = {}) {
  const [progress, budget] = await Promise.all([
    prisma.userProgress.findUnique({ where: { userId } }),
    getNewWordBudget(userId),
  ]);
  const level = parseLevel(progress?.currentLevelCode);

  const existing = await prisma.vocabularyProgress.findMany({
    where: { userId },
    include: { word: true },
  });

  const due =
    options.only === "new"
      ? []
      : selectDue({
          items: existing,
          dueAt: (item) => item.dueAt,
          status: (item) => item.status as ReviewState["status"],
          limit,
          newLimit: budget.remaining,
        });

  if (options.only === "due") {
    return due.map((item) => ({ word: item.word, state: toState(item), isNew: false }));
  }

  // Top up with words the learner has never seen, most frequent first —
  // but only up to what today's budget still allows.
  if (due.length < limit && budget.remaining > 0) {
    const seenIds = existing.map((item) => item.wordId);
    const fresh = await prisma.vocabularyWord.findMany({
      where: { id: { notIn: seenIds }, levelCode: { in: servableLevels(level) } },
      orderBy: [{ frequencyRank: "asc" }],
      take: Math.min(limit - due.length, budget.remaining),
    });

    return [
      ...due.map((item) => ({ word: item.word, state: toState(item), isNew: false })),
      ...fresh.map((word) => ({ word, state: null, isNew: true })),
    ];
  }

  return due.map((item) => ({ word: item.word, state: toState(item), isNew: false }));
}

export async function getDueSummary(userId: string) {
  const existing = await prisma.vocabularyProgress.findMany({ where: { userId } });
  return dueCounts({
    items: existing,
    dueAt: (item) => item.dueAt,
    status: (item) => item.status as ReviewState["status"],
  });
}

export interface ReviewInput {
  userId: string;
  wordId: string;
  /** Either an explicit self-rating, or an answer to be graded. */
  grade?: RecallGrade;
  answer?: string;
  seconds?: number;
  usedHint?: boolean;
  source?: Interface;
}

export async function reviewVocabulary(input: ReviewInput) {
  const { userId, wordId, answer, seconds, usedHint, source = "web" } = input;

  const word = await prisma.vocabularyWord.findUniqueOrThrow({ where: { id: wordId } });
  const existing = await prisma.vocabularyProgress.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  // Grade: either the learner self-rated, or they typed an answer we check.
  let grade = input.grade;
  let check: ReturnType<typeof checkAnswer> | null = null;

  if (!grade) {
    if (answer === undefined) {
      throw new Error("Either a grade or an answer is required.");
    }
    check = checkAnswer(answer, word.english, {
      // Accept either direction and tolerate an article or a near-miss.
      accepted: [word.spanish],
    });
    grade = gradeFromAnswer({
      isCorrect: check.isCorrect,
      seconds,
      usedHint,
      similarity: check.similarity,
    });
  }

  const state: ReviewState = existing ? toState(existing) : initialReviewState(word.difficulty);
  const next = reviewWord(state, grade);

  await prisma.vocabularyProgress.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: {
      userId,
      wordId,
      strength: next.strength,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      timesSeen: next.timesSeen,
      timesCorrect: next.timesCorrect,
      status: next.status,
      lastReviewedAt: next.lastReviewedAt,
      dueAt: next.dueAt,
    },
    update: {
      strength: next.strength,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      timesSeen: next.timesSeen,
      timesCorrect: next.timesCorrect,
      status: next.status,
      lastReviewedAt: next.lastReviewedAt,
      dueAt: next.dueAt,
    },
  });

  await refreshDerivedCounters(userId);

  const correct = grade !== "again";
  const activity = await recordActivity({
    userId,
    activity: "vocabulary",
    skills: { vocabulary: correct ? 100 : 0 },
    // One card is weak evidence; a session of them adds up.
    weight: 0.15,
    xp: existing ? (correct ? XP_REWARDS.vocabularyReview : 0) : XP_REWARDS.newWord,
    source,
  });

  // Spend the card against today's plan, whichever interface it came from: a
  // first meeting draws on the day's new-word allocation, a scheduled review on
  // the review budget. Reaching either ends that item of the session.
  const plan = await advanceDailyItem(userId, [existing ? "review" : "vocabulary"]);

  return {
    correct,
    grade,
    check,
    /// First meeting with this word, as opposed to a scheduled review. The two
    /// are budgeted separately by the daily plan.
    isNew: !existing,
    /// How this card moved today's session on, or null if it was outside it.
    plan,
    nextDueAt: next.dueAt,
    intervalDays: next.intervalDays,
    strength: next.strength,
    status: next.status,
    word: { spanish: word.spanish, english: word.english, exampleSentence: word.exampleSentence },
    activity,
  };
}

/** The learner's whole vocabulary, for the browse screen. */
export async function listVocabulary(
  userId: string,
  filters: { level?: string; topic?: string; status?: string; search?: string; limit?: number } = {},
) {
  const { level, topic, status, search, limit = 100 } = filters;

  const words = await prisma.vocabularyWord.findMany({
    where: {
      ...(level ? { levelCode: level } : {}),
      ...(topic ? { topic } : {}),
      ...(search
        ? {
            OR: [
              { spanish: { contains: search } },
              { english: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ levelCode: "asc" }, { frequencyRank: "asc" }],
    take: limit,
    include: {
      progress: { where: { userId } },
      relationsFrom: { include: { target: { select: { spanish: true, english: true } } } },
    },
  });

  return words
    .map((word) => {
      const progress = word.progress[0];
      return {
        id: word.id,
        spanish: word.spanish,
        english: word.english,
        pronunciation: word.pronunciation,
        exampleSentence: word.exampleSentence,
        exampleTranslation: word.exampleTranslation,
        levelCode: word.levelCode,
        topic: word.topic,
        partOfSpeech: word.partOfSpeech,
        gender: word.gender,
        pluralForm: word.pluralForm,
        region: word.region,
        regionalVariant: word.regionalVariant,
        related: word.relationsFrom.map((r) => ({ kind: r.kind, ...r.target })),
        status: progress?.status ?? "new",
        strength: progress?.strength ?? 0,
        dueAt: progress?.dueAt ?? null,
      };
    })
    .filter((word) => !status || word.status === status);
}

export async function vocabularyTopics(): Promise<string[]> {
  const rows = await prisma.vocabularyWord.findMany({
    select: { topic: true },
    distinct: ["topic"],
    orderBy: { topic: "asc" },
  });
  return rows.map((row) => row.topic);
}

function toState(row: {
  strength: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  timesSeen: number;
  timesCorrect: number;
  status: string;
  lastReviewedAt: Date | null;
  dueAt: Date;
}): ReviewState {
  return {
    strength: row.strength,
    easeFactor: row.easeFactor,
    intervalDays: row.intervalDays,
    repetitions: row.repetitions,
    lapses: row.lapses,
    timesSeen: row.timesSeen,
    timesCorrect: row.timesCorrect,
    status: row.status as ReviewState["status"],
    lastReviewedAt: row.lastReviewedAt,
    dueAt: row.dueAt,
  };
}
