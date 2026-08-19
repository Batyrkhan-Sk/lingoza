import {
  checkAnswer,
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

/**
 * Vocabulary and spaced repetition (§4).
 *
 * The scheduling maths lives in the engine; this service is responsible for
 * loading state, persisting it, and choosing which words to introduce next —
 * always in frequency order, so the most useful words are learned first.
 */

export async function getDueQueue(userId: string, limit = 20) {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const level = parseLevel(progress?.currentLevelCode);

  const existing = await prisma.vocabularyProgress.findMany({
    where: { userId },
    include: { word: true },
  });

  const due = selectDue({
    items: existing,
    dueAt: (item) => item.dueAt,
    status: (item) => item.status as ReviewState["status"],
    limit,
    newLimit: 10,
  });

  // Top up with words the learner has never seen, most frequent first.
  if (due.length < limit) {
    const seenIds = existing.map((item) => item.wordId);
    const fresh = await prisma.vocabularyWord.findMany({
      where: { id: { notIn: seenIds }, levelCode: { in: servableLevels(level) } },
      orderBy: [{ frequencyRank: "asc" }],
      take: limit - due.length,
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

  return {
    correct,
    grade,
    check,
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
