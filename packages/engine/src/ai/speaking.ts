import { LEVEL_REGISTER } from "../core/cefr.js";
import { checkAnswer, countWords, foldAccents, normalize, tokenizeWords } from "../core/text.js";
import { clamp } from "../learning/srs.js";
import type { CefrLevel, Correction } from "../core/types.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";
import { normalizeCorrections } from "./tutor.js";

/**
 * Speaking evaluation (§7).
 *
 * IMPORTANT — what this can and cannot measure.
 *
 * Evaluation runs on the *transcript* produced by speech recognition, plus
 * timing, not on the raw audio waveform. That is enough to judge vocabulary,
 * grammar, sentence structure, and fluency (speech rate, hesitation), and it
 * gives a usable *proxy* for pronunciation: when a learner's rolled R is weak,
 * the recogniser mishears "perro" as "pero", and that substitution is a real
 * signal we can name precisely.
 *
 * It is not true phonetic assessment. A learner with a heavy but intelligible
 * accent can score well here. Genuine scoring needs forced alignment against
 * an acoustic model (Azure Pronunciation Assessment, or a self-hosted
 * Kaldi/MFA pipeline) — `PronunciationBackend` below is the seam where that
 * plugs in. The UI is told which method produced the score so it never
 * overclaims to the learner.
 */

export interface SpeakingEvaluation {
  pronunciationScore: number;
  vocabularyScore: number;
  grammarScore: number;
  fluencyScore: number;
  structureScore: number;
  overallScore: number;
  feedback: string;
  corrections: Correction[];
  /** Specific, per-sound pronunciation notes, e.g. on the rolled R. */
  pronunciationNotes: PronunciationNote[];
  /** How pronunciation was derived, so the UI can qualify the number. */
  pronunciationMethod: "transcript_proxy" | "acoustic";
  transcript: string;
  provider: ProviderName;
}

export interface PronunciationNote {
  sound: string;
  word: string;
  status: "good" | "needs_work";
  advice: string;
}

export interface SpeakingTask {
  level: CefrLevel;
  /** What the learner was asked to do. */
  instruction: string;
  /** The exact Spanish they were asked to say, for repeat/read-aloud drills. */
  targetText?: string;
  transcript: string;
  durationSeconds?: number;
  focusSounds?: string[];
}

/** Seam for a real acoustic scorer. Wire an implementation in the API layer. */
export interface PronunciationBackend {
  scoreAudio(input: { audio: ArrayBuffer; targetText: string }): Promise<{
    score: number;
    notes: PronunciationNote[];
  }>;
}

export async function evaluateSpeaking(
  ai: AiClient,
  task: SpeakingTask,
): Promise<SpeakingEvaluation> {
  const mechanical = analyzeSpeech(task);

  const result = await ai.json<RawSpeakingEvaluation>({
    system: buildSpeakingPrompt(task, mechanical),
    messages: [{ role: "user", content: task.transcript }],
    temperature: 0.3,
    maxTokens: 1200,
  });

  if (!result) return fallbackSpeakingEvaluation(task, mechanical);

  const { data, provider } = result;

  const scores = {
    // Pronunciation stays mechanical: the model is reading a transcript and
    // cannot hear the learner, so asking it to score pronunciation would be
    // inventing a number. The transcript-vs-target analysis is at least real.
    pronunciationScore: mechanical.pronunciationScore,
    vocabularyScore: score(data.vocabulary),
    grammarScore: score(data.grammar),
    fluencyScore: mechanical.fluencyScore,
    structureScore: score(data.structure),
  };

  return {
    ...scores,
    overallScore: average(Object.values(scores)),
    feedback: (data.feedback ?? "").trim() || mechanical.feedback,
    corrections: normalizeCorrections(data.corrections ?? []),
    pronunciationNotes: mechanical.notes,
    pronunciationMethod: "transcript_proxy",
    transcript: task.transcript,
    provider,
  };
}

