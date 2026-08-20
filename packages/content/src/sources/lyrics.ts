import { parseLrc } from "@lingoza/engine";
import { fetchWithTimeout, type FetchOptions } from "./types.js";

/**
 * Lyrics — fetched for **analysis only**, never for republication.
 *
 * This is the one source in this package whose payload must not reach a
 * client. LRCLIB and lyrics.ovh both serve lyrics that neither of them is
 * licensed to distribute: LRCLIB is a community LRC archive built for local
 * music players, lyrics.ovh is a scraper. The underlying text belongs to the
 * publisher in both cases, so Lingoza reads it, derives facts from it, and
 * discards it.
 *
 * "Derives facts from it" is the whole point, and it is not a consolation
 * prize. What a learner needs from a song is not the sheet — they can read
 * that on Spotify, legally, in the app they are already playing it in. What
 * they cannot get anywhere is *which of these words do I already know*, *what
 * tense is this song built on*, and *which of these forms are Caribbean
 * elisions I should recognise but never reproduce*. None of that is the
 * publisher's expression; it is analysis of it.
 *
 * Hence {@link LyricsAnalysisInput} is deliberately not exported from the
 * package index, is never persisted, and is never returned from a route. The
 * only thing allowed to cross that boundary is the derived summary.
 */

/**
 * Raw lyric text, in memory, on its way to an analyser.
 *
 * Do not persist this, return it from a route, log it, or put it in a cache
 * with a TTL. It exists for the duration of one analysis call.
 */
export interface LyricsAnalysisInput {
  /** Lyric lines, trimmed, blanks dropped. Analysis input only. */
  lines: string[];
  /** Per-line start times in seconds, when the provider had synced lyrics. */
  timings: number[] | null;
  /** Track duration in seconds, when known — drives the words-per-second read. */
  durationSeconds: number | null;
  provider: "lrclib" | "lyrics.ovh";
  /** True when the provider marked the track as having no lyrics at all. */
  instrumental: boolean;
}

export interface LyricsQuery {
  artist: string;
  track: string;
  /** Deezer's duration, in seconds. LRCLIB matches on it, so pass it when known. */
  durationSeconds?: number;
}

interface LrclibTrack {
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  duration?: number | null;
  instrumental?: boolean;
}

/**
 * Two providers, tried in order, because their failure modes are different
 * rather than redundant.
 *
 * LRCLIB is first on both coverage and quality: it is strongest on exactly the
 * modern Latin catalogue a learner asks for, and its synced variant carries
 * per-line timestamps, which is the only free signal for how *fast* a song is
 * sung. Words-per-second is the single best predictor of whether a learner can
 * follow a track by ear, and no other source gives it away.
 *
 * lyrics.ovh is second and is expected to miss often — it 404s on much of the
 * recent reggaetón catalogue while answering fine on older mainstream tracks.
 * That is still worth having: the two miss on different material, so the pair
 * covers more than either alone. It returns no timings, so a song resolved
 * this way is analysed for vocabulary and grammar but not for pace.
 */
export class LyricsSource {
  readonly name = "lyrics";
  readonly attribution = "Lyrics via LRCLIB and lyrics.ovh — analysed, not reproduced";
  /**
   * Not a licence to display. Both providers serve publisher-owned text
   * without a distribution agreement, which is precisely why nothing that
   * leaves this class contains the lyric lines.
   */
  readonly licence = "UNLICENSED-ANALYSIS-ONLY";

  constructor(private readonly options: FetchOptions = {}) {}

  /** Resolve lyrics for analysis. Returns null when neither provider has the track. */
  async fetch(query: LyricsQuery): Promise<LyricsAnalysisInput | null> {
    return (await this.fromLrclib(query)) ?? (await this.fromLyricsOvh(query));
  }

  private async fromLrclib(query: LyricsQuery): Promise<LyricsAnalysisInput | null> {
    const track = (await this.lrclibGet(query)) ?? (await this.lrclibSearch(query));
    if (!track) return null;

    if (track.instrumental) {
      return {
        lines: [],
        timings: null,
        durationSeconds: track.duration ?? query.durationSeconds ?? null,
        provider: "lrclib",
        instrumental: true,
      };
    }

    // Prefer the synced variant even though the plain one is easier to read:
    // the timestamps are the only reason to prefer this provider at all.
    const synced = track.syncedLyrics ? parseLrc(track.syncedLyrics) : null;
    if (synced && synced.lines.length > 0) {
      return {
        lines: synced.lines,
        timings: synced.timings,
        durationSeconds: track.duration ?? query.durationSeconds ?? null,
        provider: "lrclib",
        instrumental: false,
      };
    }

    const lines = splitLines(track.plainLyrics ?? "");
    if (lines.length === 0) return null;
    return {
      lines,
      timings: null,
      durationSeconds: track.duration ?? query.durationSeconds ?? null,
      provider: "lrclib",
      instrumental: false,
    };
  }

  /**
   * The exact-match route. It needs the duration to agree within a couple of
   * seconds, so it only fires when Deezer gave us one — which is the normal
   * path, since songs reach this class from a Deezer search result.
   */
  private async lrclibGet(query: LyricsQuery): Promise<LrclibTrack | null> {
    if (query.durationSeconds == null) return null;
    const url = new URL("https://lrclib.net/api/get");
    url.searchParams.set("artist_name", query.artist);
    url.searchParams.set("track_name", query.track);
    url.searchParams.set("duration", String(Math.round(query.durationSeconds)));

    try {
      const response = await fetchWithTimeout(url.toString(), this.options);
      if (!response.ok) return null;
      return (await response.json()) as LrclibTrack;
    } catch {
      return null;
    }
  }

  /** The fuzzy route, for when the duration disagrees or was never known. */
  private async lrclibSearch(query: LyricsQuery): Promise<LrclibTrack | null> {
    const url = new URL("https://lrclib.net/api/search");
    url.searchParams.set("artist_name", query.artist);
    url.searchParams.set("track_name", query.track);

    try {
      const response = await fetchWithTimeout(url.toString(), this.options);
      if (!response.ok) return null;
      const results = (await response.json()) as LrclibTrack[];
      if (!Array.isArray(results) || results.length === 0) return null;

      // Search is ordered by relevance, but a hit with lyrics beats a closer
      // title with none — an empty match would end the chain for no reason.
      return results.find((r) => r.syncedLyrics || r.plainLyrics || r.instrumental) ?? null;
    } catch {
      return null;
    }
  }

  private async fromLyricsOvh(query: LyricsQuery): Promise<LyricsAnalysisInput | null> {
    const url =
      "https://api.lyrics.ovh/v1/" +
      encodeURIComponent(query.artist) +
      "/" +
      encodeURIComponent(query.track);

    try {
      const response = await fetchWithTimeout(url, this.options);
      if (!response.ok) return null;
      const payload = (await response.json()) as { lyrics?: string };
      const lines = splitLines(payload.lyrics ?? "");
      if (lines.length === 0) return null;

      return {
        lines,
        timings: null,
        durationSeconds: query.durationSeconds ?? null,
        provider: "lyrics.ovh",
        instrumental: false,
      };
    } catch {
      return null;
    }
  }
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
