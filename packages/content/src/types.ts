import type { CefrLevel } from "@lingoza/engine";

/**
 * Authoring types for the curriculum.
 *
 * Content is written as plain data and loaded into the database by the seed
 * script. Keeping it in the repo (rather than only in the database) means the
 * curriculum is reviewable in diffs — a lesson that teaches something wrong is
 * a code review comment, not a production data fix.
 */

export interface VocabularyEntry {
  spanish: string;
  english: string;
  pronunciation: string;
  exampleSentence: string;
  exampleTranslation: string;
  difficulty: number;
  levelCode: CefrLevel;
  topic: string;
  partOfSpeech: string;
  gender?: "m" | "f" | "mf" | null;
  pluralForm?: string | null;
  frequencyRank?: number;
  region?: "es-ES" | "es-419" | null;
  regionalVariant?: string | null;
  synonyms?: string[];
  antonyms?: string[];
  related?: string[];
}

export interface GrammarExampleEntry {
  spanish: string;
  english: string;
  note?: string;
  realWorld?: boolean;
}

export interface CommonMistakeEntry {
  wrong: string;
  right: string;
  explanation: string;
}

export interface GrammarTopicEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  category: string;
  explanation: string;
  whenToUse: string;
  formula: string;
  examples: GrammarExampleEntry[];
  mistakes: CommonMistakeEntry[];
}

export interface ContrastRowEntry {
  dimension: string;
  sideA: string;
  sideB: string;
  exampleA: string;
  exampleB: string;
}

export interface GrammarContrastEntry {
  slug: string;
  title: string;
  summary: string;
  detail: string;
  topicASlug: string;
  labelA: string;
  topicBSlug: string;
  labelB: string;
  rows: ContrastRowEntry[];
}

export interface QuestionEntry {
  kind: "multiple_choice" | "fill_blank" | "translate" | "word_order" | "true_false" | "short_answer";
  prompt: string;
  context?: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  hint?: string;
  /** Multiple-choice options. The correct one must appear here too. */
  options?: { text: string; feedback?: string }[];
  points?: number;
}

export interface ExerciseEntry {
  title: string;
  kind: string;
  prompt: string;
  section: "practice" | "test" | "review";
  grammarSlug?: string;
  questions: QuestionEntry[];
}

export interface ListeningSegmentEntry {
  speaker?: string;
  spanish: string;
  english: string;
}

export interface ListeningEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  format: "conversation" | "interview" | "news" | "podcast" | "announcement" | "monologue";
  speed: "slow" | "normal" | "native";
  accent: string;
  region: string;
  intro?: string;
  segments: ListeningSegmentEntry[];
  questions?: QuestionEntry[];
}

export interface ReadingEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  genre: "dialogue" | "story" | "article" | "interview" | "essay" | "literature" | "opinion" | "academic";
  intro?: string;
  body: string;
  source?: string;
  glossary?: { term: string; meaning: string; note?: string }[];
  questions?: QuestionEntry[];
}

export interface SpeakingPromptEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  instruction: string;
  targetText?: string;
  focusSounds?: string[];
  mode: "repeat" | "respond" | "describe" | "roleplay" | "freeform";
}

export interface WritingPromptEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  instruction: string;
  minWords: number;
  maxWords: number;
  targetStructures?: string[];
}

export interface LessonEntry {
  slug: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  explanation: string;
  review: string;
  culturalNote?: string;
  /** Slugs of lessons that must be completed first. */
  prerequisites?: string[];
  examples?: GrammarExampleEntry[];
  /** Spanish headwords, matched against the vocabulary table. */
  vocabulary?: string[];
  grammar?: string[];
  exercises?: ExerciseEntry[];
  listening?: ListeningEntry[];
  reading?: ReadingEntry[];
  speaking?: SpeakingPromptEntry[];
  writing?: WritingPromptEntry[];
}

export interface ModuleEntry {
  slug: string;
  title: string;
  description: string;
  theme: string;
  icon: string;
  lessons: LessonEntry[];
}

export interface CourseEntry {
  slug: string;
  title: string;
  description: string;
  levelCode: CefrLevel;
  modules: ModuleEntry[];
}

export interface PlacementQuestionEntry {
  section: "vocabulary" | "grammar" | "reading" | "listening" | "sentence_construction" | "speaking";
  levelCode: CefrLevel;
  prompt: string;
  context?: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  audioText?: string;
  options?: string[];
}

export interface CultureNoteEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  region: "spain" | "latin_america" | "both";
  topic: "food" | "music" | "film" | "history" | "tradition" | "slang" | "daily_life" | "language";
  place?: string;
  body: string;
}

export interface ScenarioEntry {
  slug: string;
  title: string;
  levelCode: CefrLevel;
  setting: string;
  goal: string;
  tutorRole: string;
  icon: string;
  usefulPhrases: string[];
}

// ─── Memory hooks ────────────────────────────────────────────────────────────

export type MnemonicKindEntry =
  | "keyword"
  | "acronym"
  | "story"
  | "gender"
  | "etymology"
  | "contrast";

/** A curated hook for a grammar structure. */
export interface GrammarMnemonicEntry {
  grammarSlug: string;
  kind: MnemonicKindEntry;
  /** The memorable line itself. */
  hook: string;
  imagery?: string;
  explanation?: string;
}

/** A curated hook for a single word, keyed by its Spanish headword. */
export interface WordMnemonicEntry {
  spanish: string;
  kind: MnemonicKindEntry;
  hook: string;
  /** The English sound-alike, for keyword mnemonics. */
  keyword?: string;
  imagery?: string;
  explanation?: string;
}
