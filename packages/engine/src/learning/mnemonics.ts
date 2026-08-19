import type { CefrLevel } from "../core/types.js";
import { foldAccents, normalize } from "../core/text.js";
import { clamp } from "./srs.js";

/**
 * Memory hooks.
 *
 * Two things about mnemonics are well established and both shape this design:
 *
 *  1. The **keyword method** (an L1 sound-alike plus a vivid image) measurably
 *     beats rote repetition for *initial* acquisition of foreign vocabulary.
 *  2. What drives long-term *retention* is retrieval practice and spacing, not
 *     the hook itself.
 *
 * So a hook is a scaffold, and this module treats it as one:
 *
 *  - It is never shown before the learner has attempted recall, because
 *    revealing it first removes the retrieval attempt that does the real work.
 *  - It **fades**: once a word is genuinely known, the hook stops being
 *    offered, so the learner recalls the word directly instead of routing
 *    through an increasingly long chain of associations.
 */

export type MnemonicKind =
  /** L1 sound-alike plus an image — the classic keyword method. */
  | "keyword"
  /** An acronym or initialism covering a rule set (DOCTOR, WEIRDO). */
  | "acronym"
  /** A short vivid scene tying several items together. */
  | "story"
  /** A hook for arbitrary grammatical gender. */
  | "gender"
  /** Where the word came from — often the most durable hook of all. */
  | "etymology"
  /** A way of telling two confusable items apart. */
  | "contrast";

export type MnemonicScope = "word" | "grammar";

export interface Mnemonic {
  id: string;
  kind: MnemonicKind;
  scope: MnemonicScope;
  /** The hook itself, shown prominently. */
  hook: string;
  /** The image or scene to picture. Optional for acronyms. */
  imagery?: string | null;
  /** Why it works / how to apply it. */
  explanation?: string | null;
  /** The English sound-alike, for keyword mnemonics. */
  keyword?: string | null;
  /** null for curated hooks shared by everyone; set for personal ones. */
  userId?: string | null;
  /** "curated" | "ai" — shown to the learner so nothing is passed off as human-written. */
  origin: "curated" | "ai";
  helpfulCount: number;
  unhelpfulCount: number;
}

/**
 * Above this strength a word is known well enough that the hook is more
 * hindrance than help, and is no longer offered by default.
 */
export const FADE_THRESHOLD = 0.7;

export interface OfferContext {
  /** 0–1 SRS strength for this item. */
  strength: number;
  /** Whether the learner has already attempted recall in this session. */
  attempted: boolean;
  /** Times the learner has failed this item. A lapse re-earns the hook. */
  lapses: number;
  /** The learner explicitly asked for it — always honour that. */
  requested?: boolean;
}

export interface OfferDecision {
  show: boolean;
  /** Offer the *button* without auto-expanding. */
  offer: boolean;
  reason: string;
}

/**
 * Decide whether to show a hook, offer it, or stay out of the way.
 *
 * The ordering here is the pedagogy: an unattempted item never gets a hook,
 * because the recall attempt is the part that builds memory.
 */
export function shouldOfferMnemonic(context: OfferContext): OfferDecision {
  const { strength, attempted, lapses, requested = false } = context;

  if (requested) {
    return { show: true, offer: true, reason: "You asked for it." };
  }

  if (!attempted) {
    return {
      show: false,
      offer: false,
      reason: "Try to recall it first — the attempt is what builds the memory, even when it fails.",
    };
  }

  // A word that keeps being forgotten has earned its scaffold back.
  if (lapses >= 2) {
    return {
      show: true,
      offer: true,
      reason: "This one keeps slipping, so here is a hook for it.",
    };
  }

  if (strength >= FADE_THRESHOLD) {
    return {
      show: false,
      offer: true,
      reason: "You know this well now — recalling it directly is stronger than going via a hook.",
    };
  }

  return { show: true, offer: true, reason: "Still bedding in." };
}

/**
 * Rank the available hooks for an item.
 *
 * A learner's own hook wins: self-generated imagery is more memorable than
 * someone else's, which is the consistent finding in the generation-effect
 * literature. After that, community helpfulness decides.
 */
export function rankMnemonics(mnemonics: Mnemonic[], userId: string): Mnemonic[] {
  return [...mnemonics].sort((a, b) => score(b, userId) - score(a, userId));
}

