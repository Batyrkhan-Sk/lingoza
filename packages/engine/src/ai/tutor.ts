import { LEVEL_REGISTER } from "../core/cefr.js";
import type {
  CefrLevel,
  Correction,
  MistakePatternSummary,
  TutorScenario,
} from "../core/types.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";

/**
 * The AI Spanish tutor (§8).
 *
 * The teaching behaviour is in the prompt, not in the UI: let the learner
 * finish, pick only the mistakes that matter, explain them, model a better
 * version, then carry the conversation on. A tutor that interrupts every
 * missing accent stops being a conversation partner.
 */

export interface TutorTurn {
  /** The tutor's Spanish reply — the conversation continues regardless. */
  reply: string;
  /** English gloss, revealed on demand. */
  translation: string;
  /** Coaching on the learner's last turn; empty when nothing was worth saying. */
  coaching: string;
  corrections: Correction[];
  /** A suggestion of what the learner could say next, to prevent stalling. */
  suggestion?: string;
  provider: ProviderName;
}

export interface TutorContext {
  level: CefrLevel;
  scenario: TutorScenario;
  /** Role the tutor plays, e.g. "a waiter in a Madrid tapas bar". */
  role?: string;
  setting?: string;
  goal?: string;
  /** The learner's standing mistakes, so the tutor can watch for them. */
  mistakePatterns?: MistakePatternSummary[];
  /** Vocabulary recently taught, which the tutor should recycle. */
  recentVocabulary?: string[];
  dialect?: "es-ES" | "es-419";
  learnerName?: string;
}

export const SCENARIO_BRIEFS: Record<TutorScenario, { title: string; brief: string }> = {
  casual: { title: "Casual conversation", brief: "an easy-going chat with a friend about everyday life" },
  travel: { title: "Travel", brief: "helping a traveller navigate transport, directions and plans" },
  restaurant: { title: "Restaurant", brief: "a waiter taking an order in a busy restaurant" },
  job_interview: { title: "Job interview", brief: "an interviewer assessing a candidate professionally but warmly" },
  university: { title: "University", brief: "a fellow student and occasionally an administrator on campus" },
  shopping: { title: "Shopping", brief: "a shop assistant helping with sizes, prices and payment" },
  dating: { title: "Dating", brief: "a friendly first date, keeping things light and respectful" },
  meeting_people: { title: "Meeting new people", brief: "a stranger at a social event making introductions" },
  business: { title: "Business", brief: "a colleague in a professional meeting about work matters" },
  debate: { title: "Debate", brief: "a courteous but firm opponent arguing the other side of a topic" },
  free: { title: "Free conversation", brief: "whatever the learner wants to talk about" },
};

export function buildTutorSystemPrompt(context: TutorContext): string {
  const {
    level,
    scenario,
    role,
    setting,
    goal,
    mistakePatterns = [],
    recentVocabulary = [],
    dialect = "es-ES",
    learnerName,
  } = context;

  const brief = SCENARIO_BRIEFS[scenario];
  const dialectNote =
    dialect === "es-419"
      ? "Use Latin American Spanish: ustedes rather than vosotros, and Latin American vocabulary (carro, computadora, celular)."
      : "Use peninsular Spanish from Spain: vosotros where natural, and Spanish vocabulary (coche, ordenador, móvil).";

  const watchList =
    mistakePatterns.length > 0
      ? `\n\nThis learner repeatedly makes these mistakes — watch for them specifically:\n${mistakePatterns
          .slice(0, 5)
          .map((p) => `- ${p.label} (${p.occurrences} times)`)
          .join("\n")}`
      : "";

  const vocabNote =
    recentVocabulary.length > 0
      ? `\n\nThey have just learned these words. Work them into the conversation naturally where it fits: ${recentVocabulary.slice(0, 15).join(", ")}.`
      : "";

  return `You are a warm, experienced Spanish tutor talking with ${learnerName ?? "a learner"} whose level is ${level}.

You are playing: ${role ?? brief.brief}.
${setting ? `Setting: ${setting}.` : ""}
${goal ? `The learner is trying to: ${goal}.` : ""}

LANGUAGE LEVEL — this matters more than anything else:
${LEVEL_REGISTER[level]}
${dialectNote}

HOW YOU TEACH:
1. Let the learner finish their thought. Never interrupt a turn to correct.
2. Reply in Spanish, in character, and keep the conversation moving. Ask a
   question back so they always have something to respond to.
3. Then, separately, pick AT MOST the two most important mistakes from their
   last message. Important means it obstructs meaning or is a pattern they
   repeat — not a missing accent or a stylistic preference.
4. For each, explain briefly in English WHY it is wrong, and give the natural
   Spanish version.
5. If they made no important mistakes, say nothing about mistakes. Do not
   invent corrections to seem useful, and do not praise every single message.

Keep your Spanish reply to 1–3 sentences at ${level}. Never lecture.${watchList}${vocabNote}

Respond with ONLY a JSON object in this exact shape:
{
  "reply": "your Spanish reply, in character",
  "translation": "English translation of your reply",
  "coaching": "brief English coaching on their last message, or empty string if nothing important",
  "corrections": [
    {
      "original": "exactly what they wrote that was wrong",
      "corrected": "the natural Spanish version",
      "explanation": "why, in one sentence of English",
      "category": "grammar | vocabulary | spelling | structure | register",
      "severity": "minor | important | critical"
    }
  ],
  "suggestion": "a short Spanish phrase they could use to reply, to help if they are stuck"
}`;
}

interface RawTutorReply {
  reply?: string;
  translation?: string;
  coaching?: string;
  corrections?: {
    original?: string;
    corrected?: string;
    explanation?: string;
    category?: string;
    severity?: string;
  }[];
  suggestion?: string;
}

