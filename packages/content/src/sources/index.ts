import type { CefrLevel } from "@lingoza/engine";
import { TatoebaSource, type TatoebaQuery } from "./tatoeba.js";
import { SpanishPressSource, type PressQuery } from "./press.js";
import type { SourcedArticle, SourcedSentence, SourceResult } from "./types.js";

export * from "./types.js";
export { TatoebaSource, type TatoebaQuery } from "./tatoeba.js";
export { SpanishPressSource, parseRss, estimateLevel, type PressQuery } from "./press.js";
export { WikipediaSource, type WikipediaQuery } from "./wikipedia.js";
export { DeezerSource, SUGGESTED_ARTISTS, type MusicQuery } from "./deezer.js";
export { TmdbSource, SUGGESTED_WATCHING, type FilmQuery } from "./tmdb.js";
export { GutenbergSource, type BookQuery } from "./gutenberg.js";
export { PodcastSource, type PodcastQuery, type PodcastShow } from "./podcasts.js";
export { MediaSources, type MediaOptions } from "./media.js";
export { PronunciationSource, type NativeRecording } from "./pronunciation.js";
export {
  LyricsSource,
  type DisplayLicence,
  type LicensedLyricsProvider,
  type LyricsQuery,
} from "./lyrics.js";
export { UsageSource, type UsageExample, type UsageResult, type UsageRegister } from "./usage.js";

/**
 * The sourcing facade.
 *
 * Callers ask for content by intent ("example sentences for this word",
 * "reading material at this level") and do not deal with individual providers,
 * caching or failure handling. Every method is safe to call on a request path:
 * on any failure it returns an empty result, never throws.
 */

interface CacheEntry<T> {
  value: SourceResult<T>;
  expiresAt: number;
}

export interface ContentSourcesOptions {
  /** How long sourced material stays fresh. Press: minutes. Sentences: days. */
  sentenceTtlMs?: number;
  articleTtlMs?: number;
  timeoutMs?: number;
  /** Set false to disable all network sourcing (offline/CI). */
  enabled?: boolean;
}

export class ContentSources {
  private readonly tatoeba: TatoebaSource;
  private readonly press: SpanishPressSource;
  private readonly sentenceCache = new Map<string, CacheEntry<SourcedSentence>>();
  private readonly articleCache = new Map<string, CacheEntry<SourcedArticle>>();

  constructor(private readonly options: ContentSourcesOptions = {}) {
    const fetchOptions = { timeoutMs: options.timeoutMs ?? 6000 };
    this.tatoeba = new TatoebaSource(fetchOptions);
    this.press = new SpanishPressSource(fetchOptions);
  }

  get enabled(): boolean {
    return this.options.enabled !== false;
  }

  /** Attested example sentences for a word, cached for days — they never change. */
  async examplesFor(word: string, level: CefrLevel): Promise<SourceResult<SourcedSentence>> {
    const key = `${word}:${level}`;
    const cached = this.sentenceCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    if (!this.enabled) return empty<SourcedSentence>("tatoeba", "sourcing disabled");

    // Beginners need short sentences; advanced learners benefit from longer ones.
    const maxWords = { A1: 8, A2: 10, B1: 14, B2: 18, C1: 25, C2: 30 }[level];
    const query: TatoebaQuery = { word, limit: 3, maxWords };

    const result = await this.tatoeba.fetch(query);
    this.sentenceCache.set(key, {
      value: result,
      expiresAt: Date.now() + (this.options.sentenceTtlMs ?? 7 * 86_400_000),
    });
    return result;
  }

  /**
   * Current press articles suitable for a level. Only offered at B1+ — below
   * that, real journalism is discouraging rather than instructive.
   */
  async readingFor(
    level: CefrLevel,
    region: "es-ES" | "es-419" | "any" = "any",
  ): Promise<SourceResult<SourcedArticle>> {
    if (level === "A1" || level === "A2") {
      return empty<SourcedArticle>("spanish-press", "press is not served below B1");
    }

    const key = `${level}:${region}`;
    const cached = this.articleCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    if (!this.enabled) return empty<SourcedArticle>("spanish-press", "sourcing disabled");

    const query: PressQuery = { region, limit: 12 };
    const result = await this.press.fetch(query);

    // Keep only items at or below the learner's level, so a B1 reader is not
    // handed a dense C2 editorial.
    const ceiling = ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(level);
    const filtered = {
      ...result,
      items: result.items.filter(
        (item) => ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(item.estimatedLevel ?? "B1") <= ceiling,
      ),
    };

    this.articleCache.set(key, {
      value: filtered,
      expiresAt: Date.now() + (this.options.articleTtlMs ?? 30 * 60_000),
    });
    return filtered;
  }

  clearCache(): void {
    this.sentenceCache.clear();
    this.articleCache.clear();
  }
}

function empty<T>(source: string, error: string): SourceResult<T> {
  return { items: [], source, live: false, fetchedAt: new Date(), error };
}
