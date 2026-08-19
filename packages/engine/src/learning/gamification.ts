import { clamp } from "./srs.js";

/**
 * Gamification (§16) — deliberately restrained.
 *
 * XP, streaks, levels and achievements, with no mechanics that would reward
 * activity over learning. There are no gems, no leaderboards and no loss
 * mechanics; a streak that has lapsed is reported plainly and rebuilt.
 */

/** XP needed to reach each player level. Quadratic, so progress slows sanely. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * (level - 1) ** 1.6);
}

export function playerLevelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 200) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
}

export function levelProgressFromXp(xp: number): LevelProgress {
  const level = playerLevelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  return {
    level,
    xpIntoLevel: xp - floor,
    xpForNextLevel: ceiling - xp,
    progress: clamp(((xp - floor) / span) * 100, 0, 100),
  };
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

export interface StreakUpdate extends StreakState {
  /** True when today's activity extended the streak (first time today). */
  extended: boolean;
  /** True when a previous streak was broken by this update. */
  broken: boolean;
  message: string;
}

/**
 * Update a streak given today's date key. Idempotent within a day: studying
 * twice on Tuesday does not make it a two-day streak.
 */
export function updateStreak(state: StreakState, todayKey: string): StreakUpdate {
  const { lastStudyDate } = state;

  if (lastStudyDate === todayKey) {
    return { ...state, extended: false, broken: false, message: streakMessage(state.currentStreak) };
  }

  const yesterdayKey = shiftDateKey(todayKey, -1);

  if (lastStudyDate === yesterdayKey) {
    const currentStreak = state.currentStreak + 1;
    return {
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
      lastStudyDate: todayKey,
      extended: true,
      broken: false,
      message: streakMessage(currentStreak),
    };
  }

  const broken = state.currentStreak > 1 && lastStudyDate !== null;
  return {
    currentStreak: 1,
    longestStreak: Math.max(state.longestStreak, 1),
    lastStudyDate: todayKey,
    extended: true,
    broken,
    message: broken
      ? `Streak restarted. Your record is ${state.longestStreak} days — you can get there again.`
      : "Day 1. See you tomorrow.",
  };
}

function streakMessage(days: number): string {
  if (days >= 365) return `${days} days. That is a year of Spanish.`;
  if (days >= 100) return `${days} days straight.`;
  if (days >= 30) return `${days} days — this is a habit now.`;
  if (days >= 7) return `${days} days in a row.`;
  return `Day ${days}.`;
}

