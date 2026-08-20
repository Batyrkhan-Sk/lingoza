import {
  analyseSong,
  buildSongExercises,
  composeSongWordCards,
  detectElision,
  foldAccents,
  glossSongWords,
  parseLevel,
  stripArticle,
  tokenizeWords,
  XP_REWARDS,
  type CefrLevel,
  type Interface,
  type SongAnalysis,
  type SongExercise,
  type SongGloss,
} from "@lingoza/engine";
import { ai } from "./ai.js";
import { media, recordMediaActivity } from "./authentic.js";
import { recordActivity, refreshDerivedCounters } from "./progress.js";
import { prisma } from "../db.js";

/**
 * Songs as study material.
 *
 * A learner asks for Bad Bunny and wants to know whether they can follow him
 * yet. This answers that, and answers it with the actual song rather than a
 * guess: the lyrics are fetched, measured against what the learner personally
 * knows, and discarded.
 *
 * What crosses the boundary out of this module is {@link SongStudy}, which
 * contains counts, coverage, a vocabulary list and grammar notes — and no
 * lyric lines, by construction. The raw text exists only inside
 * `studySong`'s stack frame. It is not persisted, not cached, not logged and
 * not returned, because the providers behind it (LRCLIB, lyrics.ovh) hold no
 * distribution licence for the publishers' text. The derived summary *is*
 * cached, briefly and in memory — that is the whole point of deriving it, and
 * it is what lets the follow-up buttons work without re-reading the song.
 *
 * The learner still gets the words themselves — on Deezer, via `externalUrl`,
 * where they are licensed. And any single line they cannot crack comes back
 * here through `explainSpanishLine`, which analyses text the learner supplies
 * and needs no licence at all.
 */

export interface SongStudy {
  track: {
    id: number;
    title: string;
    artist: string;
    album: string | null;
    coverUrl: string | null;
    previewUrl: string | null;
    durationSeconds: number;
    externalUrl: string;
  };
  level: CefrLevel;
  analysis: Omit<SongAnalysis, "newWords" | "elisions"> & {
    /** Capped for display; `distinctWords` still reports the true total. */
    newWords: { word: string; occurrences: number }[];
    elisions: { word: string; standard: string; occurrences: number }[];
  };
  /** AI glosses for the new words, when a provider is configured. */
  gloss: SongGloss | null;
  /** Set when the analysis could not run, in the learner's words. */
  message: string | null;
}

/** How many unknown forms to gloss. Beyond this a song is not a study target. */
const MAX_GLOSSED_WORDS = 25;

/**
 * The learner's known vocabulary, as accent-folded surface forms.
 *
 * Deliberately generous about what counts as "known". A curriculum word is
 * stored as a lemma, often with its article ("la canción"), while a song
 * contains inflected forms. Matching only exact forms would report a learner
 * who knows four hundred words as knowing almost nothing about any song,
 * because songs are made of conjugated verbs and plurals. So the article is
 * stripped, multi-word entries contribute each of their tokens, and regular
 * plurals are admitted alongside their singulars.
 *
 * This over-counts slightly — it will credit a learner with a form they have
 * only met in the singular. That is the right error to make here: the number
 * is a "can I attempt this song" signal, not a grade, and understating it
 * would put learners off songs they could in fact follow.
 */
async function knownWordsFor(userId: string): Promise<Set<string>> {
  const rows = await prisma.vocabularyProgress.findMany({
    where: { userId, status: { in: ["learning", "review", "mastered"] } },
    select: { word: { select: { spanish: true } } },
  });

  const known = new Set<string>();
  for (const row of rows) {
    const bare = stripArticle(row.word.spanish.toLowerCase());
    for (const token of tokenizeWords(bare)) {
      const folded = foldAccents(token);
      known.add(folded);
      // Regular plurals, both formations.
      known.add(folded.endsWith("s") ? folded : `${folded}s`);
      if (/[bcdfghjklmnpqrstvwxyz]$/.test(folded)) known.add(`${folded}es`);
    }
  }
  return known;
}