function score(mnemonic: Mnemonic, userId: string): number {
  let value = 0;
  if (mnemonic.userId === userId) value += 100;
  if (mnemonic.origin === "curated") value += 20;

  const votes = mnemonic.helpfulCount + mnemonic.unhelpfulCount;
  if (votes > 0) {
    // Wilson-ish shrinkage: three helpful votes out of three should not
    // outrank ninety out of a hundred.
    value += (mnemonic.helpfulCount / votes) * 30 * (votes / (votes + 5));
  }
  // A hook nobody finds useful should sink rather than be silently deleted.
  if (mnemonic.unhelpfulCount > mnemonic.helpfulCount + 3) value -= 50;

  return value;
}

export interface MnemonicQuality {
  ok: boolean;
  problems: string[];
  /** 0–1 rough confidence that this hook will actually help. */
  score: number;
}

/**
 * Sanity-check a keyword mnemonic before it reaches a learner.
 *
 * Generated hooks fail in predictable ways — the "sound-alike" shares no sounds
 * with the Spanish word, the image is abstract rather than picturable, or the
 * hook simply restates the translation. None of those help anyone, and a bad
 * hook is worse than none because it costs effort to learn and then misleads.
 */
export function assessKeywordMnemonic(input: {
  spanish: string;
  english: string;
  keyword: string;
  imagery: string;
}): MnemonicQuality {
  const problems: string[] = [];
  const spanish = foldAccents(input.spanish).replace(/^(el|la|los|las)\s+/, "");
  const keyword = foldAccents(input.keyword);
  const imagery = normalize(input.imagery);

  if (!keyword) {
    problems.push("No keyword given.");
  } else if (!sharesOnset(spanish, keyword)) {
    // The keyword must actually sound like the start of the Spanish word,
    // otherwise it is not a retrieval cue — it is a second thing to remember.
    problems.push(
      `"${input.keyword}" does not sound like the start of "${input.spanish}", so it gives nothing to retrieve from.`,
    );
  }

  if (imagery.length < 15) {
    problems.push("The image is too thin to be memorable.");
  }

  if (!imagery.includes(normalize(input.english).split(" ")[0] ?? "")) {
    problems.push("The image does not contain the meaning, so it links to nothing.");
  }

  // A hook that is just the translation restated teaches nothing.
  if (normalize(input.imagery) === normalize(input.english)) {
    problems.push("The hook merely restates the translation.");
  }

  const score = clamp(1 - problems.length * 0.34, 0, 1);
  return { ok: problems.length === 0, problems, score };
}

/**
 * Do two words share enough of an opening sound to work as a cue?
 *
 * Compares the first consonant-vowel run rather than exact prefixes, so
 * "cab" cues "caballo" and "sopa" cues "soap" without demanding identity.
 */
function sharesOnset(spanish: string, keyword: string): boolean {
  const strip = (value: string) => value.replace(/[^a-z]/g, "");
  const a = strip(spanish);
  const b = strip(keyword);
  if (!a || !b) return false;

  // Any shared opening of two or more characters counts.
  const shortest = Math.min(a.length, b.length, 4);
  for (let length = shortest; length >= 2; length--) {
    if (a.slice(0, length) === b.slice(0, length)) return true;
  }

  // Or the keyword appears whole inside the Spanish word ("soap" in "sopa"
  // fails above but "sopa"/"soap" share their consonant skeleton).
  if (b.length >= 3 && a.includes(b.slice(0, 3))) return true;

  // Consonant skeletons matching is a decent proxy for "sounds like".
  const skeleton = (value: string) => value.replace(/[aeiou]/g, "");
  const sa = skeleton(a).slice(0, 3);
  const sb = skeleton(b).slice(0, 3);
  return sa.length >= 2 && sa === sb;
}

/** Guidance shown alongside a hook, so learners use it correctly. */
export const MNEMONIC_COACHING: Record<MnemonicKind, string> = {
  keyword:
    "Picture the scene for a few seconds — the more absurd and vivid, the better it sticks. Then try to recall the word without it.",
  acronym:
    "Say the acronym to yourself while you decide. After a week or two you will find you are applying the rule without needing it.",
  story: "Run the scene once in your head, then rebuild it from memory.",
  gender:
    "Always store the noun with its article. The hook is a backstop for when you have forgotten which one it was.",
  etymology:
    "Knowing where a word came from links it to words you already know, which is why this kind of hook lasts longest.",
  contrast:
    "Use this only at the moment of choosing between the two. Once the choice feels automatic, drop it.",
};

/** Which levels a curated grammar hook applies to, for filtering. */
export interface GrammarMnemonicMeta {
  grammarSlug: string;
  levelCode: CefrLevel;
}
