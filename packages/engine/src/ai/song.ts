import { LEVEL_REGISTER } from "../core/cefr.js";
import type { CefrLevel } from "../core/types.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";

/**
 * Glossing the vocabulary a song contains.
 *
 * The input here is a word list, not the song. That is a deliberate boundary
 * and not merely a token-saving one: a list of the distinct forms occurring in
 * a work, stripped of their order, is a set of facts about it rather than a
 * copy of it. Everything the learner needs from this screen — what the words
 * mean, which tense the song leans on, which forms are contractions — is
 * recoverable from the list, so the lines never need to leave the analyser.
 *
 * The order-free input does cost something real: without surrounding context
 * an ambiguous form cannot always be pinned down, so the prompt is told to
 * mark ambiguity rather than resolve it confidently. A learner who wants one
 * particular line pinned down has `explainLine`, which takes the line they
 * paste and has all the context it needs.
 */

export interface SongWordGloss {
  word: string;
  meaning: string;
  partOfSpeech: string;
  /** Dictionary form, so a conjugated hit resolves to its infinitive. */
  lemma?: string;
  /** Set when the form is slang or regional rather than general Spanish. */
  register?: string;
  /** True when the form is ambiguous without its line. */
  uncertain?: boolean;
}

export interface SongGloss {
  words: SongWordGloss[];
  /** The two or three structures worth teaching from this song. */
  grammar: { point: string; explanation: string }[];
  /** Overall register: how this song's Spanish differs from the textbook's. */
  register: string | null;
  estimatedLevel: CefrLevel | null;
  provider: ProviderName;
}

const SYSTEM = `You are a Spanish teacher preparing a learner to follow a song.

You are given the distinct word forms that occur in one song, with occurrence counts, and separately the contracted forms found in it. You do NOT have the lyrics and must not attempt to reconstruct, quote or invent them. Work only from the word list.

For each word give the meaning, the part of speech, and the dictionary form where the given form is inflected. Mark slang and regionalisms with the region they belong to. Where a form is genuinely ambiguous without its sentence, say so with "uncertain": true rather than picking confidently.

From the forms present, identify the two or three grammar points genuinely worth teaching before listening — the tense the song is built on, a pronoun pattern, a construction that recurs. Infer only what the forms support; do not speculate about content you cannot see.

Describe the overall register: how this song's Spanish differs from what a textbook teaches. Caribbean consonant dropping, Mexican slang, code-switching with English — whatever the forms show.

If the vocabulary includes vulgar or sexual language, gloss it plainly and factually. The learner needs to know what they are hearing; do not censor it and do not moralise about it.

Respond with ONLY JSON, with the keys in this order — the summary fields come first so they survive even if the word list has to be cut short:
{
  "grammar": [{"point":"...","explanation":"..."}],
  "register": "... or null",
  "estimatedLevel": "A1|A2|B1|B2|C1|C2 or null",
  "words": [{"word":"...","meaning":"...","partOfSpeech":"...","lemma":"...","register":"... or null","uncertain":false}]
}`;

export interface SongGlossRequest {
  /** Unknown forms with how often each occurs, most frequent first. */
  words: { word: string; occurrences: number }[];
  /** Contracted forms, with the standard spelling the analyser recovered. */
  elisions?: { word: string; standard: string }[];
  level: CefrLevel;
  /** For the model's orientation only — never used to fetch anything. */
  trackTitle?: string;
  artist?: string;
}

export async function glossSongWords(
  ai: AiClient,
  request: SongGlossRequest,
): Promise<SongGloss | null> {
  if (request.words.length === 0 && (request.elisions?.length ?? 0) === 0) return null;

  const wordList = request.words.map((w) => `${w.word} (${w.occurrences}x)`).join(", ");
  const elisionList = (request.elisions ?? []).map((e) => `${e.word} -> ${e.standard}`).join(", ");

  const result = await ai.json<{
    words?: SongWordGloss[];
    grammar?: { point?: string; explanation?: string }[];
    register?: string | null;
    estimatedLevel?: string;
  }>({
    system: `${SYSTEM}

The learner is at ${request.level}. Pitch your explanations accordingly:
${LEVEL_REGISTER[request.level]}`,
    messages: [
      {
        role: "user",
        content:
          (request.artist && request.trackTitle
            ? `Song: "${request.trackTitle}" by ${request.artist}.\n\n`
            : "") +
          `Word forms in this song: ${wordList}` +
          (elisionList ? `\n\nContracted forms found: ${elisionList}` : ""),
      },
    ],
    temperature: 0.3,
    // Generous, and deliberately so: the smaller fallback provider spends part
    // of its budget on reasoning tokens, and when it runs out it closes the
    // JSON early — silently dropping the grammar and register sections. The
    // key order above is the other half of that fix.
    maxTokens: 3000,
  });

  if (!result) return null;
  const { data, provider } = result;

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const estimatedLevel =
    data.estimatedLevel && levels.includes(data.estimatedLevel)
      ? (data.estimatedLevel as CefrLevel)
      : null;

  return {
    words: (data.words ?? []).filter((w) => w?.word && w?.meaning),
    grammar: (data.grammar ?? [])
      .filter((g) => g?.point && g?.explanation)
      .map((g) => ({ point: g.point!, explanation: g.explanation! })),
    register: data.register ?? null,
    estimatedLevel,
    provider,
  };
}