/** Search for tracks — the entry point for a typed query. */
export async function findTracks(query: string) {
  const result = await media.music({ search: query, limit: 5, requirePreview: false });
  return result.items;
}

/**
 * Build the study view for one track.
 *
 * `track` comes from a Deezer search result rather than a free-text string,
 * because both lyrics providers key on artist and title as separate fields.
 * Splitting "Bad Bunny Tití me preguntó" into those two parts is guesswork;
 * Deezer has already done it correctly, along with the duration that LRCLIB
 * matches on.
 */
export async function studySong(
  userId: string,
  trackId: number,
  options: { searchHint?: string; source?: Interface } = {},
): Promise<SongStudy | null> {
  const { searchHint, source = "telegram" } = options;

  const cached = readCache(userId, trackId);
  if (cached) return cached.study;

  // By id, not by re-searching: the learner tapped a specific track, and
  // search ordering can shift between the message and the tap.
  const track =
    (await media.track(trackId)) ??
    (searchHint ? ((await findTracks(searchHint))[0] ?? null) : null);
  if (!track) return null;

  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const level = parseLevel(progress?.currentLevelCode);

  const base: Omit<SongStudy, "analysis" | "gloss" | "message"> = {
    track: {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverUrl: track.coverUrl,
      previewUrl: track.previewUrl,
      durationSeconds: track.durationSeconds,
      externalUrl: track.externalUrl,
    },
    level,
  };

  const empty = (message: string): SongStudy =>
    remember(userId, trackId, {
      ...base,
      analysis: {
        distinctWords: 0,
        totalWords: 0,
        coverage: 0,
        newWords: [],
        elisions: [],
        pace: null,
        repetition: 0,
        difficulty: "moderate",
      },
      gloss: null,
      message,
    });

  // The one place the lyric text exists. It is read by the analyser below and
  // goes out of scope with this function — never stored, never returned.
  const lyrics = await media.lyricsForAnalysis({
    artist: track.artist,
    track: track.title,
    durationSeconds: track.durationSeconds,
  });

  if (!lyrics) {
    return empty(
      "No lyrics found for this track, so I can't break down the vocabulary. " +
        "You can still listen, and send me any line with /explain for a full breakdown.",
    );
  }
  if (lyrics.instrumental || lyrics.lines.length === 0) {
    return empty("This track is instrumental — nothing to read, but good listening.");
  }

  const known = await knownWordsFor(userId);
  const analysis = analyseSong({
    lines: lyrics.lines,
    timings: lyrics.timings,
    durationSeconds: lyrics.durationSeconds,
    knownWords: known,
  });

  const elisions = analysis.elisions.map((e) => ({
    word: e.word,
    standard: detectElision(e.word) ?? e.word,
    occurrences: e.occurrences,
  }));

  // Frequency order matters more than completeness: the words that recur are
  // the ones that unlock the song, and a learner will not work through eighty.
  const glossTargets = analysis.newWords.slice(0, MAX_GLOSSED_WORDS);

  const gloss = ai.enabled
    ? await glossSongWords(ai, {
        words: glossTargets,
        elisions: elisions.slice(0, 12),
        level,
        trackTitle: track.title,
        artist: track.artist,
      })
    : null;

  await recordMediaActivity({ userId, kind: "listening", minutes: 4, source });

  return remember(userId, trackId, {
    ...base,
    analysis: { ...analysis, newWords: glossTargets, elisions },
    gloss,
    message: ai.enabled
      ? null
      : "Word meanings need an AI provider. Add GEMINI_API_KEY to enable them — " +
        "the coverage and grammar figures above are computed locally and are accurate either way.",
  });
}

// ─── The study cache ─────────────────────────────────────────────────────────

