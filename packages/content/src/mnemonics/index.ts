import type { GrammarMnemonicEntry, WordMnemonicEntry } from "../types.js";
import { GRAMMAR_MNEMONICS } from "./grammar.js";
import { WORD_MNEMONICS } from "./vocabulary.js";

export { GRAMMAR_MNEMONICS } from "./grammar.js";
export { WORD_MNEMONICS } from "./vocabulary.js";

/**
 * Curated memory hooks (§ mnemonics).
 *
 * Coverage is intentionally partial: hooks are authored where they earn their
 * keep — grammar rule-sets, false friends, arbitrary gender and words with no
 * phonetic handle. Everything else is generated per learner on request, which
 * is also better pedagogy, since a self-generated image outperforms a borrowed
 * one.
 */
export function grammarMnemonicsFor(slug: string): GrammarMnemonicEntry[] {
  return GRAMMAR_MNEMONICS.filter((m) => m.grammarSlug === slug);
}

export function wordMnemonicsFor(spanish: string): WordMnemonicEntry[] {
  const bare = (value: string) => value.toLowerCase().trim().replace(/^(el|la|los|las)\s+/, "");
  return WORD_MNEMONICS.filter((m) => bare(m.spanish) === bare(spanish));
}
