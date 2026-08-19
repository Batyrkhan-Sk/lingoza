import type { CefrLevel } from "../core/types.js";
import type { AiClient } from "./client.js";

/**
 * Click-to-translate for reading and listening (§6, §9).
 *
 * Resolution order is handled by the API: the authored glossary first, then the
 * vocabulary table, and only then this — so the common case costs no tokens and
 * no latency, and the AI is reserved for words the curriculum has not covered.
 */

export interface WordExplanation {
  word: string;
  meaning: string;
  /** Dictionary form, so "hablaría" resolves back to "hablar". */
  lemma?: string;
  partOfSpeech?: string;
  /** Grammatical note, e.g. "conditional, 3rd person singular". */
  note?: string;
  source: "glossary" | "vocabulary" | "ai" | "unknown";
}

export async function explainWord(
  ai: AiClient,
  input: { word: string; sentence: string; level: CefrLevel },
): Promise<WordExplanation> {
  const result = await ai.json<{
    meaning?: string;
    lemma?: string;
    partOfSpeech?: string;
    note?: string;
  }>({
    system: `You explain a single Spanish word to a ${input.level} English-speaking learner, in the context of the sentence it appeared in.

Be brief and concrete. Give the meaning IN THIS CONTEXT, not a list of every
possible sense. If it is an inflected verb, give the infinitive as the lemma and
say which tense and person it is in.

Respond with ONLY JSON:
{"meaning":"...","lemma":"...","partOfSpeech":"noun|verb|adjective|adverb|preposition|phrase","note":"..."}`,
    messages: [
      {
        role: "user",
        content: `Word: "${input.word}"\nSentence: "${input.sentence}"`,
      },
    ],
    temperature: 0.2,
    maxTokens: 300,
  });

  if (!result?.data.meaning) {
    return { word: input.word, meaning: "", source: "unknown" };
  }

  return {
    word: input.word,
    meaning: result.data.meaning,
    lemma: result.data.lemma,
    partOfSpeech: result.data.partOfSpeech,
    note: result.data.note,
    source: "ai",
  };
}
