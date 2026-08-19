import { LEVEL_REGISTER } from "../core/cefr.js";
import { countWords, normalize } from "../core/text.js";
import { clamp } from "../learning/srs.js";
import type { CefrLevel, Correction } from "../core/types.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";
import { normalizeCorrections } from "./tutor.js";

/**
 * Writing evaluation (§10).
 *
 * Grades the six dimensions the spec asks for, returns corrections with
 * explanations, and rewrites the text as a native would put it — the rewrite is
 * usually the most instructive part, because it shows the gap between correct
 * Spanish and natural Spanish.
 */

export interface WritingEvaluation {
  grammarScore: number;
  vocabularyScore: number;
  structureScore: number;
  coherenceScore: number;
  naturalnessScore: number;
  spellingScore: number;
  overallScore: number;
  feedback: string;
  improvedVersion: string;
  corrections: Correction[];
  wordCount: number;
  provider: ProviderName;
}

export interface WritingTask {
  level: CefrLevel;
  instruction: string;
  text: string;
  minWords?: number;
  maxWords?: number;
  targetStructures?: string[];
}

export async function evaluateWriting(ai: AiClient, task: WritingTask): Promise<WritingEvaluation> {
  const wordCount = countWords(task.text);

  const result = await ai.json<RawWritingEvaluation>({
    system: buildWritingPrompt(task),
    messages: [{ role: "user", content: task.text }],
    temperature: 0.3,
    maxTokens: 1600,
  });

  if (!result) return fallbackWritingEvaluation(task, wordCount);

  const { data, provider } = result;
  const scores = {
    grammarScore: score(data.grammar),
    vocabularyScore: score(data.vocabulary),
    structureScore: score(data.structure),
    coherenceScore: score(data.coherence),
    naturalnessScore: score(data.naturalness),
    spellingScore: score(data.spelling),
  };

  return {
    ...scores,
    overallScore: average(Object.values(scores)),
    feedback: (data.feedback ?? "").trim() || "Keep writing — regular practice is what moves this score.",
    improvedVersion: (data.improvedVersion ?? "").trim(),
    corrections: normalizeCorrections(data.corrections ?? []),
    wordCount,
    provider,
  };
}

function buildWritingPrompt(task: WritingTask): string {
  const { level, instruction, minWords, maxWords, targetStructures = [] } = task;

  return `You are an experienced Spanish teacher marking a ${level} learner's written work.

The task they were given: "${instruction}"
${minWords ? `Expected length: ${minWords}–${maxWords ?? minWords * 3} words.` : ""}
${targetStructures.length > 0 ? `They were asked to use: ${targetStructures.join(", ")}.` : ""}

Mark against ${level} expectations, not native-speaker expectations:
${LEVEL_REGISTER[level]}

Score each dimension 0–100:
- grammar: verb forms, agreement, prepositions, articles
- vocabulary: range and precision for the level
- structure: sentence construction and connectors
- coherence: does it hold together and address the task
- naturalness: does it read like Spanish or like translated English
- spelling: orthography and accents

Then:
- List the mistakes worth teaching (at most 6, most important first). Skip
  trivia the learner cannot yet be expected to know at ${level}.
- Rewrite their text as a native speaker at their level would have written it,
  keeping their ideas and their voice — do not substitute your own content.
- Write 2–4 sentences of feedback in English: what worked, then the single most
  valuable thing to fix next. Be specific and encouraging, never generic.

Respond with ONLY JSON:
{
  "grammar": 0, "vocabulary": 0, "structure": 0, "coherence": 0,
  "naturalness": 0, "spelling": 0,
  "feedback": "...",
  "improvedVersion": "...",
  "corrections": [{"original":"...","corrected":"...","explanation":"...","category":"grammar","severity":"important"}]
}`;
}

interface RawWritingEvaluation {
  grammar?: number;
  vocabulary?: number;
  structure?: number;
  coherence?: number;
  naturalness?: number;
  spelling?: number;
  feedback?: string;
  improvedVersion?: string;
  corrections?: { original?: string; corrected?: string; explanation?: string; category?: string; severity?: string }[];
}

/**
 * Rule-based fallback.
 *
 * It cannot judge coherence or naturalness, so it does not claim to: those
 * come back as a neutral score and the feedback says explicitly that a full
 * assessment is pending. What it *can* check mechanically — length, spelling
 * against a list of frequent learner errors, missing punctuation, sentence
 * variety — it does check.
 */
