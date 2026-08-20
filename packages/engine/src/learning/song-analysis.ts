import { foldAccents, normalizeApostrophes, tokenizeWords } from "../core/text.js";

/**
 * Song analysis — what a set of lyric lines contains, expressed as facts.
 *
 * Pure and input-agnostic by design. The caller passes lines in and gets a
 * description out; this module never learns where the lines came from, never
 * keeps them, and returns nothing that includes them. That is what lets the
 * result be stored, cached and sent to a client when the lines themselves
 * cannot be.
 *
 * The pedagogy this serves: a learner's honest question about a song is not
 * "what are the words" (they can read those on the platform they are playing
 * it on) but "can I handle this one yet, and what do I need to know first".
 * Those are answerable from counts, coverage and pace.
 */

export interface SongAnalysisInput {
  lines: string[];
  /** Per-line start times in seconds, when the source had synced lyrics. */
  timings?: number[] | null;
  durationSeconds?: number | null;
  /**
   * Words the learner already knows, lowercased and accent-folded by the
   * caller's own normalisation — matching happens on folded forms because a
   * learner who knows "cancion" knows "canción".
   */
  knownWords: Set<string>;
}

export interface SongWordCount {
  /** The surface form as it appears in the song. */
  word: string;
  occurrences: number;
}

export interface SongAnalysis {
  /** Distinct word forms in the song. */
  distinctWords: number;
  totalWords: number;
  /** Share of running words the learner already knows, 0–1. */
  coverage: number;
  /** Unknown forms, most frequent first — the study list for this song. */
  newWords: SongWordCount[];
  /** Sung words per second, from the synced timings. Null without them. */
  pace: number | null;
  /** How much of the song is repeated material, 0–1. */
  repetition: number;
  /** Forms showing colloquial contraction — recognise, don't reproduce. */
  elisions: SongWordCount[];
  /** Overall listening difficulty, from coverage and pace together. */
  difficulty: "accessible" | "moderate" | "hard";
}

/**
 * Colloquial contractions common across Caribbean and Andalusian Spanish.
 *
 * These matter more here than in any other content source in the app. A song
 * is often a learner's first exposure to Spanish as actually spoken rather
 * than as written, and reggaetón in particular is dense with dropped
 * consonants. A learner who cannot map the sung form back to the written one
 * hears an unknown word and concludes the song is beyond them, when in fact
 * they know it perfectly well in its full form.
 *
 * So these are surfaced as their own category rather than mixed into the new
 * words: the learner is told to *recognise* them, and told the standard form,
 * and specifically not taught to produce them. Letting them into the SRS deck
 * as if they were ordinary vocabulary would be actively harmful — it would
 * train a beginner to write "pa'" in an exam.
 */
const ELISION_PATTERNS: { pattern: RegExp; standard: (form: string) => string }[] = [
  // -ado -> -ao (cansao, enamorao). Very common in this register.
  { pattern: /[\p{L}\p{M}]{3,}ao$/u, standard: (f) => f.slice(0, -2) + "ado" },
  // -ido -> -ío (perdio with an accent). Guarded hard by NEVER_ELIDED below,
  // because standard Spanish is full of ordinary words ending this way.
  { pattern: /[\p{L}\p{M}]{3,}ío$/u, standard: (f) => f.slice(0, -2) + "ido" },
];

/**
 * Contractions whose full form cannot be derived, only known.
 *
 * The general rule below recovers a dropped final -s, which covers most of
 * this register. These are the ones where something larger was eaten and no
 * rule reaches it: "pa'" is not "pas", it is "para".
 */
const CONTRACTIONS = new Map<string, string>([
  ["pa'", "para"],
  ["pa'l", "para el"],
  ["to'", "todo"],
  ["toa'", "toda"],
  ["na'", "nada"],
  ["vo'", "voy"],
  ["e'", "es"],
  ["po'", "por"],
  ["ta'", "está"],
  ["'ta", "está"],
  ["'tá", "está"],
  ["'toy", "estoy"],
  ["'tamos", "estamos"],
  ["usté'", "usted"],
  ["verdá'", "verdad"],
  ["ciudá'", "ciudad"],
  ["na'a", "nada"],
]);

