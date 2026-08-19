import { LEVEL_REGISTER } from "../core/cefr.js";
import type { CefrLevel } from "../core/types.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";

/**
 * Line-by-line analysis of Spanish the learner brings.
 *
 * This is analysis of text supplied by the reader — the same thing a dictionary
 * or a grammar reference does. Nothing is stored or served onward, so it needs
 * no content licence and works on a line from a song, a film subtitle the
 * learner is watching, a sign, or a message from a friend.
 *
 * It is also the part with the real teaching value. Seeing the words is easy;
 * knowing *why* it is the subjunctive there, or that `pa'` is `para` with the
 * middle eaten, is what actually moves someone forward.
 */

export interface WordGloss {
  /** The word exactly as it appears, including any contraction. */
  surface: string;
  /** Dictionary form, so `dime` resolves to `decir`. */
  lemma: string;
  meaning: string;
  partOfSpeech: string;
  /** Grammatical detail: tense, person, mood, number. */
  note?: string;
  /** Set when the written form differs from the standard spelling. */
  standardForm?: string;
}

export interface LineExplanation {
  original: string;
  /** How it would actually be said, not word for word. */
  translation: string;
  /** Word-for-word gloss, for seeing the structure. */
  literal?: string;
  words: WordGloss[];
  /** The grammar worth teaching from this line. */
  grammar: { point: string; explanation: string }[];
  /**
   * Dialect and register notes — dropped consonants, regionalisms, slang.
   * Usually the reason a line is impenetrable despite familiar vocabulary.
   */
  dialect: string | null;
  /** Difficulty of the line itself, which may exceed the learner's level. */
  estimatedLevel: CefrLevel | null;
  provider: ProviderName;
}

const SYSTEM = `You are a Spanish teacher breaking down one line of Spanish for an English-speaking learner.

The learner has pasted a line they encountered — from a song, a film, a conversation. Explain it thoroughly.

For every word give: the surface form as written, the dictionary form, the meaning IN THIS CONTEXT, the part of speech, and any grammatical detail (tense, person, mood). If the written form is non-standard — a dropped consonant, a contraction, an eaten syllable — give the standard spelling too.

Pay particular attention to features that make real Spanish hard to parse:
- Aspirated -s, where an s becomes an h WITHIN a word. "ehtoy" is one word,
  estoy, with the s aspirated — NOT the filler "eh" followed by "estoy".
  Likewise "ehpañol" = español, "ehcuela" = escuela, "loh" = los.
  Never split an aspirated form into two words; restore the s instead.
- dropped final -s ("vamo'" = vamos, "má'" = más)
- lost intervocalic -d- ("to'" = todo, "pa'" = para, "cansao" = cansado)
- -r becoming -l (Caribbean)
- contractions and elisions in sung or fast speech
- slang and regionalisms, with where they are used

Then list the grammar points genuinely worth teaching from this line — not every feature, the two or three that matter.

Translate naturally, the way a person would actually say it in English, not word by word. Add a literal gloss separately if the word order differs interestingly.

Be accurate. If a word is ambiguous, say so rather than guessing confidently. If the line contains vulgar or explicit language, translate it plainly and factually — the learner needs to know what it means; do not moralise about it and do not censor it.

Respond with ONLY JSON:
{
  "translation": "...",
  "literal": "...",
  "words": [{"surface":"...","lemma":"...","meaning":"...","partOfSpeech":"...","note":"...","standardForm":"..."}],
  "grammar": [{"point":"...","explanation":"..."}],
  "dialect": "... or null",
  "estimatedLevel": "A1|A2|B1|B2|C1|C2"
}`;

export async function explainLine(
  ai: AiClient,
  input: { line: string; level: CefrLevel; context?: string },
): Promise<LineExplanation | null> {
  const line = input.line.trim();
  if (!line) return null;

  const result = await ai.json<{
    translation?: string;
    literal?: string;
    words?: WordGloss[];
    grammar?: { point?: string; explanation?: string }[];
    dialect?: string | null;
    estimatedLevel?: string;
  }>({
    system: `${SYSTEM}

The learner is at ${input.level}. Pitch your explanations accordingly:
${LEVEL_REGISTER[input.level]}`,
    messages: [
      {
        role: "user",
        content: input.context
          ? `Line: "${line}"\n\nContext: ${input.context}`
          : `Line: "${line}"`,
      },
    ],
    temperature: 0.3,
    maxTokens: 1600,
  });

  const translation = result?.data.translation?.trim();
  if (!result || !translation) return null;

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const { data, provider } = result;

  return {
    original: line,
    translation,
    literal: data.literal?.trim() || undefined,
    words: (data.words ?? [])
      .filter((word) => word.surface && word.meaning)
      .map((word) => ({
        surface: word.surface,
        lemma: word.lemma || word.surface,
        meaning: word.meaning,
        partOfSpeech: word.partOfSpeech || "",
        note: word.note || undefined,
        standardForm: word.standardForm || undefined,
      })),
    grammar: (data.grammar ?? [])
      .filter((point) => point.point && point.explanation)
      .map((point) => ({ point: point.point!, explanation: point.explanation! })),
    dialect: data.dialect?.trim() || null,
    estimatedLevel: levels.includes(data.estimatedLevel ?? "")
      ? (data.estimatedLevel as CefrLevel)
      : null,
    provider,
  };
}