function buildSpeakingPrompt(task: SpeakingTask, mechanical: MechanicalAnalysis): string {
  return `You are a Spanish tutor assessing what a ${task.level} learner said out loud.

The task: "${task.instruction}"
${task.targetText ? `They were asked to say: "${task.targetText}"` : ""}

You are reading a speech-to-text transcript, so:
- Do NOT comment on pronunciation or accent — you cannot hear them. Pronunciation
  is scored separately.
- Do NOT treat missing punctuation or capitalisation as errors.
- Judge vocabulary, grammar and sentence structure only, against ${task.level}:
${LEVEL_REGISTER[task.level]}

Timing measured: ${mechanical.wordCount} words in ${Math.round(task.durationSeconds ?? 0)}s (${mechanical.wordsPerMinute} wpm).

Give 2–3 sentences of spoken feedback in English. Name what they did well,
then the single most useful fix. If they said something in a way that is
grammatical but not what a Spaniard would actually say, give the natural
version — that is the most valuable feedback at this level.

Respond with ONLY JSON:
{"vocabulary":0,"grammar":0,"structure":0,"feedback":"...",
 "corrections":[{"original":"...","corrected":"...","explanation":"...","category":"grammar","severity":"important"}]}`;
}

interface RawSpeakingEvaluation {
  vocabulary?: number;
  grammar?: number;
  structure?: number;
  feedback?: string;
  corrections?: { original?: string; corrected?: string; explanation?: string; category?: string; severity?: string }[];
}

interface MechanicalAnalysis {
  pronunciationScore: number;
  fluencyScore: number;
  wordsPerMinute: number;
  wordCount: number;
  notes: PronunciationNote[];
  feedback: string;
}

/**
 * Sounds English speakers reliably struggle with, with the substitution the
 * recogniser typically produces when they do.
 */
const SOUND_CHECKS: {
  sound: string;
  label: string;
  test: RegExp;
  /** What the word tends to be misheard as when the sound is not produced. */
  confusion?: (word: string) => string | null;
  advice: string;
  praise: string;
}[] = [
  {
    sound: "rr",
    label: "the rolled R",
    test: /rr|^r/,
    confusion: (w) => (w.includes("rr") ? w.replace("rr", "r") : null),
    advice:
      "Put your tongue tip just behind your top teeth and push air through until it flutters. Practise with 'perro', 'carro', 'rojo'. It takes weeks — that is normal.",
    praise: "Your rolled R came through clearly.",
  },
  {
    sound: "j/g",
    label: "the Spanish J",
    test: /[jg][eiaou]/,
    advice:
      "The Spanish J is further back than the English H — closer to the 'ch' in Scottish 'loch'. Try 'jamón', 'trabajo', 'gente'.",
    praise: "Your J sound was well placed.",
  },
  {
    sound: "ñ",
    label: "ñ",
    test: /ñ/,
    confusion: (w) => (w.includes("ñ") ? w.replace("ñ", "n") : null),
    advice: "ñ is one sound, like the 'ny' in 'canyon' — 'año', 'español', 'mañana'.",
    praise: "Your ñ was clean.",
  },
  {
    sound: "b/v",
    label: "b and v",
    test: /[bv]/,
    advice:
      "In Spanish b and v are the same sound. Between vowels the lips barely touch — 'lavar' and 'labar' sound identical to a native ear.",
    praise: "Good — you are not over-pronouncing the V.",
  },
  {
    sound: "vowels",
    label: "pure vowels",
    test: /[aeiou]/,
    advice:
      "Spanish vowels are short and pure — never glide them the way English does. 'no' is 'no', not 'nou'.",
    praise: "Your vowels stayed clean and short.",
  },
];

