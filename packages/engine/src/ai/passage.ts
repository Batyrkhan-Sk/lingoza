import { LEVEL_REGISTER } from "../core/cefr.js";
import type { CefrLevel } from "../core/types.js";
import type { AiClient } from "./client.js";
import type { ProviderName } from "./provider.js";

/**
 * Line-by-line walkthrough of a passage the learner is reading.
 *
 * The difference from {@link explainLine} is batching, and batching changes
 * what the thing is for. One line at a time answers "what does this mean";
 * a whole lyric, verse after verse with the breakdown under each line, is how
 * someone actually works through a song — which is the request this exists to
 * serve, and the reason a word list on its own always felt thin.
 *
 * The text comes from the caller, and the caller is responsible for having the
 * right to it. The two ways that holds are the learner pasting words they are
 * reading on a licensed platform, and a lyrics provider that carries display
 * rights. It does not hold for LRCLIB or lyrics.ovh, which is why nothing in
 * `@lingoza/content` routes their output here.
 *
 * Explanations are kept tight on purpose. A learner reading a song wants the
 * line, what it means, and the two or three words that stopped them — not
 * every article parsed. The full treatment of one line is still one
 * `/explain` away.
 */

export interface PassageWord {
  surface: string;
  meaning: string;
  /** Standard spelling, tense, or region — only when it is not obvious. */
  note?: string;
}

/**
 * A structure worth teaching from one line.
 *
 * Separate from {@link PassageLine.dialect} because they are different kinds
 * of difficulty and want different responses from the learner. Grammar is a
 * rule to learn and then produce; a dropped consonant is a sound to recognise
 * and never write. Collapsing both into one remark — which is what a single
 * "note" field does — teaches a beginner to write "vamo'" alongside the
 * subjunctive, as though the two were the same kind of fact.
 */
export interface PassageGrammar {
  /** The name of the structure: "subjunctive after ojalá". */
  point: string;
  /** Why it is that way here, in a sentence or two. */
  explanation: string;
}

export interface PassageLine {
  original: string;
  /** Natural English, the way a person would say it. */
  translation: string;
  /** Only the words likely to have stopped the learner. */
  words: PassageWord[];
  /**
   * The grammar this line is doing — at most two points, and only where the
   * line genuinely teaches something. Most lines of most songs teach nothing
   * grammatically and get none.
   */
  grammar: PassageGrammar[];
  /**
   * Pronunciation and register: dropped consonants, regionalisms, slang.
   * Usually the real reason a line is impenetrable despite familiar words.
   */
  dialect?: string;
}

export interface PassageExplanation {
  lines: PassageLine[];
  provider: ProviderName;
}

const SYSTEM = `You are a Spanish teacher walking a learner through a passage line by line — song lyrics, a poem, a scene of dialogue.

You are given numbered lines. Explain EVERY line, in order, keeping the numbering.

For each line:
- "translation": natural English, the way someone would actually say it. Not word for word.
- "words": ONLY the words likely to have stopped this learner — slang, contractions, idioms, false friends, unusual tenses. Two to four per line, and none at all for a line that holds no difficulty. Do not gloss every article and pronoun.
- "grammar": the structure this line is built on, when it teaches one. Name it, then explain why it is that way HERE, in this line, referring to the actual words — not a textbook paragraph that would fit any sentence. Two entries at most, usually zero or one. Worth naming: a tense or mood choice and what forced it, a pronoun placement, ser vs estar, por vs para, a reflexive or impersonal construction, an idiom whose grammar is not literal, agreement that is not obvious, a conditional or hypothetical. Not worth naming: that a noun has an article, that an adjective follows a noun, or anything the learner's level has long since covered.
- "dialect": pronunciation and register only — dropped consonants, aspirated s, regionalisms, slang. Keep this separate from grammar: it is a sound to recognise, not a rule to reproduce. Say the standard form. Omit when the line is standard.

Real Spanish, especially sung, is full of forms that look like unknown words and are not:
- dropped final -s (vamo' = vamos), lost intervocalic -d- (to' = todo, pa' = para, cansao = cansado)
- aspirated s WITHIN a word: "ehtoy" is estoy, one word, not "eh" plus "estoy". "loh" is los.
- eaten opening syllables ('toy = estoy), -r becoming -l in the Caribbean
Restore the standard form in "note" rather than treating the sung form as vocabulary.

A grammar point that recurs is explained again where it recurs, briefly — a learner reading line 30 is not scrolling back to line 4, and the second encounter is where a structure starts to stick.

A repeated line gets the same explanation again — do not write "as above". A line that is a single interjection or vocalisation gets a translation and nothing else.

Translate plainly and factually, including vulgar, sexual or violent content: the learner needs to know what they are hearing. Do not censor, soften or moralise.

Respond with ONLY JSON:
{"lines":[{"index":0,"translation":"...","words":[{"surface":"...","meaning":"...","note":"..."}],"grammar":[{"point":"...","explanation":"..."}],"dialect":"..."}]}`;

