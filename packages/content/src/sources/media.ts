import type { CefrLevel } from "@lingoza/engine";
import { WikipediaSource, type WikipediaQuery } from "./wikipedia.js";
import { DeezerSource, SUGGESTED_ARTISTS, type MusicQuery } from "./deezer.js";
import { TmdbSource, SUGGESTED_WATCHING, type FilmQuery } from "./tmdb.js";
import { GutenbergSource, type BookQuery } from "./gutenberg.js";
import { PodcastSource, type PodcastQuery, type PodcastShow } from "./podcasts.js";
import type {
  SourcedBook,
  SourcedEncyclopediaEntry,
  SourcedEpisode,
  SourcedFilm,
  SourcedTrack,
  SourceResult,
} from "./types.js";

/**
 * Authentic media — the facade the API talks to.
 *
 * The pedagogical case for this is comprehensible input: a learner who already
 * knows the plot of a film can read about it in Spanish long before they could
 * read an arbitrary article, because the content is predictable and only the
 * language is new. The same goes for a song they have heard fifty times.
 *
 * The legal case shapes what is possible. Lyrics and subtitles are licensed
 * works and are never stored or served. What this returns is freely-licensed
 * prose (Wikipedia, CC-BY-SA), publisher-provided previews and syndicated
 * audio, official metadata, and genuinely public-domain literature — with the
 * learner sent to the rights-holder for the work itself.
 *
 * Every method is safe on a request path: failures return empty results with a
 * reason, never throw.
 */

export interface MediaOptions {
  tmdbApiKey?: string;
  timeoutMs?: number;
  enabled?: boolean;
  /** How long fetched media stays fresh. */
  ttlMs?: number;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export class MediaSources {
  private readonly wikipedia: WikipediaSource;
  private readonly deezer: DeezerSource;
  private readonly tmdb: TmdbSource;
  private readonly gutenberg: GutenbergSource;
  private readonly podcasts: PodcastSource;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly options: MediaOptions = {}) {
    const fetchOptions = { timeoutMs: options.timeoutMs ?? 8000 };
    this.wikipedia = new WikipediaSource(fetchOptions);
    this.deezer = new DeezerSource(fetchOptions);
    this.tmdb = new TmdbSource(options.tmdbApiKey ?? "", fetchOptions);
    this.gutenberg = new GutenbergSource(fetchOptions);
    this.podcasts = new PodcastSource(fetchOptions);
  }

  get enabled(): boolean {
    return this.options.enabled !== false;
  }

  /** Which sources are usable right now, for the UI to explain gaps honestly. */
  get status() {
    return {
      wikipedia: this.enabled,
      music: this.enabled,
      films: this.enabled && this.tmdb.available,
      books: this.enabled,
      podcasts: this.enabled,
      filmsHint: this.tmdb.available
        ? null
        : "Add a free TMDB_API_KEY from themoviedb.org to enable films and cartoons.",
    };
  }

  /** Encyclopedia articles — the main source of real Spanish prose. */
  async articles(query: WikipediaQuery): Promise<SourceResult<SourcedEncyclopediaEntry>> {
    return this.cached(`wiki:${query.search}:${query.limit ?? 6}`, () =>
      this.wikipedia.fetch(query),
    );
  }

  /** The full lead section of one article, for use as a reading exercise. */
  async article(title: string): Promise<SourcedEncyclopediaEntry | null> {
    if (!this.enabled) return null;
    const summary = await this.wikipedia.summary(title);
    if (!summary) return null;

    // Prefer the longer intro when it is available — a single paragraph is
    // thin for a reading exercise.
    const intro = await this.wikipedia.intro(title);
    if (intro && intro.length > summary.extract.length) {
      return {
        ...summary,
        extract: intro,
        wordCount: (intro.match(/[\p{L}\p{M}'-]+/gu) ?? []).length,
      };
    }
    return summary;
  }

  async music(query: MusicQuery): Promise<SourceResult<SourcedTrack>> {
    return this.cached(`music:${query.search}:${query.limit ?? 10}`, () =>
      this.deezer.fetch(query),
    );
  }

  async films(query: FilmQuery): Promise<SourceResult<SourcedFilm>> {
    const key = `film:${query.search ?? "popular"}:${query.animationOnly ?? false}:${query.kind ?? "both"}`;
    return this.cached(key, () => this.tmdb.fetch(query));
  }

  async books(query: BookQuery = {}): Promise<SourceResult<SourcedBook>> {
    return this.cached(`book:${query.search ?? "all"}`, () => this.gutenberg.fetch(query));
  }

  /** An excerpt of a public-domain book — the one full text that is free to use. */
  async bookExcerpt(textUrl: string): Promise<string | null> {
    if (!this.enabled) return null;
    return this.gutenberg.excerpt(textUrl);
  }

  async episodes(query: PodcastQuery = {}): Promise<SourceResult<SourcedEpisode>> {
    return this.cached(`pod:${query.level ?? "any"}:${query.region ?? "any"}`, () =>
      this.podcasts.fetch(query),
    );
  }

  get shows(): PodcastShow[] {
    return this.podcasts.shows;
  }

  /**
   * Curated starting points, by level.
   *
   * Search is useless without a way in: a learner does not know which Spanish
   * artists are intelligible at their level, and picking wrong once is enough
   * to conclude that authentic media is "too hard".
   */
  suggestions(level: CefrLevel) {
    const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const ceiling = order.indexOf(level);
    const within = (itemLevel: string) => order.indexOf(itemLevel) <= Math.max(ceiling, 1);

    return {
      artists: SUGGESTED_ARTISTS.filter((a) => within(a.level)),
      watching: SUGGESTED_WATCHING.filter((w) => within(w.level)),
      shows: this.shows.filter((s) => within(s.level)),
    };
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return { items: [], source: "disabled", live: false, fetchedAt: new Date(), error: "Media sourcing is disabled." } as T;
    }

    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;

    const value = await load();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (this.options.ttlMs ?? 30 * 60_000),
    });

    // Bound the cache; these are per-search keys and would otherwise grow
    // without limit on a busy instance.
    if (this.cache.size > 300) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      for (const [staleKey] of oldest.slice(0, 100)) this.cache.delete(staleKey);
    }

    return value;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export { SUGGESTED_ARTISTS, SUGGESTED_WATCHING };