/**
 * Standard words that merely look elided, and must never be flagged.
 *
 * The two rules above are shape-based, and Spanish has plenty of ordinary
 * words with those shapes: "frío", "mío", "río", "bacalao" are not contractions
 * of anything. Without this guard the analyser reports "frío -> frido", which
 * is not merely embarrassing — a flagged word is taken out of the coverage
 * count and out of the study list, so a genuine A1 word would silently never
 * be taught and the percentage shown to the learner would be wrong.
 *
 * Which sets the bias for this whole detector: **when unsure, do not flag.**
 * A missed contraction degrades to being glossed as ordinary vocabulary, which
 * is mildly redundant and harmless. A false positive hides a real word behind
 * a fabricated "standard form". The errors are not remotely symmetric, so the
 * rules stay narrow and this list stays generous.
 */
const NEVER_ELIDED = new Set(
  (
    "frío mío río lío tío envío confío desafío vacío rocío navío gentío sombrío umbrío judío " +
    "impío brío estío hastío albedrío atavío extravío escalofrío poderío señorío mujerío " +
    "caserío plantío regadío bravío tardío crío guío fío espío varío amplío enfrío resfrío " +
    "bacalao cacao sarao nao bilbao macao curacao grao"
  )
    .split(" ")
    // Folded at construction because the lookup folds too — comparing a folded
    // input against accented entries silently never matches, which is exactly
    // the bug this list was added to fix.
    .map(foldAccents),
);

const FUNCTION_WORDS = new Set(
  (
    "el la los las un una unos unas de del a al y e o u que se lo le les me te nos os " +
    "en con por para sin sobre entre hasta desde como más muy no si sí ya pero mi tu su " +
    "mis tus sus yo tú él ella usted nosotros ellos ellas es son era eso esa este esta"
  ).split(" "),
);

export function analyseSong(input: SongAnalysisInput): SongAnalysis {
  const { lines, timings, durationSeconds, knownWords } = input;

  const counts = new Map<string, { word: string; occurrences: number }>();
  let totalWords = 0;

  for (const line of lines) {
    for (const token of tokenizeWords(normalizeApostrophes(line))) {
      const surface = token.toLowerCase();
      totalWords += 1;
      const existing = counts.get(surface);
      if (existing) existing.occurrences += 1;
      else counts.set(surface, { word: surface, occurrences: 1 });
    }
  }

  const elisions: SongWordCount[] = [];
  const newWords: SongWordCount[] = [];
  let knownRunningWords = 0;

  for (const entry of counts.values()) {
    const folded = foldAccents(entry.word);
    const elided = detectElision(entry.word);

    if (elided) {
      elisions.push(entry);
      // An elision whose standard form the learner knows is not a gap in their
      // vocabulary — it is a gap in their ear. Counting it as unknown would
      // understate coverage badly on exactly the songs they can most nearly
      // follow.
      if (knownWords.has(foldAccents(elided))) knownRunningWords += entry.occurrences;
      continue;
    }

    if (FUNCTION_WORDS.has(folded) || knownWords.has(folded)) {
      knownRunningWords += entry.occurrences;
      continue;
    }

    newWords.push(entry);
  }

  newWords.sort((a, b) => b.occurrences - a.occurrences || a.word.localeCompare(b.word));
  elisions.sort((a, b) => b.occurrences - a.occurrences || a.word.localeCompare(b.word));

  const coverage = totalWords > 0 ? knownRunningWords / totalWords : 0;
  const pace = computePace(totalWords, timings, durationSeconds);
  const repetition = computeRepetition(lines);

  return {
    distinctWords: counts.size,
    totalWords,
    coverage,
    newWords,
    pace,
    repetition,
    elisions,
    difficulty: gradeDifficulty(coverage, pace),
  };
}

/**
 * The standard form of a contracted token, or null when it is not one.
 *
 * Order matters: the known-contraction table is consulted before any rule,
 * because the rules would confidently produce a wrong answer for exactly the
 * forms the table exists to catch.
 */
