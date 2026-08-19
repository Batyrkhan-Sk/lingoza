/**
 * Content sourcing.
 *
 * Material that can come from the real world should come from the real world:
 * attested example sentences rather than invented ones, and today's actual
 * Spanish press rather than a synthesised article about a fictional town.
 *
 * Every source implements the same contract and every source is optional. A
 * source that is unreachable, rate-limited or slow degrades to the authored
 * baseline rather than failing a lesson — the network is never on the critical
 * path of a learner opening a screen.
 */

export interface SourceResult<T> {
  items: T[];
  /** Which source produced these, for attribution and debugging. */
  source: string;
  /** True when the network was used; false when served from cache/fallback. */
  live: boolean;
  fetchedAt: Date;
  /** Set when the source failed and a fallback was used instead. */
  error?: string;
}

export interface ContentSource<TQuery, TItem> {
  readonly name: string;
  /** Human-readable attribution, shown in the UI where the content appears. */
  readonly attribution: string;
  /** Licence of the sourced material — checked before anything is displayed. */
  readonly licence: string;
  fetch(query: TQuery): Promise<SourceResult<TItem>>;
}

/** An attested example sentence with its translation. */
export interface SourcedSentence {
  spanish: string;
  english: string;
  /** Where it came from, e.g. a Tatoeba sentence id. */
  reference?: string;
}

/** A piece of real published text for reading practice. */
export interface SourcedArticle {
  title: string;
  summary: string;
  body: string;
  url: string;
  publisher: string;
  publishedAt?: Date;
  /** Estimated CEFR level of the text, from readability analysis. */
  estimatedLevel?: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Shared fetch with a timeout — no source may hang a request. */
export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 6000, signal }: FetchOptions = {},
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "Lingoza/0.1 (Spanish learning platform; educational use)",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
