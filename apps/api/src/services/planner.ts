import {
  findWeakAreas,
  generateDailyPlan,
  localDateKey,
  overallScore,
  parseLevel,
  progressHeadline,
  recommend,
  readyToAdvance,
  type LearnerSnapshot,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { getNextLesson } from "./learning.js";
import { getMistakePatterns } from "./practice.js";
import { getDueSummary } from "./vocabulary.js";

/**
 * The planner: what should this learner do next, and why.
 *
 * Everything here is derived — no planning state is stored beyond the
 * generated daily session, so a plan is always consistent with the learner's
 * current standing rather than a stale snapshot.
 */

export async function buildSnapshot(userId: string): Promise<LearnerSnapshot> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { progress: true },
  });
  const progress = user.progress;

  const [due, patterns, learning] = await Promise.all([
    getDueSummary(userId),
    getMistakePatterns(userId),
    prisma.vocabularyProgress.count({ where: { userId, status: "learning" } }),
  ]);

  return {
    userId,
    level: parseLevel(progress?.currentLevelCode),
    skills: {
      listening: progress?.listeningScore ?? 0,
      speaking: progress?.speakingScore ?? 0,
      reading: progress?.readingScore ?? 0,
      writing: progress?.writingScore ?? 0,
      grammar: progress?.grammarScore ?? 0,
      vocabulary: progress?.vocabularyScore ?? 0,
    },
    xp: progress?.xp ?? 0,
    currentStreak: progress?.currentStreak ?? 0,
    wordsDue: due.total,
    wordsLearning: learning,
    lessonsCompleted: progress?.lessonsCompleted ?? 0,
    dailyTimeBudget: user.dailyTimeBudget,
    mistakePatterns: patterns,
  };
}

/** The home page: continue, today's goal, progress, weak areas, recommended. */
export async function getHome(userId: string) {
  const snapshot = await buildSnapshot(userId);

  const [progress, placement, nextLesson, resume] = await Promise.all([
    prisma.userProgress.findUnique({ where: { userId } }),
    prisma.placementResult.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    getNextLesson(userId),
    prisma.userProgress
      .findUnique({ where: { userId } })
      .then((p) =>
        p?.resumeLessonId
          ? prisma.lesson.findUnique({ where: { id: p.resumeLessonId } })
          : null,
      ),
  ]);

  const weakGrammar = await prisma.grammarTopic.findMany({
    where: {
      id: { in: snapshot.mistakePatterns.map((p) => p.grammarTopicId).filter((id): id is string => !!id) },
    },
  });

  const recommendations = recommend({
    snapshot,
    hasPlacement: Boolean(placement),
    nextLesson: nextLesson
      ? {
          id: nextLesson.id,
          slug: nextLesson.slug,
          title: nextLesson.title,
          estimatedMinutes: nextLesson.estimatedMinutes,
        }
      : null,
    resumeLesson: resume ? { id: resume.id, slug: resume.slug, title: resume.title } : null,
    weakGrammar: weakGrammar.map((t) => ({ id: t.id, slug: t.slug, title: t.title })),
  });

  return {
    headline: progressHeadline(snapshot),
    level: snapshot.level,
    overall: overallScore(snapshot.skills),
    courseProgress: progress?.overallProgress ?? 0,
    streak: snapshot.currentStreak,
    xp: snapshot.xp,
    wordsDue: snapshot.wordsDue,
    hasPlacement: Boolean(placement),
    continueLesson: resume
      ? { slug: resume.slug, title: resume.title }
      : nextLesson
        ? { slug: nextLesson.slug, title: nextLesson.title }
        : null,
    weakAreas: findWeakAreas(snapshot),
    recommendations,
    advancement: readyToAdvance({
      levelCompletion: progress?.overallProgress ?? 0,
      skills: snapshot.skills,
    }),
  };
}

/** Today's session, generated once per day and then reused. */
export async function getDailySession(userId: string, regenerate = false) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const date = localDateKey(new Date(), user.timezone);

  const existing = await prisma.dailySession.findUnique({
    where: { userId_date: { userId, date } },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  if (existing && !regenerate) return existing;
  if (existing && regenerate) {
    await prisma.dailySession.delete({ where: { id: existing.id } });
  }

  const snapshot = await buildSnapshot(userId);
  const nextLesson = await getNextLesson(userId);

  // Today's grammar focus: the topic behind the learner's strongest mistake
  // pattern if there is one, otherwise the next unstudied topic at their level.
  const weakTopicId = snapshot.mistakePatterns.find((p) => p.grammarTopicId)?.grammarTopicId;
  const grammarTopic = weakTopicId
    ? await prisma.grammarTopic.findUnique({ where: { id: weakTopicId } })
    : await nextUnstudiedGrammar(userId, snapshot.level);

  const availableNewWords = await prisma.vocabularyWord.count({
    where: {
      levelCode: snapshot.level,
      progress: { none: { userId } },
    },
  });

  const plan = generateDailyPlan({
    snapshot,
    targetMinutes: user.dailyTimeBudget,
    nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
    grammarTopic: grammarTopic ? { id: grammarTopic.id, title: grammarTopic.title } : null,
    wordsDue: snapshot.wordsDue,
    newWordsAvailable: availableNewWords,
    newWordsTarget: user.newWordsPerDay ?? undefined,
  });

  return prisma.dailySession.create({
    data: {
      userId,
      date,
      targetMinutes: plan.targetMinutes,
      totalItems: plan.items.length,
      items: {
        create: plan.items.map((item) => ({
          kind: item.kind,
          title: item.title,
          rationale: item.rationale,
          quantity: item.quantity ?? null,
          minutes: item.minutes,
          orderIndex: item.orderIndex,
          lessonId: item.lessonId ?? null,
          grammarTopicId: item.grammarTopicId ?? null,
        })),
      },
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });
}

export async function completeDailyItem(userId: string, itemId: string) {
  const item = await prisma.dailySessionItem.findFirstOrThrow({
    where: { id: itemId, session: { userId } },
    include: { session: true },
  });

  if (!item.completed) {
    await prisma.dailySessionItem.update({ where: { id: itemId }, data: { completed: true } });
  }

  const completedItems = await prisma.dailySessionItem.count({
    where: { sessionId: item.sessionId, completed: true },
  });
  const done = completedItems >= item.session.totalItems;

  return prisma.dailySession.update({
    where: { id: item.sessionId },
    data: {
      completedItems,
      status: done ? "completed" : "in_progress",
      completedAt: done ? new Date() : null,
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });
}

async function nextUnstudiedGrammar(userId: string, level: string) {
  return prisma.grammarTopic.findFirst({
    where: {
      levelCode: level,
      OR: [{ progress: { none: { userId } } }, { progress: { some: { userId, mastery: { lt: 60 } } } }],
    },
    orderBy: { orderIndex: "asc" },
  });
}
