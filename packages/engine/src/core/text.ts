import type { AnswerCheck } from "./types.js";

/**
 * Spanish-aware text handling used everywhere answers are compared.
 *
 * Marking a learner wrong because they typed "esta" instead of "está" on a
 * vocabulary drill is discouraging and pedagogically useless — the engine
 * accepts the answer and mentions the accent instead.
 */

/** Lowercase, strip punctuation and collapse whitespace, keeping accents. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[¡!¿?.,;:"'`´()\[\]{}…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize and additionally fold accents, so "esta" matches "está".
 *
 * ñ is deliberately preserved: it is a distinct letter of the Spanish
 * alphabet, not an accented n — "año" and "ano" are different words, and
 * quietly equating them would teach the learner something false.
 */
export function foldAccents(input: string): string {
  const NTILDE = "\u0001"; // sentinel that cannot occur in learner input
  return normalize(input)
    .replaceAll("ñ", NTILDE)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll(NTILDE, "ñ");
}

/** Strip a leading article so "el perro" matches "perro". */
export function stripArticle(input: string): string {
  return input.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, "");
}

/** Levenshtein distance, capped for performance on long texts. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length] ?? 0;
}

/** 0–1 similarity derived from edit distance. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - editDistance(a, b) / longest;
}

export interface CheckOptions {
  /** Extra answers that are also correct. */
  accepted?: string[];
  /** Ignore a missing/incorrect accent, but say so. Default true. */
  forgiveAccents?: boolean;
  /** Ignore a leading article. Default true for single-word answers. */
  forgiveArticles?: boolean;
  /** Below this similarity the answer is wrong outright. Default 0.86. */
  threshold?: number;
}

/**
 * Compare a learner's answer against the expected one.
 *
 * The order matters: exact → accent-folded → article-stripped → fuzzy. Each
 * fallback that succeeds attaches a note, so the learner still learns what the
 * precise form was.
 */
export function checkAnswer(
  given: string,
  expected: string,
  options: CheckOptions = {},
): AnswerCheck {
  const {
    accepted = [],
    forgiveAccents = true,
    forgiveArticles = true,
    threshold = 0.86,
  } = options;

  const normalizedGiven = normalize(given);
  const normalizedExpected = normalize(expected);
  const candidates = [expected, ...accepted].map(normalize).filter(Boolean);

  const base = { normalizedGiven, normalizedExpected };

  if (!normalizedGiven) {
    return { ...base, isCorrect: false, similarity: 0 };
  }

  // Exact match against any accepted form.
  if (candidates.includes(normalizedGiven)) {
    return { ...base, isCorrect: true, similarity: 1 };
  }

  // Accent-insensitive match — correct, but worth flagging.
  if (forgiveAccents) {
    const foldedGiven = foldAccents(given);
    const hit = candidates.find((c) => foldAccents(c) === foldedGiven);
    if (hit) {
      return {
        ...base,
        isCorrect: true,
        similarity: 0.97,
        note: `Careful with the accent — it is written "${expected}".`,
      };
    }
  }

  // Article-insensitive match for short answers.
  const isShort = normalizedExpected.split(" ").length <= 2;
  if (forgiveArticles && isShort) {
    const strippedGiven = stripArticle(foldAccents(given));
    const hit = candidates.find((c) => stripArticle(foldAccents(c)) === strippedGiven);
    if (hit) {
      const expectsArticle = /^(el|la|los|las|un|una)\s/i.test(normalizedExpected);
      return {
        ...base,
        isCorrect: true,
        similarity: 0.95,
        note: expectsArticle
          ? `Right — and learn it with its article: "${expected}". The article tells you the gender.`
          : undefined,
      };
    }
  }

  // Fuzzy match to catch typos, on the accent-folded forms.
  const best = candidates.reduce(
    (acc, c) => Math.max(acc, similarity(foldAccents(given), foldAccents(c))),
    0,
  );

  if (best >= threshold) {
    return {
      ...base,
      isCorrect: true,
      similarity: best,
      note: `Small slip — the exact spelling is "${expected}".`,
    };
  }

  return { ...base, isCorrect: false, similarity: best };
}

/** Check a word-order exercise where the learner arranges tokens. */
export function checkWordOrder(given: string[], expected: string): AnswerCheck {
  return checkAnswer(given.join(" "), expected, { threshold: 0.94 });
}

/** Split Spanish text into sentences, keeping ¿…? and ¡…! intact. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+(?=[¡¿A-ZÁÉÍÓÚÑ])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Tokenise into clickable words, preserving the original for lookup. */
export function tokenizeWords(text: string): string[] {
  return text.match(/[\p{L}\p{M}'-]+/gu) ?? [];
}

export function countWords(text: string): number {
  return tokenizeWords(text).length;
}