/** Shift a YYYY-MM-DD key by whole days without timezone drift. */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenKeys(a: string, b: string): number {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/** XP awarded for activities other than quizzes (which score their own). */
export const XP_REWARDS = {
  vocabularyReview: 2,
  newWord: 3,
  lessonSection: 5,
  lessonComplete: 40,
  listeningComplete: 15,
  readingComplete: 15,
  speakingAttempt: 12,
  writingAttempt: 20,
  conversationTurn: 3,
  dailyGoalMet: 30,
} as const;

export interface AchievementRule {
  slug: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  category: "streak" | "vocabulary" | "lessons" | "skill" | "milestone";
  condition: string;
}

/**
 * The achievement set. Conditions are stored as short expressions so they can
 * be evaluated identically by the API and displayed in the UI.
 */
export const ACHIEVEMENTS: AchievementRule[] = [
  { slug: "first-lesson", title: "Primeros pasos", description: "Complete your first lesson.", icon: "Footprints", xpReward: 25, category: "lessons", condition: "lessons_completed>=1" },
  { slug: "ten-lessons", title: "Getting serious", description: "Complete 10 lessons.", icon: "BookOpen", xpReward: 50, category: "lessons", condition: "lessons_completed>=10" },
  { slug: "fifty-lessons", title: "Halfway to fluent", description: "Complete 50 lessons.", icon: "GraduationCap", xpReward: 150, category: "lessons", condition: "lessons_completed>=50" },
  { slug: "streak-3", title: "Three in a row", description: "Study three days running.", icon: "Flame", xpReward: 20, category: "streak", condition: "current_streak>=3" },
  { slug: "streak-7", title: "Una semana", description: "A full week without missing a day.", icon: "Flame", xpReward: 60, category: "streak", condition: "current_streak>=7" },
  { slug: "streak-30", title: "Un mes", description: "Thirty consecutive days.", icon: "Flame", xpReward: 200, category: "streak", condition: "current_streak>=30" },
  { slug: "streak-100", title: "Cien días", description: "One hundred consecutive days.", icon: "Trophy", xpReward: 500, category: "streak", condition: "current_streak>=100" },
  { slug: "words-100", title: "Cien palabras", description: "Learn 100 words.", icon: "Sparkles", xpReward: 50, category: "vocabulary", condition: "words_learned>=100" },
  { slug: "words-500", title: "Quinientas palabras", description: "Learn 500 words.", icon: "Library", xpReward: 150, category: "vocabulary", condition: "words_learned>=500" },
  { slug: "words-1000", title: "Mil palabras", description: "Learn 1,000 words — enough for most daily conversation.", icon: "Library", xpReward: 300, category: "vocabulary", condition: "words_learned>=1000" },
  { slug: "mastered-100", title: "Locked in", description: "Master 100 words in long-term memory.", icon: "Brain", xpReward: 200, category: "vocabulary", condition: "words_mastered>=100" },
  { slug: "first-conversation", title: "Primera conversación", description: "Hold your first conversation with the tutor.", icon: "MessageCircle", xpReward: 30, category: "milestone", condition: "conversations>=1" },
  { slug: "speaking-60", title: "Finding your voice", description: "Reach 60% on speaking.", icon: "Mic", xpReward: 100, category: "skill", condition: "speaking_score>=60" },
  { slug: "listening-60", title: "Tuned in", description: "Reach 60% on listening.", icon: "Headphones", xpReward: 100, category: "skill", condition: "listening_score>=60" },
  { slug: "writing-60", title: "On paper", description: "Reach 60% on writing.", icon: "PenLine", xpReward: 100, category: "skill", condition: "writing_score>=60" },
  { slug: "level-a2", title: "A2 reached", description: "Advance to A2.", icon: "TrendingUp", xpReward: 200, category: "milestone", condition: "level_index>=1" },
  { slug: "level-b1", title: "B1 reached", description: "Advance to B1 — you are now an independent user.", icon: "TrendingUp", xpReward: 400, category: "milestone", condition: "level_index>=2" },
  { slug: "level-b2", title: "B2 reached", description: "Advance to B2.", icon: "TrendingUp", xpReward: 600, category: "milestone", condition: "level_index>=3" },
  { slug: "level-c1", title: "C1 reached", description: "Advance to C1 — advanced proficiency.", icon: "Crown", xpReward: 1000, category: "milestone", condition: "level_index>=4" },
  { slug: "perfect-quiz", title: "Sin errores", description: "Score 100% on a lesson test.", icon: "Target", xpReward: 40, category: "milestone", condition: "perfect_quizzes>=1" },
  { slug: "study-600", title: "Ten hours in", description: "Study for ten hours in total.", icon: "Clock", xpReward: 150, category: "milestone", condition: "study_minutes>=600" },
];

export type AchievementFacts = Record<string, number>;

/** Evaluate a stored condition such as "current_streak>=7" against the facts. */
export function evaluateCondition(condition: string, facts: AchievementFacts): boolean {
  const match = condition.match(/^([a-z_]+)\s*(>=|<=|>|<|==)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return false;
  const [, key, operator, rawValue] = match;
  const actual = facts[key ?? ""] ?? 0;
  const expected = Number(rawValue);
  switch (operator) {
    case ">=": return actual >= expected;
    case "<=": return actual <= expected;
    case ">": return actual > expected;
    case "<": return actual < expected;
    case "==": return actual === expected;
    default: return false;
  }
}

/** Which achievements are newly earned, given the facts and what is held. */
export function newlyUnlocked(
  facts: AchievementFacts,
  alreadyUnlocked: Set<string>,
): AchievementRule[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.has(a.slug) && evaluateCondition(a.condition, facts),
  );
}
