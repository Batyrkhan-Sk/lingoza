import {
  fetchWithTimeout,
  type ContentSource,
  type FetchOptions,
  type SourcedBook,
  type SourceResult,
} from "./types.js";

/**
 * Project Gutenberg — public-domain Spanish literature.
 *
 * The one source here whose *full text* can be used without reservation: these
 * works are out of copyright, and Gutenberg publishes plain-text editions
 * expressly for reuse.
 *
 * Aimed at B2 and above. Nineteenth-century literary Spanish is genuinely hard
 * — long periodic sentences, archaic vocabulary, and verb forms that have since
 * fallen out of everyday use — so serving it to a B1 learner would discourage
 * rather than teach. Below B2, the press feed and Wikipedia are better material.
 */

const API = "https://gutendex.com/books";

export interface BookQuery {
  search?: string;
  limit?: number;
}

interface GutendexResponse {
  count?: number;
  results?: {
    id?: number;
    title?: string;
    authors?: { name?: string }[];
    formats?: Record<string, string>;
    download_count?: number;
    languages?: string[];
  }[];
}

export class GutenbergSource implements ContentSource<BookQuery, SourcedBook> {
  readonly name = "gutenberg";
  readonly attribution = "Public-domain texts from Project Gutenberg";
  readonly licence = "public domain";

  constructor(private readonly options: FetchOptions = {}) {}

  async fetch(query: BookQuery = {}): Promise<SourceResult<SourcedBook>> {
    const { search, limit = 12 } = query;
    const base: Omit<SourceResult<SourcedBook>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    try {
      const url = new URL(API);
      url.searchParams.set("languages", "es");
      if (search) url.searchParams.set("search", search);

      // Gutendex redirects http→https and www, so follow redirects.
      const response = await fetchWithTimeout(url.toString(), this.options, { redirect: "follow" });
      if (!response.ok) {
        return { ...base, live: false, items: [], error: `HTTP ${response.status}` };
      }

      const payload = (await response.json()) as GutendexResponse;

      const items = (payload.results ?? [])
        .filter((book) => book.id && book.title)
        // Only Spanish-language editions; the API returns translations too.
        .filter((book) => (book.languages ?? []).includes("es"))
        .slice(0, limit)
        .map<SourcedBook>((book) => ({
          id: book.id!,
          title: book.title!,
          author: book.authors?.[0]?.name ?? "Anónimo",
          textUrl: findPlainText(book.formats ?? {}),
          readUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
          downloads: book.download_count ?? 0,
        }));

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

  /**
   * Fetch an excerpt of a book's plain text.
   *
   * Deliberately an excerpt, not the whole file: these run to hundreds of
   * kilobytes, and nobody reads a novel inside a language app. The opening
   * pages are enough to work with, and the learner is linked to the full text.
   */
  async excerpt(textUrl: string, maxChars = 4000): Promise<string | null> {
    try {
      const response = await fetchWithTimeout(textUrl, this.options, { redirect: "follow" });
      if (!response.ok) return null;

      const body = await response.text();

      // Gutenberg wraps each work in a licence header and footer; the actual
      // text begins after a marker line.
      const startMarker = body.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG/i);
      const afterHeader =
        startMarker === -1 ? body : body.slice(body.indexOf("\n", startMarker) + 1);

      return afterHeader.replace(/\r\n/g, "\n").trim().slice(0, maxChars);
    } catch {
      return null;
    }
  }
}

/** Prefer UTF-8 plain text; fall back to any plain-text format offered. */
function findPlainText(formats: Record<string, string>): string | null {
  const preferred = Object.entries(formats).find(
    ([type]) => type.startsWith("text/plain") && type.includes("utf-8"),
  );
  if (preferred) return preferred[1];

  const any = Object.entries(formats).find(([type]) => type.startsWith("text/plain"));
  return any?.[1] ?? null;
}
