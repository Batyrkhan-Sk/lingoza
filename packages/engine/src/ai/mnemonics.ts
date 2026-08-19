import type { CefrLevel } from "../core/types.js";
import { assessKeywordMnemonic, type MnemonicKind } from "../learning/mnemonics.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";

/**
 * Generating personal memory hooks.
 *
 * Keyword mnemonics are a good fit for a language model: the task is to find an
 * English word that sounds like a Spanish one and invent a vivid scene joining
 * it to the meaning. That is associative, creative, and cheap to check.
 *
 * Generated hooks are validated before the learner ever sees them — a hook
 * whose "sound-alike" shares no sounds with the word is worse than no hook,
 * because it is an extra thing to memorise that cues nothing.
 */

export interface GeneratedMnemonic {
  kind: MnemonicKind;
  hook: string;
  keyword?: string;
  imagery?: string;
  explanation?: string;
  provider: ProviderName;
}

export interface WordMnemonicRequest {
  spanish: string;
  english: string;
  level: CefrLevel;
  gender?: string | null;
  /** Hooks the learner already has, so a regenerate produces something new. */
  avoid?: string[];
}

const SYSTEM = `You build memory hooks for English speakers learning Spanish, using the keyword method.

The method has three parts and all three are required:
1. KEYWORD — an English word or short phrase that SOUNDS LIKE the beginning of the Spanish word. This is non-negotiable: if it does not sound like the word, it cues nothing and is useless.
2. IMAGERY — one concrete, vivid, slightly absurd scene that contains BOTH the keyword AND the English meaning, interacting. Abstract images do not work; the scene must be something you could photograph.
3. HOOK — one short memorable sentence the learner will actually recall.

Rules:
- The keyword must share its opening sounds with the Spanish word.
- The scene must be physical and specific. "A happy feeling" is useless; "a horse driving a yellow taxi" works.
- Never simply restate the translation.
- Keep it clean and inoffensive — no violence, nothing sexual, nothing about real people.
- If the word is an obvious cognate ("hotel", "animal"), say so instead of forcing a hook: set kind to "etymology" and explain the connection.

Respond with ONLY JSON:
{"kind":"keyword","keyword":"...","imagery":"...","hook":"...","explanation":"..."}`;

/**
 * Generate a hook for one word, retrying once if the first attempt fails
 * validation. Returns null when nothing usable came back — the caller then
 * shows the curated hook, or none.
 */
export async function generateWordMnemonic(
  ai: AiClient,
  request: WordMnemonicRequest,
): Promise<GeneratedMnemonic | null> {
  const { spanish, english, gender, avoid = [] } = request;

  const attempt = async (extraGuidance = ""): Promise<GeneratedMnemonic | null> => {
    const result = await ai.json<{
      kind?: string;
      keyword?: string;
      imagery?: string;
      hook?: string;
      explanation?: string;
    }>({
      system: SYSTEM + extraGuidance,
      messages: [
        {
          role: "user",
          content:
            `Spanish word: "${spanish}"\nEnglish meaning: "${english}"` +
            (gender ? `\nGrammatical gender: ${gender === "m" ? "masculine" : "feminine"}` : "") +
            (avoid.length > 0
              ? `\n\nThe learner already has these hooks — produce something different:\n${avoid.map((a) => `- ${a}`).join("\n")}`
              : ""),
        },
      ],
      temperature: 0.9, // vivid and varied beats cautious here
      maxTokens: 500,
    });

    if (!result?.data.hook) return null;

    const { data, provider } = result;
    const kind = (["keyword", "etymology", "story", "gender"] as const).includes(
      data.kind as never,
    )
      ? (data.kind as MnemonicKind)
      : "keyword";

    // Only keyword hooks are mechanically checkable; etymology ones are not.
    if (kind === "keyword") {
      const quality = assessKeywordMnemonic({
        spanish,
        english,
        keyword: data.keyword ?? "",
        imagery: data.imagery ?? "",
      });
      if (!quality.ok) return { ...toGenerated(data, kind, provider), hook: "", explanation: quality.problems.join(" ") };
    }

    return toGenerated(data, kind, provider);
  };

  const first = await attempt();
  if (first?.hook) return first;

  // One retry, told explicitly what went wrong the first time.
  const second = await attempt(
    `\n\nYour previous attempt was rejected: ${first?.explanation ?? "it did not follow the method"}. The keyword MUST sound like the start of "${spanish}", and the scene MUST contain "${english}".`,
  );

  return second?.hook ? second : null;
}

function toGenerated(
  data: { keyword?: string; imagery?: string; hook?: string; explanation?: string },
  kind: MnemonicKind,
  provider: ProviderName,
): GeneratedMnemonic {
  return {
    kind,
    hook: (data.hook ?? "").trim(),
    keyword: data.keyword?.trim(),
    imagery: data.imagery?.trim(),
    explanation: data.explanation?.trim(),
    provider,
  };
}

/**
 * Generate a hook for a grammar point the learner keeps getting wrong.
 *
 * Deliberately different from the vocabulary prompt: rule-sets are remembered
 * through acronyms and decision procedures, not through images.
 */
export async function generateGrammarMnemonic(
  ai: AiClient,
  input: {
    title: string;
    formula: string;
    whenToUse: string;
    level: CefrLevel;
    /** The specific error the learner keeps making, if known. */
    mistake?: string;
  },
): Promise<GeneratedMnemonic | null> {
  const result = await ai.json<{
    hook?: string;
    explanation?: string;
    kind?: string;
  }>({
    system: `You create memory aids for Spanish grammar, for an English speaker at ${input.level}.

Produce ONE of these, whichever genuinely fits the structure best:
- an ACRONYM whose letters stand for the cases where the rule applies
- a one-line DECISION TEST the learner can run in their head at the moment of choosing
- a physical ANALOGY that makes the distinction obvious

It must be short enough to recall mid-sentence while speaking. A paragraph is not a memory aid.
Do not invent a strained acronym when a plain decision test would serve better.

Respond with ONLY JSON:
{"kind":"acronym","hook":"...","explanation":"..."}`,
    messages: [
      {
        role: "user",
        content:
          `Structure: ${input.title}\nPattern: ${input.formula}\nUsed for: ${input.whenToUse}` +
          (input.mistake ? `\n\nThe learner keeps making this mistake: ${input.mistake}` : ""),
      },
    ],
    temperature: 0.7,
    maxTokens: 400,
  });

  if (!result?.data.hook) return null;

  const kind = (["acronym", "contrast", "story"] as const).includes(result.data.kind as never)
    ? (result.data.kind as MnemonicKind)
    : "acronym";

  return {
    kind,
    hook: result.data.hook.trim(),
    explanation: result.data.explanation?.trim(),
    provider: result.provider,
  };
}