/**
 * One learner's most recent song breakdowns, in memory, for half an hour.
 *
 * Cached because everything a learner does *after* the breakdown — take the
 * quiz, keep the words — needs the same analysis, and recomputing it would
 * mean fetching the lyrics a second time and paying for a second gloss on
 * every button press.
 *
 * Only the derived summary is held. The lyric text is not in {@link SongStudy}
 * and cannot be recovered from it, which is exactly the property that makes
 * caching this safe when caching the source would not be.
 *
 * In-process and per-instance: a restart or a second replica costs a learner
 * one recomputation, which is the correct price for not putting this in the
 * database. Keyed by learner as well as track because coverage is personal —
 * the same song reads differently to two people.
 */
interface CacheEntry {
  study: SongStudy;
  /** Filled in on demand by {@link songExercises}, not by the breakdown. */
  exercises?: SongExercise[];
  expires: number;
}

const CACHE_TTL_MS = 30 * 60_000;
const CACHE_LIMIT = 200;
const studyCache = new Map<string, CacheEntry>();

function cacheKey(userId: string, trackId: number): string {
  return `${userId}:${trackId}`;
}

function readCache(userId: string, trackId: number): CacheEntry | null {
  const entry = studyCache.get(cacheKey(userId, trackId));
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    studyCache.delete(cacheKey(userId, trackId));
    return null;
  }
  return entry;
}

function remember(userId: string, trackId: number, study: SongStudy): SongStudy {
  // Oldest-first eviction: Map preserves insertion order, and the entries are
  // all the same size, so the simplest policy is also the right one here.
  if (studyCache.size >= CACHE_LIMIT) {
    const oldest = studyCache.keys().next().value;
    if (oldest) studyCache.delete(oldest);
  }
  studyCache.set(cacheKey(userId, trackId), { study, expires: Date.now() + CACHE_TTL_MS });
  return study;
}

// ─── Practice built from the song ────────────────────────────────────────────

/** How many questions one song is worth. Long enough to stick, short enough to finish. */
const EXERCISE_COUNT = 5;

/**
 * Questions drawn from the song the learner just had broken down.
 *
 * Generated once per breakdown and held with it, so answering question three
 * does not regenerate questions one and two — which would not merely be
 * wasteful but would change them mid-quiz.
 */
export async function songExercises(userId: string, trackId: number): Promise<SongExercise[]> {
  const entry = readCache(userId, trackId) ?? (await refresh(userId, trackId));
  if (!entry) return [];
  if (entry.exercises) return entry.exercises;

  const { study } = entry;
  if (!ai.enabled || !study.gloss) return [];

  const exercises = await buildSongExercises(ai, {
    words: study.gloss.words.map((w) => ({ word: w.word, meaning: w.meaning })),
    grammar: study.gloss.grammar,
    level: study.level,
    count: EXERCISE_COUNT,
    trackTitle: study.track.title,
    artist: study.track.artist,
  });

  entry.exercises = exercises;
  return exercises;
}

/** One question by position, for the callback that carries only an index. */
export async function songExerciseAt(
  userId: string,
  trackId: number,
  index: number,
): Promise<{ exercise: SongExercise | null; total: number }> {
  const exercises = await songExercises(userId, trackId);
  return { exercise: exercises[index] ?? null, total: exercises.length };
}

/**
 * Credit a finished song quiz.
 *
 * Scored as practice rather than listening: the listening minutes were already
 * credited when the breakdown was built, and counting the same song twice
 * would inflate the daily goal.
 */
export async function recordSongQuiz(
  userId: string,
  correct: number,
  total: number,
  source: Interface = "telegram",
): Promise<void> {
  if (total === 0) return;
  await recordActivity({
    userId,
    activity: "practice",
    skills: { vocabulary: Math.round((correct / total) * 100) },
    weight: 0.3,
    xp: correct * XP_REWARDS.vocabularyReview,
    minutes: 3,
    source,
  });
}

// ─── Keeping the words ───────────────────────────────────────────────────────

/** How many of a song's words may enter the deck at once. */
const MAX_SAVED_WORDS = 10;

