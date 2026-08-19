import {
  ACHIEVEMENTS,
  emptySkillScores,
  levelProgressFromXp,
  localDateKey,
  newlyUnlocked,
  overallScore,
  parseLevel,
  levelIndex,
  updateSkills,
  updateStreak,
  type CefrLevel,
  type Interface,
  type Skill,
  type SkillScores,
} from "@lingoza/engine";
import { prisma } from "../db.js";

/**
 * Progress recording — the single write path for everything a learner does.
 *
 * Every interface (web, Telegram, mobile) funnels through `recordActivity`, so
 * XP, streaks, skill scores and achievements can never drift between them.
 * This is what "one learning system, three interfaces" means in practice: the
 * bot does not get its own scoring rules, it calls this.
 */

export interface ActivityInput {
  userId: string;
  /** Which skills this activity exercised, each scored 0–100. */
  skills?: Partial<Record<Skill, number>>;
  /** How substantial the activity was; scales how much it moves the average. */
  weight?: number;
  xp?: number;
  minutes?: number;
  activity:
    | "lesson"
    | "vocabulary"
    | "listening"
    | "reading"
    | "writing"
    | "speaking"
    | "tutor"
    | "practice";
  source?: Interface;
}

export interface ActivityResult {
  xpEarned: number;
  totalXp: number;
  playerLevel: number;
  streak: number;
  streakExtended: boolean;
  streakMessage: string;
  unlockedAchievements: { slug: string; title: string; description: string; xpReward: number }[];
  dailyGoalMet: boolean;
}

export async function recordActivity(input: ActivityInput): Promise<ActivityResult> {
  const {
    userId,
    skills = {},
    weight = 1,
    xp = 0,
    minutes = 0,
    activity,
    source = "web",
  } = input;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { progress: true },
  });

  const progress = user.progress ?? (await ensureProgress(userId));
  const today = localDateKey(new Date(), user.timezone);

  // 1. Skill scores — exponential moving averages, computed by the engine.
  const currentSkills: SkillScores = {
    listening: progress.listeningScore,
    speaking: progress.speakingScore,
    reading: progress.readingScore,
    writing: progress.writingScore,
    grammar: progress.grammarScore,
    vocabulary: progress.vocabularyScore,
  };
  const nextSkills = updateSkills(currentSkills, skills, weight);

  // 2. Streak — idempotent within a day, so studying twice does not double it.
  const streak = updateStreak(
    {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastStudyDate: progress.lastStudyDate
        ? localDateKey(progress.lastStudyDate, user.timezone)
        : null,
    },
    today,
  );

  const totalXp = progress.xp + xp;

  const updated = await prisma.userProgress.update({
    where: { userId },
    data: {
      listeningScore: nextSkills.listening,
      speakingScore: nextSkills.speaking,
      readingScore: nextSkills.reading,
      writingScore: nextSkills.writing,
      grammarScore: nextSkills.grammar,
      vocabularyScore: nextSkills.vocabulary,
      xp: totalXp,
      playerLevel: levelProgressFromXp(totalXp).level,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: new Date(),
      totalStudyMinutes: progress.totalStudyMinutes + minutes,
    },
  });

  if (minutes > 0) {
    await prisma.studySession.create({
      data: { userId, activity, minutes, source },
    });
  }

  // 3. Daily goal.
  const goal = await upsertDailyGoal(userId, today, user.dailyTimeBudget, minutes, xp);

  // 4. Achievements.
  const unlocked = await checkAchievements(userId);

  return {
    xpEarned: xp,
    totalXp: updated.xp,
    playerLevel: updated.playerLevel,
    streak: updated.currentStreak,
    streakExtended: streak.extended,
    streakMessage: streak.message,
    unlockedAchievements: unlocked,
    dailyGoalMet: goal.achieved,
  };
}

/**
 * Guarantee a progress row exists for a user.
 *
 * Wrapped in a catch because concurrent callers race: Telegram delivers updates
 * in parallel, and Prisma only compiles an upsert down to an atomic
 * INSERT … ON CONFLICT under conditions that are easy to fall outside of (an
 * empty `update` block is one of them). Rather than depend on that
 * optimisation holding, a losing insert simply reads the row the winner made —
 * which is correct regardless of how Prisma chooses to execute it.
 */
export async function ensureProgress(userId: string) {
  // createMany + skipDuplicates compiles to a single
  // INSERT … ON CONFLICT DO NOTHING, which is genuinely atomic. An upsert
  // would be the obvious choice, but Prisma only lowers it to that form under
  // conditions this call falls outside of (an empty `update` block is one), so
  // it degrades to find-then-create and races — noisily, since the losing
  // insert is logged as an error before any catch can see it.
  await prisma.userProgress.createMany({ data: { userId }, skipDuplicates: true });
  return prisma.userProgress.findUniqueOrThrow({ where: { userId } });
}

async function upsertDailyGoal(
  userId: string,
  date: string,
  targetMinutes: number,
  minutes: number,
  xp: number,
) {
  const existing = await prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date } } });

  const minutesDone = (existing?.minutesDone ?? 0) + minutes;
  const xpEarned = (existing?.xpEarned ?? 0) + xp;
  const achieved = minutesDone >= targetMinutes;

  return prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, targetMinutes, minutesDone, xpEarned, achieved },
    update: { minutesDone, xpEarned, achieved },
  });
}

