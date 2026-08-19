import { CEFR_LEVELS, type CefrLevel } from "./types.js";

/** Numeric position of a level, A1 = 0 … C2 = 5. */
export function levelIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function isCefrLevel(value: string): value is CefrLevel {
  return (CEFR_LEVELS as readonly string[]).includes(value);
}

export function parseLevel(value: string | null | undefined, fallback: CefrLevel = "A1"): CefrLevel {
  return value && isCefrLevel(value) ? value : fallback;
}

export function nextLevel(level: CefrLevel): CefrLevel | null {
  return CEFR_LEVELS[levelIndex(level) + 1] ?? null;
}

export function previousLevel(level: CefrLevel): CefrLevel | null {
  const i = levelIndex(level);
  return i > 0 ? (CEFR_LEVELS[i - 1] ?? null) : null;
}

/** Levels at or below `level` — the material a learner is assumed to know. */
export function levelsUpTo(level: CefrLevel): CefrLevel[] {
  return CEFR_LEVELS.slice(0, levelIndex(level) + 1);
}

export function compareLevels(a: CefrLevel, b: CefrLevel): number {
  return levelIndex(a) - levelIndex(b);
}

/**
 * Levels whose content is appropriate to serve right now: the current level
 * plus one below (for consolidation). Anything higher is withheld so learners
 * are not shown vocabulary and structures they have no scaffolding for (§23).
 */
export function servableLevels(level: CefrLevel): CefrLevel[] {
  const below = previousLevel(level);
  return below ? [below, level] : [level];
}

export const LEVEL_DESCRIPTIONS: Record<CefrLevel, { name: string; canDo: string }> = {
  A1: {
    name: "Complete Beginner",
    canDo:
      "Understand and use everyday expressions and very basic phrases. Introduce yourself, ask and answer simple personal questions, and interact if the other person speaks slowly.",
  },
  A2: {
    name: "Elementary",
    canDo:
      "Understand sentences about immediate relevance — family, shopping, work, local geography. Handle simple, routine exchanges and describe your background and surroundings.",
  },
  B1: {
    name: "Intermediate",
    canDo:
      "Deal with most situations that arise while travelling. Produce connected text on familiar topics, describe experiences and ambitions, and give brief reasons for opinions.",
  },
  B2: {
    name: "Upper Intermediate",
    canDo:
      "Understand the main ideas of complex text, interact with fluency and spontaneity, and write clear, detailed text explaining a viewpoint with its advantages and disadvantages.",
  },
  C1: {
    name: "Advanced",
    canDo:
      "Understand demanding, longer texts and recognise implicit meaning. Express yourself fluently and use language flexibly for social, academic and professional purposes.",
  },
  C2: {
    name: "Mastery",
    canDo:
      "Understand virtually everything heard or read, summarise from different sources, and express yourself spontaneously with precision and fine shades of meaning.",
  },
};

/**
 * Register guidance handed to the AI tutor and evaluators so their language
 * tracks the learner rather than overwhelming them (§7, §8).
 */
export const LEVEL_REGISTER: Record<CefrLevel, string> = {
  A1: "Use only present tense, the most common 500 words, and very short sentences. Speak slowly and simply. Prefer concrete nouns and avoid idioms entirely.",
  A2: "Use present, preterite and near future. Keep sentences short. Common connectors (y, pero, porque) only. Introduce very common set phrases.",
  B1: "Use all indicative tenses plus the conditional. Normal sentence length, some subordination, everyday idioms explained in passing.",
  B2: "Use the full indicative and subjunctive range. Natural pace and connectors, idiomatic phrasing, and abstract topics with nuance.",
  C1: "Speak as to an educated adult: complex subordination, register shifts, cultural and literary references, precise vocabulary.",
  C2: "Speak entirely naturally, including regionalisms, humour, irony, and specialised terminology, with no simplification.",
};