export function fallbackWritingEvaluation(task: WritingTask, wordCount: number): WritingEvaluation {
  const corrections = mechanicalChecks(task.text);
  const lengthOk = !task.minWords || wordCount >= task.minWords;

  const spellingScore = clamp(100 - corrections.filter((c) => c.category === "spelling").length * 12, 40, 100);
  const grammarScore = clamp(100 - corrections.filter((c) => c.category === "grammar").length * 15, 40, 100);
  const lengthScore = lengthOk ? 100 : clamp((wordCount / (task.minWords ?? 1)) * 100, 20, 99);

  const scores = {
    grammarScore,
    vocabularyScore: clamp(50 + lexicalVariety(task.text) * 50, 40, 95),
    structureScore: clamp(40 + sentenceVariety(task.text) * 60, 40, 95),
    coherenceScore: lengthScore * 0.7,
    naturalnessScore: 60,
    spellingScore,
  };

  return {
    ...scores,
    overallScore: average(Object.values(scores)),
    feedback: [
      lengthOk
        ? `You wrote ${wordCount} words, which meets the task.`
        : `You wrote ${wordCount} words; the task asked for at least ${task.minWords}. Length matters here because the structures being practised only appear in longer text.`,
      corrections.length > 0
        ? `${corrections.length} mechanical issue${corrections.length === 1 ? "" : "s"} flagged below.`
        : "No mechanical errors detected.",
      "Detailed marking is unavailable right now (the AI service is unreachable), so these scores are provisional.",
    ].join(" "),
    improvedVersion: "",
    corrections,
    wordCount,
    provider: "rules",
  };
}

/** Frequent, mechanically detectable learner errors. */
const MECHANICAL_RULES: { pattern: RegExp; correct: (m: RegExpMatchArray) => string; explanation: string; category: Correction["category"] }[] = [
  { pattern: /\byo\s+(soy|tengo|quiero|voy)\s+(\w+)\s+años\b/gi, correct: () => "tengo … años", explanation: "Age uses tener, not ser: 'tengo 20 años'.", category: "grammar" },
  { pattern: /\bsoy\s+(\d+)\s*años?\b/gi, correct: (m) => `tengo ${m[1]} años`, explanation: "Spanish says 'I have X years', not 'I am X years'.", category: "grammar" },
  { pattern: /\bestoy\s+(estudiante|profesor|médico|ingeniero)\b/gi, correct: (m) => `soy ${m[1]}`, explanation: "Professions and identity take ser, not estar.", category: "grammar" },
  { pattern: /\bes\s+(cansado|enfermo|contento)\b/gi, correct: (m) => `está ${m[1]}`, explanation: "Temporary states take estar, not ser.", category: "grammar" },
  { pattern: /(?<![¿?])\b(qué|dónde|cómo|cuándo|por qué|quién)\b[^?¿.!]*\?/gi, correct: (m) => `¿${m[0]}`, explanation: "Spanish questions open with an inverted ¿.", category: "spelling" },
  { pattern: /\bmuy\s+mucho\b/gi, correct: () => "muchísimo", explanation: "'Muy mucho' is not Spanish — use muchísimo.", category: "vocabulary" },
  { pattern: /\bestoy\s+de\s+acuerdo\s+con\s+que\b/gi, correct: () => "estoy de acuerdo en que", explanation: "The set phrase is 'estar de acuerdo en que'.", category: "grammar" },
  { pattern: /\ben\s+la\s+mañana\b/gi, correct: () => "por la mañana", explanation: "In Spain, 'por la mañana'. ('En la mañana' is normal in Latin America.)", category: "register" },
];

function mechanicalChecks(text: string): Correction[] {
  const corrections: Correction[] = [];

  for (const rule of MECHANICAL_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      corrections.push({
        original: match[0],
        corrected: rule.correct(match),
        explanation: rule.explanation,
        category: rule.category,
        severity: "important",
      });
      if (corrections.length >= 6) return corrections;
    }
  }

  // Missing opening ¡ on exclamations.
  if (/[^¡]\w+!/.test(text) && !text.includes("¡")) {
    corrections.push({
      original: "…!",
      corrected: "¡…!",
      explanation: "Exclamations in Spanish open with ¡ as well as closing with !.",
      category: "spelling",
      severity: "minor",
    });
  }

  return corrections;
}

/** Type–token ratio, a crude proxy for lexical range. */
function lexicalVariety(text: string): number {
  const words = normalize(text).split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  return clamp(new Set(words).size / words.length, 0, 1);
}

/** Rewards a mix of sentence lengths over uniformly short ones. */
function sentenceVariety(text: string): number {
  const lengths = text
    .split(/[.!?…]+/)
    .map((s) => countWords(s))
    .filter((n) => n > 0);
  if (lengths.length < 2) return 0.3;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length;
  return clamp(Math.sqrt(variance) / 8, 0, 1);
}

function score(value: number | undefined): number {
  return clamp(typeof value === "number" ? value : 60, 0, 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return clamp(values.reduce((a, b) => a + b, 0) / values.length, 0, 100);
}
