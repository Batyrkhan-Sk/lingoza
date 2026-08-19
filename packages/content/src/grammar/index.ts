import type { CefrLevel } from "@lingoza/engine";
import type { GrammarContrastEntry, GrammarTopicEntry } from "../types.js";
import { A1_TOPICS } from "./a1.js";
import { A2_TOPICS } from "./a2.js";
import { B1_TOPICS } from "./b1.js";
import { B2_TOPICS } from "./b2.js";
import { C1C2_TOPICS } from "./c1c2.js";
import { GRAMMAR_CONTRASTS } from "./contrasts.js";

/**
 * The grammar syllabus (§5).
 *
 * Ordered strictly from basic to advanced — position in this array *is* the
 * teaching order, and `orderIndex` is derived from it at seed time. Every topic
 * carries the same four things a learner actually needs: what it means, when it
 * is used, the pattern, and the mistakes people really make, because a rule
 * without its typical error is a rule that gets misapplied.
 */
export const GRAMMAR_TOPICS: GrammarTopicEntry[] = [
  ...A1_TOPICS,
  ...A2_TOPICS,
  ...B1_TOPICS,
  ...B2_TOPICS,
  ...C1C2_TOPICS,
];

export { GRAMMAR_CONTRASTS };

export function grammarByLevel(level: CefrLevel): GrammarTopicEntry[] {
  return GRAMMAR_TOPICS.filter((topic) => topic.levelCode === level);
}

export function findGrammarTopic(slug: string): GrammarTopicEntry | undefined {
  return GRAMMAR_TOPICS.find((topic) => topic.slug === slug);
}

/** Contrasts that involve a given topic, from either side. */
export function contrastsForTopic(slug: string): GrammarContrastEntry[] {
  return GRAMMAR_CONTRASTS.filter((c) => c.topicASlug === slug || c.topicBSlug === slug);
}