export function detectElision(word: string): string | null {
  const form = normalizeApostrophes(word.toLowerCase());

  const known = CONTRACTIONS.get(form);
  if (known) return known;

  if (NEVER_ELIDED.has(foldAccents(form))) return null;

  // A leading apostrophe eats an unstressed opening syllable, nearly always
  // "es-" ('tar, 'toy, 'perando).
  if (form.startsWith("'") && form.length >= 3) {
    return "es" + form.slice(1);
  }

  // A trailing apostrophe is overwhelmingly a dropped final -s: vamo', tenemo',
  // lo', má'. Anything larger than that is in the table above.
  if (form.endsWith("'") && form.length >= 4) {
    return form.slice(0, -1) + "s";
  }

  for (const { pattern, standard } of ELISION_PATTERNS) {
    if (pattern.test(form)) {
      const full = standard(form);
      if (full.length >= 4) return full;
    }
  }

  return null;
}

/**
 * Words per second over the sung portion.
 *
 * Measured between the first and last timestamp rather than across the track
 * duration, because intros, instrumental breaks and outros are silence as far
 * as the listener's decoding load goes. A three-minute song with ninety
 * seconds of production is not slow; it is short.
 */
function computePace(
  totalWords: number,
  timings: number[] | null | undefined,
  durationSeconds: number | null | undefined,
): number | null {
  if (!timings || timings.length < 2) return null;

  const first = timings[0]!;
  const last = timings[timings.length - 1]!;
  const sungSpan = last - first;
  if (sungSpan <= 0) return null;

  // The final line has no end timestamp, so the span understates by one line's
  // worth. Adding the mean gap is closer than ignoring it.
  const meanGap = sungSpan / (timings.length - 1);
  const span = Math.min(sungSpan + meanGap, durationSeconds ?? Number.POSITIVE_INFINITY);

  return totalWords / span;
}

/** Share of lines that are repeats — the chorus, mostly. */
function computeRepetition(lines: string[]): number {
  if (lines.length === 0) return 0;
  const seen = new Set<string>();
  let repeats = 0;
  for (const line of lines) {
    const key = foldAccents(line.toLowerCase());
    if (seen.has(key)) repeats += 1;
    else seen.add(key);
  }
  return repeats / lines.length;
}

/**
 * Coverage and pace interact rather than add.
 *
 * A song can be trivially easy on paper and unfollowable by ear: knowing every
 * word does not help when they arrive at five a second. Reggaetón is routinely
 * both — high-frequency vocabulary delivered far too fast for a B1 ear. So
 * pace can pull a well-covered song up a grade, and only a genuinely slow
 * delivery can rescue a poorly-covered one.
 */
function gradeDifficulty(coverage: number, pace: number | null): SongAnalysis["difficulty"] {
  const fast = pace != null && pace > 3.2;
  const slow = pace != null && pace < 1.8;

  if (coverage >= 0.85) return fast ? "moderate" : "accessible";
  if (coverage >= 0.6) return fast ? "hard" : "moderate";
  return slow ? "moderate" : "hard";
}

/**
 * Parse an LRC file into parallel line and timestamp arrays.
 *
 * One quirk worth handling: a line may carry several timestamps when the same
 * words recur (a chorus is usually stored once with a tag per repetition), so
 * each tag becomes its own entry. Getting this wrong would undercount the
 * chorus, and the chorus is where the repetition — the thing that makes songs
 * teach — actually lives.
 */
export function parseLrc(lrc: string): { lines: string[]; timings: number[] } {
  const entries: { time: number; text: string }[] = [];

  for (const raw of lrc.split(/\r?\n/)) {
    const tags = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (tags.length === 0) continue;

    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = Number(tag[1]);
      const seconds = Number(tag[2]);
      const fraction = tag[3] ? Number(tag[3]) / 10 ** tag[3].length : 0;
      entries.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }

  entries.sort((a, b) => a.time - b.time);
  return { lines: entries.map((e) => e.text), timings: entries.map((e) => e.time) };
}