/**
 * Evaluate every achievement rule against the learner's current facts and
 * award any that are newly met. Awarding also grants the achievement's XP.
 */
export async function checkAchievements(userId: string) {
  const [progress, held, conversations, perfectQuizzes] = await Promise.all([
    prisma.userProgress.findUnique({ where: { userId } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { slug: true } } } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.quizResult.count({ where: { userId, score: 100 } }),
  ]);

  if (!progress) return [];

  const facts: Record<string, number> = {
    lessons_completed: progress.lessonsCompleted,
    current_streak: progress.currentStreak,
    words_learned: progress.wordsLearned,
    words_mastered: progress.wordsMastered,
    speaking_score: progress.speakingScore,
    listening_score: progress.listeningScore,
    writing_score: progress.writingScore,
    reading_score: progress.readingScore,
    grammar_score: progress.grammarScore,
    study_minutes: progress.totalStudyMinutes,
    level_index: levelIndex(parseLevel(progress.currentLevelCode)),
    conversations,
    perfect_quizzes: perfectQuizzes,
  };

  const alreadyHeld = new Set(held.map((h) => h.achievement.slug));
  const newRules = newlyUnlocked(facts, alreadyHeld);
  if (newRules.length === 0) return [];

  const awarded: { slug: string; title: string; description: string; xpReward: number }[] = [];

  for (const rule of newRules) {
    const achievement = await prisma.achievement.findUnique({ where: { slug: rule.slug } });
    if (!achievement) continue;
    try {
      await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
      await prisma.userProgress.update({
        where: { userId },
        data: { xp: { increment: achievement.xpReward } },
      });
      awarded.push({
        slug: rule.slug,
        title: rule.title,
        description: rule.description,
        xpReward: achievement.xpReward,
      });
    } catch {
      // Unique constraint — awarded concurrently by another request. Fine.
    }
  }

  return awarded;
}

/** Recompute the counters that are derived from other tables. */
export async function refreshDerivedCounters(userId: string): Promise<void> {
  const [lessonsCompleted, wordsLearned, wordsMastered, grammarMastered] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId, status: "completed" } }),
    prisma.vocabularyProgress.count({ where: { userId, status: { in: ["learning", "review", "mastered"] } } }),
    prisma.vocabularyProgress.count({ where: { userId, status: "mastered" } }),
    prisma.grammarProgress.count({ where: { userId, status: "mastered" } }),
  ]);

  await prisma.userProgress.update({
    where: { userId },
    data: { lessonsCompleted, wordsLearned, wordsMastered, grammarMastered },
  });
}

export interface DashboardSnapshot {
  level: CefrLevel;
  levelName: string;
  skills: SkillScores;
  overall: number;
  xp: number;
  playerLevel: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgressPercent: number;
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
  wordsLearned: number;
  wordsMastered: number;
  grammarMastered: number;
  totalStudyMinutes: number;
  minutesToday: number;
  dailyTimeBudget: number;
  courseProgress: number;
  wordsDue: number;
}

export async function getDashboard(userId: string): Promise<DashboardSnapshot> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { progress: true },
  });
  const progress = user.progress ?? (await ensureProgress(userId));
  const today = localDateKey(new Date(), user.timezone);

  const [goal, wordsDue] = await Promise.all([
    prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.vocabularyProgress.count({ where: { userId, dueAt: { lte: new Date() } } }),
  ]);

  const skills: SkillScores = {
    listening: progress.listeningScore,
    speaking: progress.speakingScore,
    reading: progress.readingScore,
    writing: progress.writingScore,
    grammar: progress.grammarScore,
    vocabulary: progress.vocabularyScore,
  };

  const level = parseLevel(progress.currentLevelCode);
  const xpLevel = levelProgressFromXp(progress.xp);

  return {
    level,
    levelName: level,
    skills,
    overall: overallScore(skills),
    xp: progress.xp,
    playerLevel: xpLevel.level,
    xpIntoLevel: xpLevel.xpIntoLevel,
    xpForNextLevel: xpLevel.xpForNextLevel,
    levelProgressPercent: xpLevel.progress,
    currentStreak: progress.currentStreak,
    longestStreak: progress.longestStreak,
    lessonsCompleted: progress.lessonsCompleted,
    wordsLearned: progress.wordsLearned,
    wordsMastered: progress.wordsMastered,
    grammarMastered: progress.grammarMastered,
    totalStudyMinutes: progress.totalStudyMinutes,
    minutesToday: goal?.minutesDone ?? 0,
    dailyTimeBudget: user.dailyTimeBudget,
    courseProgress: progress.overallProgress,
    wordsDue,
  };
}

export function emptySkills(): SkillScores {
  return emptySkillScores();
}

/** Achievement catalogue with which ones this learner holds. */
export async function listAchievements(userId: string) {
  const held = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });
  const heldBySlug = new Map(held.map((h) => [h.achievement.slug, h.unlockedAt]));

  return ACHIEVEMENTS.map((rule) => ({
    ...rule,
    unlocked: heldBySlug.has(rule.slug),
    unlockedAt: heldBySlug.get(rule.slug) ?? null,
  }));
}
