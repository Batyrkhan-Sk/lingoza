import { fetchWithTimeout, type ContentSource, type FetchOptions, type SourcedSentence, type SourceResult } from "./types.js";

/**
 * Tatoeba — attested example sentences with human translations.
 *
 * Why source these rather than write them: an invented example sentence
 * demonstrates the grammar point but often reads like nothing a Spanish
 * speaker would say. Tatoeba sentences are contributed and translated by
 * native speakers, so the learner sees the word in usage that actually occurs.
 *
 * Licensed CC-BY 2.0 FR — attribution is required wherever a sentence is
 * displayed, which is why `attribution` is part of the source contract.
 */

interface TatoebaResponse {
  results?: {
    id?: number;
    text?: string;
    lang?: string;
    translations?: (
      | { id?: number; text?: string; lang?: string }[]
      | { id?: number; text?: string; lang?: string }
    )[];
  }[];
}

export interface TatoebaQuery {
  /** The Spanish word or phrase the sentence must contain. */
  word: string;
  limit?: number;
  /** Prefer shorter sentences for lower levels. */
  maxWords?: number;
}

export class TatoebaSource implements ContentSource<TatoebaQuery, SourcedSentence> {
  readonly name = "tatoeba";
  readonly attribution = "Example sentences from Tatoeba (tatoeba.org), CC-BY 2.0 FR";
  readonly licence = "CC-BY-2.0-FR";

  constructor(private readonly options: FetchOptions = {}) {}

  async fetch(query: TatoebaQuery): Promise<SourceResult<SourcedSentence>> {
    const { word, limit = 3, maxWords = 14 } = query;
    const url = new URL("https://tatoeba.org/en/api_v0/search");
    url.searchParams.set("from", "spa");
    url.searchParams.set("to", "eng");
    url.searchParams.set("query", word);
    url.searchParams.set("trans_filter", "limit");
    url.searchParams.set("sort", "relevance");

    const base: Omit<SourceResult<SourcedSentence>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    try {
      const response = await fetchWithTimeout(url.toString(), this.options);
      if (!response.ok) {
        return { ...base, live: false, items: [], error: `HTTP ${response.status}` };
      }

      const payload = (await response.json()) as TatoebaResponse;
      const items: SourcedSentence[] = [];

      for (const result of payload.results ?? []) {
        const spanish = result.text?.trim();
        if (!spanish) continue;
        if (countWords(spanish) > maxWords) continue;

        // Tatoeba nests translations one or two levels deep depending on the
        // route that produced them; flatten defensively rather than assuming.
        const english = flattenTranslations(result.translations)
          .find((t) => t.lang === "eng" && t.text?.trim())
          ?.text?.trim();
        if (!english) continue;

        items.push({ spanish, english, reference: result.id ? `tatoeba:${result.id}` : undefined });
        if (items.length >= limit) break;
      }

      return { ...base, items };
    } catch (error) {
      return {
        ...base,
        live: false,
        items: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Tatoeba nests translations one or two levels deep depending on which route
 * produced them, so walk the structure rather than assuming a shape.
 */
function flattenTranslations(translations: unknown): { text?: string; lang?: string }[] {
  const out: { text?: string; lang?: string }[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
    } else if (node && typeof node === "object") {
      out.push(node as { text?: string; lang?: string });
    }
  };
  visit(translations);
  return out;
}

function countWords(text: string): number {
  return (text.match(/[\p{L}\p{M}'-]+/gu) ?? []).length;
}
