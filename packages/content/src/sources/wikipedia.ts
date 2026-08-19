import { estimateLevel } from "./press.js";
import {
  fetchWithTimeout,
  type ContentSource,
  type FetchOptions,
  type SourcedEncyclopediaEntry,
  type SourceResult,
} from "./types.js";

/**
 * Spanish Wikipedia.
 *
 * This is the workhorse of the authentic-media feature, and the reason is
 * licensing: Wikipedia text is CC-BY-SA, so unlike lyrics or subtitles it can
 * genuinely be shown to a learner, mined for vocabulary, and turned into
 * comprehension questions.
 *
 * It also happens to be good material. The article on a film a learner already
 * knows gives them prose whose *content* they can predict, which is exactly the
 * comprehensible-input condition that makes authentic text usable before
 * they're ready for a novel.
 *
 * Attribution is a licence condition, not a courtesy — every entry carries it.
 */

const API = "https://es.wikipedia.org/w/api.php";
const REST = "https://es.wikipedia.org/api/rest_v1";

export interface WikipediaQuery {
  /** What the learner typed: a film, cartoon, artist, anything. */
  search: string;
  limit?: number;
}

interface SearchResponse {
  query?: { search?: { title?: string; wordcount?: number; snippet?: string }[] };
}

interface SummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
  type?: string;
}

export class WikipediaSource
  implements ContentSource<WikipediaQuery, SourcedEncyclopediaEntry>
{
  readonly name = "wikipedia";
  readonly attribution = "Text from Spanish Wikipedia, CC BY-SA 4.0";
  readonly licence = "CC-BY-SA-4.0";

  constructor(private readonly options: FetchOptions = {}) {}

  async fetch(query: WikipediaQuery): Promise<SourceResult<SourcedEncyclopediaEntry>> {
    const { search, limit = 6 } = query;
    const base: Omit<SourceResult<SourcedEncyclopediaEntry>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    try {
      const titles = await this.search(search, limit);
      if (titles.length === 0) return { ...base, items: [] };

      // Summaries in parallel; one slow article must not hold up the list.
      const settled = await Promise.allSettled(titles.map((title) => this.summary(title)));
      const items = settled
        .filter(
          (r): r is PromiseFulfilledResult<SourcedEncyclopediaEntry | null> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value)
        .filter((entry): entry is SourcedEncyclopediaEntry => entry !== null);

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

  /** Article titles matching a search term. */
  private async search(term: string, limit: number): Promise<string[]> {
    const url = new URL(API);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", term);
    url.searchParams.set("srlimit", String(limit));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetchWithTimeout(url.toString(), this.options);
    if (!response.ok) throw new Error(`Wikipedia search returned ${response.status}`);

    const payload = (await response.json()) as SearchResponse;
    return (payload.query?.search ?? [])
      .map((hit) => hit.title)
      .filter((title): title is string => Boolean(title));
  }

  /** The lead section of one article. */
  async summary(title: string): Promise<SourcedEncyclopediaEntry | null> {
    const response = await fetchWithTimeout(
      `${REST}/page/summary/${encodeURIComponent(title)}`,
      this.options,
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as SummaryResponse;
    const extract = payload.extract?.trim();

    // Disambiguation pages are lists of links, not prose — useless as reading.
    if (!extract || payload.type === "disambiguation") return null;

    return {
      title: payload.title ?? title,
      description: payload.description ?? null,
      extract,
      url:
        payload.content_urls?.desktop?.page ??
        `https://es.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      thumbnailUrl: payload.thumbnail?.source ?? null,
      wordCount: (extract.match(/[\p{L}\p{M}'-]+/gu) ?? []).length,
      estimatedLevel: estimateLevel(extract),
      licence: this.attribution,
    };
  }

  /**
   * The full lead section rather than the short summary, for when a learner
   * opens an article as a reading exercise and wants more than a paragraph.
   */
  async intro(title: string): Promise<string | null> {
    const url = new URL(API);
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "extracts");
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("titles", title);
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetchWithTimeout(url.toString(), this.options);
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      query?: { pages?: Record<string, { extract?: string }> };
    };
    const pages = Object.values(payload.query?.pages ?? {});
    return pages[0]?.extract?.trim() ?? null;
  }
}