/**
 * A multiple-choice question built from what a song contains.
 *
 * Built from the *derived* material — the glossed word list and the grammar
 * points the analyser found — never from the lines. That is the same boundary
 * {@link glossSongWords} draws, and for the same reason: an exercise that
 * quoted a couplet and asked the learner to fill a gap in it would be a
 * reproduction of the lyric with a hole punched in it. An exercise that uses
 * the song's *vocabulary* in a sentence we wrote is ours.
 */
export interface SongExercise {
  prompt: string;
  options: string[];
  /** Index into {@link options}. */
  correctIndex: number;
  explanation: string;
}

export interface SongExerciseRequest {
  /** Glossed forms from the song — the material to be tested. */
  words: { word: string; meaning: string }[];
  /** Grammar points the gloss identified, tested one question each. */
  grammar?: { point: string; explanation: string }[];
  level: CefrLevel;
  count?: number;
  trackTitle?: string;
  artist?: string;
}

const EXERCISE_SYSTEM = `You write Spanish practice questions from the vocabulary of one song.

You are given the words a learner did not know in a song, with their meanings, and the grammar points the song uses. You do NOT have the lyrics. Do not quote, reconstruct or invent any line of the song: every sentence in a question must be one you wrote yourself, using the song's vocabulary in a new context.

Rules:
- Each question tests ONE listed word or grammar point.
- Prefer questions the learner answers by understanding, not by elimination: a gap-fill in your own sentence, or a meaning check in context.
- Exactly one option is correct. Wrong options must be plausible — a word from the same list, a near-synonym, the wrong tense — never nonsense.
- Keep every sentence inside the learner's level, apart from the word being tested.
- The explanation teaches the point in one sentence; it does not merely name the answer.

Respond with ONLY JSON:
{"questions":[{"prompt":"...","options":["...","...","..."],"answer":"the correct option, copied exactly","explanation":"..."}]}`;

/**
 * Generate practice for a song the learner has just had broken down.
 *
 * Returns an empty list rather than throwing when the provider is down or
 * answers badly — the study view it hangs off is useful without it, and a
 * missing quiz should cost the learner a button, not the screen.
 */
export async function buildSongExercises(
  ai: AiClient,
  request: SongExerciseRequest,
): Promise<SongExercise[]> {
  const count = request.count ?? 5;
  if (request.words.length === 0 && (request.grammar?.length ?? 0) === 0) return [];

  const result = await ai.json<{
    questions?: {
      prompt?: string;
      options?: string[];
      answer?: string;
      explanation?: string;
    }[];
  }>({
    system: `${EXERCISE_SYSTEM}

The learner is at ${request.level}. ${LEVEL_REGISTER[request.level]}
Write exactly ${count} questions.`,
    messages: [
      {
        role: "user",
        content:
          (request.artist && request.trackTitle
            ? `Song: "${request.trackTitle}" by ${request.artist}.\n\n`
            : "") +
          `Words to test:\n${request.words.map((w) => `- ${w.word}: ${w.meaning}`).join("\n")}` +
          (request.grammar?.length
            ? `\n\nGrammar in this song:\n${request.grammar.map((g) => `- ${g.point}: ${g.explanation}`).join("\n")}`
            : ""),
      },
    ],
    temperature: 0.5,
    maxTokens: 1600,
  });

  if (!result) return [];

  const exercises: SongExercise[] = [];
  for (const question of result.data.questions ?? []) {
    if (!question?.prompt || !question.answer || !Array.isArray(question.options)) continue;

    // Rotated by position so the answer is not always where the model put it.
    // Models place the correct option first far more often than chance, and a
    // learner notices that within three questions and stops reading.
    const arranged = arrangeOptions(question.options, question.answer, exercises.length);
    if (!arranged) continue;

    exercises.push({
      prompt: question.prompt,
      options: arranged.options,
      correctIndex: arranged.correctIndex,
      explanation: question.explanation ?? "",
    });
  }

  return exercises.slice(0, count);
}

