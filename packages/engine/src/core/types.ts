/**
 * Shared vocabulary of the learning domain.
 *
 * These types are deliberately plain data — no Prisma, no HTTP, no React. The
 * API layer maps database rows onto them, which is what lets the same engine
 * drive the web app, the Telegram bot and a future mobile client.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const SKILLS = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "grammar",
  "vocabulary",
] as const;
export type Skill = (typeof SKILLS)[number];

/** Where an action came from. Progress is identical whichever one it is. */
export type Interface = "web" | "telegram" | "mobile";

export type QuestionKind =
  | "multiple_choice"
  | "fill_blank"
  | "translate"
  | "word_order"
  | "true_false"
  | "short_answer";

export type ExerciseKind =
  | "multiple_choice"
  | "fill_blank"
  | "translate"
  | "word_order"
  | "match"
  | "listening"
  | "reading"
  | "dictation"
  | "speaking"
  | "writing"
  | "conversation";

/** The nine sections every lesson moves through, in order (§3). */
export const LESSON_SECTIONS = [
  "explanation",
  "examples",
  "vocabulary",
  "grammar",
  "listening",
  "practice",
  "speaking",
  "test",
  "review",
] as const;
export type LessonSection = (typeof LESSON_SECTIONS)[number];

export type VocabularyStatus = "new" | "learning" | "review" | "mastered";
export type GrammarStatus = "not_started" | "learning" | "practised" | "mastered";
export type LessonStatus = "not_started" | "in_progress" | "completed";

export type PlacementSection =
  | "vocabulary"
  | "grammar"
  | "reading"
  | "listening"
  | "sentence_construction"
  | "speaking";

export type TutorScenario =
  | "casual"
  | "travel"
  | "restaurant"
  | "job_interview"
  | "university"
  | "shopping"
  | "dating"
  | "meeting_people"
  | "business"
  | "debate"
  | "free";

export type CorrectionCategory =
  | "grammar"
  | "vocabulary"
  | "spelling"
  | "pronunciation"
  | "structure"
  | "register";

export type Severity = "minor" | "important" | "critical";

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  category: CorrectionCategory;
  severity: Severity;
  /** Stable key so repeated mistakes roll up into one pattern. */
  patternKey?: string;
}

/** Per-skill mastery, each 0–100. */
export type SkillScores = Record<Skill, number>;

export interface LearnerSnapshot {
  userId: string;
  level: CefrLevel;
  skills: SkillScores;
  xp: number;
  currentStreak: number;
  wordsDue: number;
  wordsLearning: number;
  lessonsCompleted: number;
  dailyTimeBudget: number;
  /** Strongest mistake patterns first. */
  mistakePatterns: MistakePatternSummary[];
}

export interface MistakePatternSummary {
  patternKey: string;
  label: string;
  category: CorrectionCategory;
  occurrences: number;
  severity: number;
  grammarTopicId?: string | null;
}

/** SRS state for one learner/word pair. */
export interface ReviewState {
  strength: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  timesSeen: number;
  timesCorrect: number;
  status: VocabularyStatus;
  lastReviewedAt: Date | null;
  dueAt: Date;
}

/**
 * How well the learner recalled an item.
 * again = failed, hard = correct but laboured, good = correct, easy = instant.
 */
export type RecallGrade = "again" | "hard" | "good" | "easy";

export interface AnswerCheck {
  isCorrect: boolean;
  /** 0–1. Near-misses (a missing accent) score high but are still corrected. */
  similarity: number;
  /** Set when the answer was right apart from something worth mentioning. */
  note?: string;
  normalizedGiven: string;
  normalizedExpected: string;
}
