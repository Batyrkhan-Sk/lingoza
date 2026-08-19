import {
  fetchWithTimeout,
  type ContentSource,
  type FetchOptions,
  type SourcedArticle,
  type SourceResult,
} from "./types.js";

/**
 * Live Spanish press, for B1+ reading and listening.
 *
 * Advanced learners need real language: the reportorial conditional, heavy
 * nominalisation and current idiom simply do not appear in written-for-learners
 * text. These feeds provide today's actual Spanish journalism.
 *
 * Only headline, summary and link are used — the full body is not republished,
 * and every item is attributed and linked back to the publisher. Feeds are
 * grouped by region so a learner working on Latin American Spanish is not fed
 * exclusively peninsular sources.
 */

export interface PressQuery {
  /** Filter to a region: "es-ES", "es-419", or "any". */
  region?: "es-ES" | "es-419" | "any";
  limit?: number;
  /** Rough CEFR ceiling — filters out the densest items for B1 readers. */
  maxLevel?: "B1" | "B2" | "C1" | "C2";
}

interface Feed {
  url: string;
  publisher: string;
  region: "es-ES" | "es-419";
}

const FEEDS: Feed[] = [
  { url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", publisher: "El País", region: "es-ES" },
  { url: "https://www.eldiario.es/rss/", publisher: "elDiario.es", region: "es-ES" },
  { url: "https://www.infobae.com/feeds/rss/", publisher: "Infobae", region: "es-419" },
  { url: "https://www.bbc.com/mundo/index.xml", publisher: "BBC Mundo", region: "es-419" },
];

export class SpanishPressSource implements ContentSource<PressQuery, SourcedArticle> {
  readonly name = "spanish-press";
  readonly attribution = "Headlines from Spanish-language news publishers, linked to the original";
  readonly licence = "headline-and-link only; full text not republished";

  constructor(private readonly options: FetchOptions = {}) {}

  async fetch(query: PressQuery = {}): Promise<SourceResult<SourcedArticle>> {
    const { region = "any", limit = 10 } = query;
    const feeds = FEEDS.filter((feed) => region === "any" || feed.region === region);

    const base: Omit<SourceResult<SourcedArticle>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    // Query feeds in parallel; one slow publisher must not delay the rest.
    const settled = await Promise.allSettled(feeds.map((feed) => this.fetchFeed(feed)));

    const items = settled
      .filter((r): r is PromiseFulfilledResult<SourcedArticle[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    if (items.length === 0) {
      const firstError = settled.find((r) => r.status === "rejected");
      return {
        ...base,
        live: false,
        items: [],
        error:
          firstError && firstError.status === "rejected"
            ? String(firstError.reason).slice(0, 200)
            : "no items returned",
      };
    }

    // Interleave publishers so the list is not dominated by whichever feed is
    // fastest or largest.
    return { ...base, items: interleaveByPublisher(items).slice(0, limit) };
  }

  private async fetchFeed(feed: Feed): Promise<SourcedArticle[]> {
    const response = await fetchWithTimeout(feed.url, this.options);
    if (!response.ok) throw new Error(`${feed.publisher}: HTTP ${response.status}`);
    const xml = await response.text();
    return parseRss(xml, feed.publisher).map((article) => ({
      ...article,
      estimatedLevel: estimateLevel(`${article.title} ${article.summary}`),
    }));
  }
}

/**
 * A deliberately small RSS/Atom reader.
 *
 * Pulling in a full XML parser for four well-formed news feeds would add a
 * dependency to every consumer of this package; these feeds only need title,
 * link, description and date.
 */
export function parseRss(xml: string, publisher: string): SourcedArticle[] {
  const items: SourcedArticle[] = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? [];

  for (const block of blocks) {
    const title = decode(pick(block, "title"));
    const summary = decode(
      pick(block, "description") || pick(block, "summary") || pick(block, "content"),
    );
    const link = pickLink(block);
    const dateText = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated");

    if (!title || !link) continue;

    const published = dateText ? new Date(dateText) : undefined;

    items.push({
      title,
      summary: stripTags(summary).slice(0, 400),
      // Only the summary is stored as the body: the full article belongs to the
      // publisher and is read on their site, via `url`.
      body: stripTags(summary),
      url: link,
      publisher,
      publishedAt: published && !Number.isNaN(published.getTime()) ? published : undefined,
    });
  }

  return items;
}

function pick(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function pickLink(block: string): string {
  const plain = pick(block, "link");
  if (plain && !plain.startsWith("<")) return plain;
  // Atom puts the URL in an attribute rather than the element body.
  const href = block.match(/<link\b[^>]*href="([^"]+)"/i);
  return href?.[1] ?? "";
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

function interleaveByPublisher(articles: SourcedArticle[]): SourcedArticle[] {
  const groups = new Map<string, SourcedArticle[]>();
  for (const article of articles) {
    const list = groups.get(article.publisher) ?? [];
    list.push(article);
    groups.set(article.publisher, list);
  }
  const out: SourcedArticle[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const list of groups.values()) {
      const next = list.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

/**
 * Rough CEFR estimate for a Spanish text.
 *
 * A Fernández-Huerta style readability heuristic (the Spanish analogue of
 * Flesch) combined with sentence length. This is a *filter*, not an assessment:
 * it is good enough to keep a dense C1 editorial out of a B1 reading list, and
 * is not presented to the learner as a graded difficulty.
 */
export function estimateLevel(text: string): "A2" | "B1" | "B2" | "C1" | "C2" {
  const words = text.match(/[\p{L}\p{M}'-]+/gu) ?? [];
  const sentences = text.split(/[.!?…]+/).filter((s) => s.trim().length > 0);
  if (words.length === 0 || sentences.length === 0) return "B1";

  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;

  // Fernández-Huerta: 206.84 − 60·(syllables/word) − 1.02·(words/sentence)
  const score = 206.84 - 60 * syllablesPerWord - 1.02 * wordsPerSentence;

  if (score >= 80) return "A2";
  if (score >= 65) return "B1";
  if (score >= 50) return "B2";
  if (score >= 30) return "C1";
  return "C2";
}

/** Spanish syllable count by vowel groups — accurate enough for readability. */
function countSyllables(word: string): number {
  const groups = word.toLowerCase().match(/[aeiouáéíóúü]+/g);
  return Math.max(1, groups?.length ?? 1);
}