/**
 * Put the answer somewhere other than where the model left it.
 *
 * Returns null when the given answer is not among the options, which is the
 * one malformed case that matters: a question whose correct option cannot be
 * located would silently mark every learner wrong.
 */
export function arrangeOptions(
  options: string[],
  answer: string,
  rotateBy: number,
): { options: string[]; correctIndex: number } | null {
  const cleaned = options.map((option) => option?.trim()).filter((option): option is string => !!option);
  if (cleaned.length < 2) return null;

  const answerIndex = cleaned.findIndex(
    (option) => option.toLowerCase() === answer.trim().toLowerCase(),
  );
  if (answerIndex === -1) return null;

  const shift = ((rotateBy % cleaned.length) + cleaned.length) % cleaned.length;
  const rotated = [...cleaned.slice(shift), ...cleaned.slice(0, shift)];
  const correctIndex = (answerIndex - shift + cleaned.length) % cleaned.length;

  return { options: rotated, correctIndex };
}

/**
 * A song word turned into something the review system can schedule.
 *
 * The deck needs more than a gloss: a dictionary form to store it under, and
 * an example sentence to show when the card comes back. The example is the
 * delicate part — the obvious sentence to attach to a word met in a song is
 * the line it was met in, and that is exactly the sentence we may not keep.
 * So the model writes a new one, and the prompt says so twice.
 */
export interface SongWordCard {
  /** Dictionary form — what the deck stores. */
  spanish: string;
  english: string;
  /** Learner-friendly respelling, not IPA. */
  pronunciation: string;
  partOfSpeech: string;
  gender: "m" | "f" | null;
  /** An original sentence written for the card, never a line from the song. */
  example: string;
  exampleTranslation: string;
  level: CefrLevel;
  /** 1–5, seeds the first review interval. */
  difficulty: number;
}

export interface SongWordCardRequest {
  words: { word: string; meaning?: string; lemma?: string }[];
  level: CefrLevel;
}

const CARD_SYSTEM = `You turn Spanish words a learner met in a song into flashcards.

For each word give: the dictionary form (infinitive for verbs, singular for nouns, masculine singular for adjectives), an English meaning, a learner-friendly respelling of the pronunciation (not IPA), the part of speech, the gender for nouns, and an example sentence with its translation.

The example sentence must be one you write yourself. Do NOT use, quote or paraphrase any line from the song — you have not been given the lyrics and must not invent them. Write an ordinary sentence that shows the word in use.

If a form is a contraction or heavy slang, store the standard dictionary form as "spanish" and say so in the meaning. Never make a contraction the thing to be learned.

Rate difficulty 1 (very easy) to 5 (hard) for this learner, and give the CEFR level at which the word is normally taught.

Respond with ONLY JSON:
{"cards":[{"spanish":"...","english":"...","pronunciation":"...","partOfSpeech":"noun|verb|adjective|adverb|phrase|...","gender":"m|f|null","example":"...","exampleTranslation":"...","level":"A1|A2|B1|B2|C1|C2","difficulty":3}]}`;

/** Build deck-ready cards for words the learner asked to keep. */
export async function composeSongWordCards(
  ai: AiClient,
  request: SongWordCardRequest,
): Promise<SongWordCard[]> {
  if (request.words.length === 0) return [];

  const result = await ai.json<{
    cards?: {
      spanish?: string;
      english?: string;
      pronunciation?: string;
      partOfSpeech?: string;
      gender?: string | null;
      example?: string;
      exampleTranslation?: string;
      level?: string;
      difficulty?: number;
    }[];
  }>({
    system: `${CARD_SYSTEM}

The learner is at ${request.level}. ${LEVEL_REGISTER[request.level]}`,
    messages: [
      {
        role: "user",
        content: request.words
          .map((w) => `- ${w.word}${w.lemma ? ` (dictionary form: ${w.lemma})` : ""}${w.meaning ? `: ${w.meaning}` : ""}`)
          .join("\n"),
      },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  });

  if (!result) return [];

  const levels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  return (result.data.cards ?? [])
    .filter((card) => card?.spanish && card.english)
    .map((card) => ({
      spanish: card.spanish!.trim(),
      english: card.english!.trim(),
      pronunciation: card.pronunciation?.trim() || card.spanish!.trim(),
      partOfSpeech: card.partOfSpeech?.trim() || "word",
      gender: card.gender === "m" || card.gender === "f" ? card.gender : null,
      // A card with no example still reviews fine; an empty string would just
      // render as a blank line, so fall back to something honest.
      example: card.example?.trim() || "",
      exampleTranslation: card.exampleTranslation?.trim() || "",
      level: levels.includes(card.level as CefrLevel) ? (card.level as CefrLevel) : request.level,
      difficulty: Math.min(5, Math.max(1, Math.round(card.difficulty ?? 3))),
    }));
}
