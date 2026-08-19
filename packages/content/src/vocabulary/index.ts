import type { CefrLevel } from "@lingoza/engine";
import type { VocabularyEntry } from "../types.js";
import { expand } from "./row.js";
import { A1_ROWS } from "./a1.js";
import { A2_ROWS } from "./a2.js";
import { B1_ROWS } from "./b1.js";
import { B2_ROWS } from "./b2.js";
import { C1_ROWS } from "./c1.js";
import { C2_ROWS } from "./c2.js";

/**
 * The vocabulary store.
 *
 * Ordered by frequency within each level, because frequency order *is* the
 * pedagogy: the first 1,000 Spanish words cover roughly 85% of everyday
 * speech, so teaching "el bolígrafo" before "poder" wastes a beginner's time
 * (§23). `frequencyRank` is assigned from position in these lists, and the
 * starting ranks below keep each level's words in their true global order.
 */
export const VOCABULARY: VocabularyEntry[] = [
  ...expand(A1_ROWS, "A1", 1),
  ...expand(A2_ROWS, "A2", 200),
  ...expand(B1_ROWS, "B1", 900),
  ...expand(B2_ROWS, "B2", 1800),
  ...expand(C1_ROWS, "C1", 3200),
  ...expand(C2_ROWS, "C2", 6000),
];

export function vocabularyByLevel(level: CefrLevel): VocabularyEntry[] {
  return VOCABULARY.filter((word) => word.levelCode === level);
}

export function vocabularyByTopic(topic: string): VocabularyEntry[] {
  return VOCABULARY.filter((word) => word.topic === topic);
}

/** Look a word up by headword, tolerating a missing or extra article. */
export function findWord(spanish: string): VocabularyEntry | undefined {
  const target = spanish.toLowerCase().trim();
  const bare = (value: string) => value.toLowerCase().replace(/^(el|la|los|las)\s+/, "");
  return (
    VOCABULARY.find((word) => word.spanish.toLowerCase() === target) ??
    VOCABULARY.find((word) => bare(word.spanish) === bare(target))
  );
}

export { pluralize, expand, type Row } from "./row.js";
