import type { CefrLevel } from "@lingoza/engine";
import { TatoebaSource } from "./tatoeba.js";
import { SpanishPressSource } from "./press.js";
import { WikipediaSource } from "./wikipedia.js";
import type { FetchOptions } from "./types.js";

/**
 * A word in the wild.
 *
 * An authored example sentence shows what a word means; it does not show how
 * the word behaves. Seeing *tener* in a news headline, an encyclopedia entry
 * and an everyday sentence teaches the register range that a single curated
 * example cannot — which is the difference between recognising a word and
 * being able to use it.
 *
 * Film and television dialogue would be ideal here and is not available:
 * subtitles are separately licensed works. What these sources give instead is
 * genuinely native, freely licensed, and attributed to where it came from.
 */

export type UsageRegister = "everyday" | "news" | "encyclopedic";

export interface UsageExample {
  sentence: string;
  /** English rendering, where the source supplies one. */
  translation?: string | null;
  register: UsageRegister;
  /** Human-readable provenance, shown with the sentence. */
  source: string;
  /** Where to read the whole thing. */
  url?: string | null;
}

export interface UsageResult {
  word: string;
  examples: UsageExample[];
  attribution: string[];
}

export class UsageSource {
  private readonly tatoeba: TatoebaSource;
  private readonly press: SpanishPressSource;
  private readonly wikipedia: WikipediaSource;

  constructor(options: FetchOptions = {}) {
    this.tatoeba = new TatoebaSource(options);
    this.press = new SpanishPressSource(options);
    this.wikipedia = new WikipediaSource(options);
  }

  /**
   * Find the word used naturally across registers.
   *
   * All three sources are queried in parallel and whatever answers is used —
   * a slow or failing source simply contributes nothing, because an example
   * panel that blocks on a news feed is worse than a shorter one.
   */
  async find(word: string, level: CefrLevel): Promise<UsageResult> {
    const bare = word.toLowerCase().trim().replace(/^(el|la|los|las)\s+/, "");

    const [everyday, news, encyclopedic] = await Promise.allSettled([
      this.fromTatoeba(bare, level),
      this.fromPress(bare),
      this.fromWikipedia(bare),
    ]);

    const examples = [
      ...settled(everyday),
      ...settled(news),
      ...settled(encyclopedic),
    ];

    return {
      word: bare,
      examples,
      attribution: [...new Set(examples.map((e) => e.source))],
    };
  }

  /** Everyday sentences written and translated by native speakers. */
  private async fromTatoeba(word: string, level: CefrLevel): Promise<UsageExample[]> {
    const maxWords = { A1: 8, A2: 10, B1: 14, B2: 18, C1: 25, C2: 30 }[level];
    // Ask for more than we need, because most get filtered out below.
    const result = await this.tatoeba.fetch({ word, limit: 12, maxWords });

    return result.items
      // "Trabaja." is a valid sentence and a useless example. A usage example
      // has to show the word doing something — with a subject, an object, or a
      // preposition around it — so anything under four words is discarded.
      .filter((item) => countWords(item.spanish) >= 4)
      .slice(0, 3)
      .map((item) => ({
        sentence: item.spanish,
        translation: item.english,
        register: "everyday" as const,
        source: "Tatoeba (CC BY 2.0 FR)",
      }));
  }

  /**
   * The word as today's Spanish press uses it.
   *
   * Only the headline or the feed's own summary — the same short, attributed,
   * linked material the reading list already shows, never article bodies.
   */
  private async fromPress(word: string): Promise<UsageExample[]> {
    const result = await this.press.fetch({ region: "any", limit: 25 });
    const pattern = wordPattern(word);

    return result.items
      .map((article): UsageExample | null => {
        const haystack = `${article.title}. ${article.summary}`;
        const sentence = firstSentenceWith(haystack, pattern);
        return sentence
          ? {
              sentence,
              register: "news" as const,
              source: article.publisher,
              url: article.url,
            }
          : null;
      })
      .filter((item): item is UsageExample => item !== null)
      .slice(0, 2);
  }

  /** Encyclopedic register — more formal, and often the clearest definition. */
  private async fromWikipedia(word: string): Promise<UsageExample[]> {
    const result = await this.wikipedia.fetch({ search: word, limit: 3 });
    const pattern = wordPattern(word);

    return result.items
      .map((entry): UsageExample | null => {
        const sentence = firstSentenceWith(entry.extract, pattern);
        return sentence
          ? {
              sentence,
              register: "encyclopedic" as const,
              source: `Wikipedia — ${entry.title}`,
              url: entry.url,
            }
          : null;
      })
      .filter((item): item is UsageExample => item !== null)
      .slice(0, 2);
  }
}

/**
 * Match the word allowing for inflection, but not as a substring.
 *
 * "como" must not match "cómodo", so the pattern anchors on word boundaries
 * while allowing a short suffix for plurals and conjugations.
 */
function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stem = escaped.length > 5 ? escaped.slice(0, -1) : escaped;
  return new RegExp(`(^|[^\\p{L}])${stem}\\p{L}{0,3}([^\\p{L}]|$)`, "iu");
}

/** The first sentence containing the word, trimmed to a usable length. */
function firstSentenceWith(text: string, pattern: RegExp): string | null {
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 220);

  const hit = sentences.find((s) => pattern.test(s));
  return hit ?? null;
}

function countWords(text: string): number {
  return (text.match(/[\p{L}\p{M}'-]+/gu) ?? []).length;
}

function settled<T>(result: PromiseSettledResult<T[]>): T[] {
  return result.status === "fulfilled" ? result.value : [];
}