export interface PassageRequest {
  /** The lines to explain, in reading order. Keep a batch small — see the caller. */
  lines: string[];
  level: CefrLevel;
  /** "From the song X by Y" — orientation for register, never used to fetch. */
  context?: string;
}

export async function explainPassage(
  ai: AiClient,
  request: PassageRequest,
): Promise<PassageExplanation | null> {
  const lines = request.lines.map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const result = await ai.json<{
    lines?: PassageEntry[];
  }>({
    system: `${SYSTEM}

The learner is at ${request.level}. Pitch your explanations accordingly:
${LEVEL_REGISTER[request.level]}`,
    messages: [
      {
        role: "user",
        content:
          (request.context ? `${request.context}\n\n` : "") +
          lines.map((line, index) => `${index}: ${line}`).join("\n"),
      },
    ],
    temperature: 0.3,
    // A short batch is cheaper to retry than a long one is to salvage: a
    // truncated response loses the whole batch, because the JSON never closes.
    // The per-line allowance covers a translation, a few glosses and a grammar
    // point explained against the line rather than in the abstract.
    maxTokens: Math.min(4500, 400 + lines.length * 340),
  });

  if (!result) return null;

  return {
    lines: alignPassage(lines, result.data.lines ?? []),
    provider: result.provider,
  };
}

/**
 * Match explanations back to the lines they belong to.
 *
 * Models drop, merge and renumber lines, and a walkthrough whose breakdown has
 * slipped by one is worse than no walkthrough: every line is confidently
 * explained as its neighbour. So the index the model returns is trusted only
 * when it lands in range and is not already taken, position is the fallback,
 * and a line that ends up with nothing is shown untranslated rather than
 * borrowing someone else's translation.
 */
interface PassageEntry {
  index?: number;
  translation?: string;
  words?: { surface?: string; meaning?: string; note?: string }[];
  grammar?: { point?: string; explanation?: string }[];
  dialect?: string;
}

export function alignPassage(lines: string[], entries: PassageEntry[]): PassageLine[] {
  const byLine = new Map<number, PassageEntry>();
  const unplaced: PassageEntry[] = [];

  for (const entry of entries) {
    const index = entry?.index;
    if (typeof index === "number" && Number.isInteger(index) && index >= 0 && index < lines.length && !byLine.has(index)) {
      byLine.set(index, entry);
    } else {
      unplaced.push(entry);
    }
  }

  // Anything unnumbered fills the remaining gaps in order — which is right
  // when the model simply omitted the field, and no worse than dropping it
  // when the model was confused.
  let next = 0;
  for (const entry of unplaced) {
    while (next < lines.length && byLine.has(next)) next += 1;
    if (next >= lines.length) break;
    byLine.set(next, entry);
  }

  return lines.map((original, index) => {
    const entry = byLine.get(index);
    return {
      original,
      translation: entry?.translation?.trim() ?? "",
      words: (entry?.words ?? [])
        .filter((word) => word?.surface && word.meaning)
        .map((word) => ({
          surface: word.surface!.trim(),
          meaning: word.meaning!.trim(),
          note: word.note?.trim() || undefined,
        })),
      grammar: (entry?.grammar ?? [])
        .filter((point) => point?.point && point.explanation)
        .map((point) => ({ point: point.point!.trim(), explanation: point.explanation!.trim() })),
      dialect: entry?.dialect?.trim() || undefined,
    };
  });
}