export interface SavedSongWords {
  added: { spanish: string; english: string }[];
  /** Words already in the learner's reviews — reported, not re-added. */
  already: string[];
  message: string | null;
}

/**
 * How many of this song's words could go into the deck.
 *
 * Lives here rather than in the caller so the interfaces cannot disagree with
 * `saveSongWords` about what the button promises — offering to keep twelve
 * words and then keeping ten is a small lie the learner will notice.
 */
export function keepableWords(study: SongStudy): number {
  return Math.min(study.gloss?.words.length ?? 0, MAX_SAVED_WORDS);
}

/**
 * Put a song's new words into the learner's spaced-repetition deck.
 *
 * This is the step that makes a song a lesson rather than a readout: without
 * it the learner reads twelve glosses, closes the chat, and has learned
 * nothing that will still be there next week.
 *
 * The words become ordinary catalogue entries, so everything downstream —
 * reviews, reminders, memory hooks, the web app — works on them with no
 * special case. Each needs an example sentence to review against, and the one
 * sentence we must not use is the line it was sung in, so the model writes a
 * fresh one. That is a second AI call, made only when the learner commits to
 * the words, rather than a cost paid by everyone who looks at a song.
 *
 * Deliberately outside the daily new-word budget, for the same reason
 * `/vocabulary` additions are: the learner asked for these specific words,
 * which is a different act from being handed today's allocation.
 */
export async function saveSongWords(userId: string, trackId: number): Promise<SavedSongWords> {
  const entry = readCache(userId, trackId) ?? (await refresh(userId, trackId));
  if (!entry) return { added: [], already: [], message: "I no longer have that song's breakdown." };

  const { study } = entry;
  if (!ai.enabled || !study.gloss || study.gloss.words.length === 0) {
    return {
      added: [],
      already: [],
      message: "There are no glossed words to save for this song.",
    };
  }

  const cards = await composeSongWordCards(ai, {
    words: study.gloss.words.slice(0, MAX_SAVED_WORDS).map((w) => ({
      word: w.word,
      meaning: w.meaning,
      lemma: w.lemma,
    })),
    level: study.level,
  });

  if (cards.length === 0) {
    return { added: [], already: [], message: "Couldn't build the cards just now — try again." };
  }

  const added: { spanish: string; english: string }[] = [];
  const already: string[] = [];

  for (const card of cards) {
    // Upsert on the catalogue's own uniqueness — [spanish, levelCode] — so a
    // word already taught by the curriculum is reused rather than duplicated,
    // and the learner's existing progress on it is preserved.
    const word = await prisma.vocabularyWord.upsert({
      where: { spanish_levelCode: { spanish: card.spanish, levelCode: card.level } },
      update: {},
      create: {
        spanish: card.spanish,
        english: card.english,
        pronunciation: card.pronunciation,
        exampleSentence: card.example,
        exampleTranslation: card.exampleTranslation,
        difficulty: card.difficulty,
        levelCode: card.level,
        topic: "music",
        partOfSpeech: card.partOfSpeech,
        gender: card.gender,
      },
    });

    const existing = await prisma.vocabularyProgress.findUnique({
      where: { userId_wordId: { userId, wordId: word.id } },
    });

    if (existing) {
      already.push(word.spanish);
      continue;
    }

    await prisma.vocabularyProgress.create({
      data: { userId, wordId: word.id, dueAt: new Date(), status: "learning" },
    });
    added.push({ spanish: word.spanish, english: word.english });
  }

  await refreshDerivedCounters(userId);

  return { added, already, message: null };
}

/**
 * Rebuild a breakdown that has fallen out of the cache.
 *
 * Half an hour is generous for one sitting but a learner can always come back
 * to yesterday's message and press a button on it. Recomputing silently is
 * better than telling them the song has expired, which would be a confusing
 * thing to read under a song that is plainly still there.
 */
async function refresh(userId: string, trackId: number): Promise<CacheEntry | null> {
  const study = await studySong(userId, trackId);
  if (!study) return null;
  return readCache(userId, trackId);
}