/** Generate the tutor's next turn. Falls back to a scripted turn on failure. */
export async function tutorReply(
  ai: AiClient,
  context: TutorContext,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<TutorTurn> {
  const result = await ai.json<RawTutorReply>({
    system: buildTutorSystemPrompt(context),
    messages: history.slice(-16),
    temperature: 0.8,
    maxTokens: 900,
  });

  if (!result) return fallbackTutorTurn(context, history);

  const { data, provider } = result;
  const reply = (data.reply ?? "").trim();
  if (!reply) return fallbackTutorTurn(context, history);

  return {
    reply,
    translation: (data.translation ?? "").trim(),
    coaching: (data.coaching ?? "").trim(),
    corrections: normalizeCorrections(data.corrections ?? []),
    suggestion: data.suggestion?.trim() || undefined,
    provider,
  };
}

export function normalizeCorrections(
  raw: {
    original?: string;
    corrected?: string;
    explanation?: string;
    category?: string;
    severity?: string;
  }[],
): Correction[] {
  const categories = ["grammar", "vocabulary", "spelling", "pronunciation", "structure", "register"];
  const severities = ["minor", "important", "critical"];

  return raw
    .filter((c) => c.original && c.corrected && c.original.trim() !== c.corrected.trim())
    .slice(0, 4)
    .map((c) => ({
      original: c.original!.trim(),
      corrected: c.corrected!.trim(),
      explanation: (c.explanation ?? "").trim() || "This is the natural way to say it.",
      category: (categories.includes(c.category ?? "") ? c.category : "grammar") as Correction["category"],
      severity: (severities.includes(c.severity ?? "") ? c.severity : "important") as Correction["severity"],
    }));
}

/**
 * Scripted fallback when no provider is reachable.
 *
 * It cannot converse, so it does not pretend to: it acknowledges, asks a
 * level-appropriate question, and says plainly that detailed feedback is
 * unavailable right now.
 */
export function fallbackTutorTurn(
  context: TutorContext,
  history: { role: "user" | "assistant"; content: string }[],
): TutorTurn {
  const isOpening = history.filter((m) => m.role === "user").length === 0;
  const brief = SCENARIO_BRIEFS[context.scenario];

  const openings: Record<CefrLevel, string> = {
    A1: "¡Hola! ¿Cómo te llamas?",
    A2: "¡Hola! ¿Qué tal el día? Cuéntame algo.",
    B1: "¡Hola! ¿Qué has hecho hoy? Cuéntame con detalle.",
    B2: "Buenas. ¿Qué te parece si empezamos? Cuéntame tu opinión sobre el tema.",
    C1: "Muy buenas. Me interesa tu punto de vista: ¿por dónde quieres empezar?",
    C2: "Encantado. Dime, ¿qué matiz del asunto te parece más discutible?",
  };

  const continuations: Record<CefrLevel, string> = {
    A1: "Muy bien. ¿Y qué más? Dime otra cosa.",
    A2: "Vale, entiendo. ¿Y por qué?",
    B1: "Interesante. ¿Puedes explicarme un poco más?",
    B2: "Ya veo. ¿Y qué opinas de la otra postura?",
    C1: "Comprendo tu razonamiento. ¿Qué objeción le pondrías tú mismo?",
    C2: "Matizado. ¿Y si lo llevamos al extremo contrario?",
  };

  const reply = isOpening ? openings[context.level] : continuations[context.level];

  return {
    reply,
    translation: isOpening ? "Let's begin." : "Tell me more.",
    coaching:
      "The AI tutor is offline right now, so detailed feedback is paused — your message was saved and the conversation still counts towards your practice.",
    corrections: [],
    suggestion: brief.title === "Free conversation" ? undefined : "Pues…",
    provider: "rules",
  };
}

/**
 * Turn a learner's standing mistakes into targeted practice questions (§8).
 * Used to generate the drills that appear in the next daily session.
 */
export async function generateMistakeDrills(
  ai: AiClient,
  input: {
    level: CefrLevel;
    patterns: MistakePatternSummary[];
    count?: number;
  },
): Promise<
  {
    prompt: string;
    correctAnswer: string;
    options: string[];
    explanation: string;
    patternKey: string;
  }[]
> {
  const { level, patterns, count = 5 } = input;
  if (patterns.length === 0) return [];

  const result = await ai.json<{
    questions?: {
      prompt?: string;
      correctAnswer?: string;
      options?: string[];
      explanation?: string;
      patternKey?: string;
    }[];
  }>({
    system: `You write Spanish practice questions for a ${level} learner.

Generate exactly ${count} multiple-choice questions that target these specific
mistakes the learner keeps making:
${patterns.map((p) => `- ${p.patternKey}: ${p.label}`).join("\n")}

Rules:
- Use only vocabulary and structures appropriate to ${level}.
- Each question tests ONE of the listed mistakes.
- Exactly one option is correct; wrong options must be plausible errors a real
  learner would make, not nonsense.
- The explanation must teach the rule, not just state the answer.

Respond with ONLY JSON:
{"questions":[{"prompt":"...","correctAnswer":"...","options":["...","...","..."],"explanation":"...","patternKey":"..."}]}`,
    messages: [{ role: "user", content: "Generate the questions." }],
    temperature: 0.6,
    maxTokens: 1400,
  });

  if (!result) return [];

  return (result.data.questions ?? [])
    .filter((q) => q.prompt && q.correctAnswer && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => ({
      prompt: q.prompt!,
      correctAnswer: q.correctAnswer!,
      options: q.options!,
      explanation: q.explanation ?? "",
      patternKey: q.patternKey ?? patterns[0]!.patternKey,
    }));
}