/** Everything that can be measured without a language model. */
function analyzeSpeech(task: SpeakingTask): MechanicalAnalysis {
  const { transcript, targetText, durationSeconds = 0, focusSounds = [] } = task;
  const wordCount = countWords(transcript);
  const wordsPerMinute =
    durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;

  const notes: PronunciationNote[] = [];
  let pronunciationScore = 75; // neutral prior when there is nothing to compare

  if (targetText) {
    // Read-aloud drill: compare heard against expected, word by word. A
    // substitution on a word containing a difficult sound is the signal.
    const expected = tokenizeWords(targetText.toLowerCase());
    const heard = tokenizeWords(transcript.toLowerCase());
    const check = checkAnswer(transcript, targetText, { threshold: 0.75 });

    pronunciationScore = clamp(check.similarity * 100, 0, 100);

    const heardSet = new Set(heard.map(foldAccents));
    for (const word of expected) {
      const wasHeard = heardSet.has(foldAccents(word));
      for (const soundCheck of SOUND_CHECKS) {
        if (!soundCheck.test.test(word)) continue;
        if (focusSounds.length > 0 && !focusSounds.includes(soundCheck.sound)) continue;

        if (wasHeard) {
          notes.push({
            sound: soundCheck.sound,
            word,
            status: "good",
            advice: `You pronounced "${word}" correctly. ${soundCheck.praise}`,
          });
        } else {
          notes.push({
            sound: soundCheck.sound,
            word,
            status: "needs_work",
            advice: `"${word}" did not come through. ${soundCheck.advice}`,
          });
        }
        break; // one note per word, on its hardest sound
      }
      if (notes.length >= 5) break;
    }
  } else {
    // Free speech: no target to compare against, so only flag sounds that are
    // present in what they said, as reminders rather than judgements.
    const words = tokenizeWords(transcript.toLowerCase()).slice(0, 40);
    for (const soundCheck of SOUND_CHECKS.slice(0, 3)) {
      const word = words.find((w) => soundCheck.test.test(w));
      if (word) {
        notes.push({
          sound: soundCheck.sound,
          word,
          status: "good",
          advice: `You used ${soundCheck.label} in "${word}". ${soundCheck.advice}`,
        });
      }
    }
  }

  return {
    pronunciationScore,
    fluencyScore: fluencyFrom(wordsPerMinute, wordCount, transcript),
    wordsPerMinute,
    wordCount,
    notes: notes.slice(0, 5),
    feedback: fluencyFeedback(wordsPerMinute, wordCount),
  };
}

/**
 * Fluency from speech rate. Native conversational Spanish runs roughly
 * 130–190 wpm; learners are slower, and that is fine — the score curve is
 * generous below native pace and penalises only genuine halting.
 */
function fluencyFrom(wpm: number, wordCount: number, transcript: string): number {
  if (wordCount === 0) return 0;
  if (wpm === 0) return 60; // no timing available

  let score: number;
  if (wpm >= 120) score = 95;
  else if (wpm >= 90) score = 85;
  else if (wpm >= 65) score = 72;
  else if (wpm >= 45) score = 58;
  else score = 42;

  // Filler words and repetitions suggest hesitation.
  const fillers = (normalize(transcript).match(/\b(eh|em|este|pues|o sea)\b/g) ?? []).length;
  return clamp(score - fillers * 3, 0, 100);
}

function fluencyFeedback(wpm: number, wordCount: number): string {
  if (wordCount === 0) return "Nothing was recorded — check your microphone and try again.";
  if (wpm === 0) return `You said ${wordCount} words.`;
  if (wpm >= 120) return `${wpm} words per minute — that is close to conversational pace.`;
  if (wpm >= 80) return `${wpm} words per minute. Steady; keep pushing for flow over accuracy.`;
  return `${wpm} words per minute. You are still assembling sentences as you speak — that is exactly what more practice fixes.`;
}

export function fallbackSpeakingEvaluation(
  task: SpeakingTask,
  mechanical: MechanicalAnalysis = analyzeSpeech(task),
): SpeakingEvaluation {
  const scores = {
    pronunciationScore: mechanical.pronunciationScore,
    vocabularyScore: clamp(45 + mechanical.wordCount * 1.5, 40, 85),
    grammarScore: 65,
    fluencyScore: mechanical.fluencyScore,
    structureScore: clamp(40 + mechanical.wordCount * 1.2, 40, 85),
  };

  return {
    ...scores,
    overallScore: average(Object.values(scores)),
    feedback: `${mechanical.feedback} Full grammar and vocabulary marking is unavailable right now (the AI service is unreachable), so these scores are provisional.`,
    corrections: [],
    pronunciationNotes: mechanical.notes,
    pronunciationMethod: "transcript_proxy",
    transcript: task.transcript,
    provider: "rules",
  };
}

function score(value: number | undefined): number {
  return clamp(typeof value === "number" ? value : 65, 0, 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return clamp(values.reduce((a, b) => a + b, 0) / values.length, 0, 100);
}
