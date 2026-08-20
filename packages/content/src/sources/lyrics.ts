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
 *
 * Two things lift that restriction, and both require the operator to say so
 * explicitly. A {@link LicensedLyricsProvider} is a source that carries its
 * own display rights and is tried first. A {@link DisplayLicence} is the
 * operator declaring that *they* hold rights covering this catalogue — which
 * is a real situation, because a licence to display lyrics is granted by the
 * rightsholder and is not a property of the API the text was read from.
 *
 * Either way the outcome is one flag, {@link LyricsAnalysisInput.displayable},
 * and it is the only thing any interface consults. Whether text may be shown
 * is a fact about its provenance, so it travels with the text rather than
 * being decided again, differently, by each screen that renders it.
 *
 * Both are off by default and neither can be switched on by accident: the
 * declaration carries the credit line the licence requires, so an operator who
 * has not thought about attribution has not configured it either.
 */

/**
 * The operator's own licence to display lyrics.
 *
 * Set this only if you hold display rights from the rightsholder or their
 * agent. It does not grant anything; it records that you have already been
 * granted something, and it makes the app act on it. The obligations that come
 * with such a licence — attribution, and often a limit on how much of a work
 * may be shown — remain yours: `attribution` is rendered wherever the lines
 * are, and `maxLines` truncates if your agreement covers an excerpt.
 */
export interface DisplayLicence {
  /** Credit line shown with the lyrics, as the agreement requires. */
  attribution: string;
  /** Cap on lines shown, for licences that cover an excerpt rather than a work. */
  maxLines?: number;
}

/**
 * A lyrics source that carries the right to display what it returns.
 *
 * Implement this against whatever your licence is with — Musixmatch, LyricFind,
 * a publisher's own feed — and pass it to {@link LyricsSource}. The display
 * path in the app lights up on the flag, so no renderer needs changing.
 *
 * Two obligations come with implementing it, and they are yours rather than
 * this file's: `attribution` must be whatever your agreement requires shown
 * alongside the words, and you must not return more of a work than the
 * agreement allows — many licences cover an excerpt rather than a full lyric.
 */
export interface LicensedLyricsProvider {
  readonly name: string;
  /** Shown wherever the lines are, as the licence requires. */
  readonly attribution: string;
  fetch(query: LyricsQuery): Promise<{
    lines: string[];
    timings?: number[] | null;
    durationSeconds?: number | null;
    instrumental?: boolean;
  } | null>;
}

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
  provider: string;
  /** True when the provider marked the track as having no lyrics at all. */
  instrumental: boolean;
  /**
   * Whether these lines may be shown to a learner.
   *
   * False unless a {@link LicensedLyricsProvider} supplied them or the
   * operator declared a {@link DisplayLicence}. Any interface that prints
   * lines must check it; the analysis path ignores it, because deriving facts
   * from a work is permitted either way.
   */
  displayable: boolean;
  /** Credit line the licence requires, when displaying is permitted. */
  attribution: string | null;
  /**
   * Most lines the licence permits *showing*, when it covers an excerpt.
   *
   * Null means no cap. It bounds display only — analysis reads the whole
   * lyric either way, because measuring a work is not showing it, and a
   * half-read song would report a wrong coverage figure.
   */
  maxDisplayLines: number | null;
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

  constructor(
    private readonly options: FetchOptions = {},
    private readonly rights: {
      /**
       * Providers that carry their own display rights, tried before the
       * analysis-only pair. Empty by default.
       */
      licensed?: LicensedLyricsProvider[];
      /**
       * The operator's own licence, if they hold one. Unset by default, which
       * is what keeps this repository's default deployment analysis-only.
       */
      displayLicence?: DisplayLicence;
    } = {},
  ) {}

  private get licensed(): LicensedLyricsProvider[] {
    return this.rights.licensed ?? [];
  }

  /** True when lines fetched here may be shown to a learner. */
  get canDisplay(): boolean {
    return this.licensed.length > 0 || Boolean(this.rights.displayLicence);
  }

  /** Resolve lyrics. Returns null when no provider has the track. */
  async fetch(query: LyricsQuery): Promise<LyricsAnalysisInput | null> {
    return (
      (await this.fromLicensed(query)) ??
      (await this.fromLrclib(query)) ??
      (await this.fromLyricsOvh(query))
    );
  }

  /**
   * The licensed route, first because it is the only one whose result can be
   * read by the learner rather than merely measured.
   *
   * A failing licensed provider falls through to the analysis-only pair rather
   * than failing the request: a learner still gets the breakdown, just not the
   * words. Losing the whole feature because an aggregator was down would be a
   * worse trade.
   */
  private async fromLicensed(query: LyricsQuery): Promise<LyricsAnalysisInput | null> {
    for (const provider of this.licensed) {
      try {
        const result = await provider.fetch(query);
        if (!result) continue;

        const lines = result.lines.map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0 && !result.instrumental) continue;

        return {
          lines,
          timings: result.timings ?? null,
          durationSeconds: result.durationSeconds ?? query.durationSeconds ?? null,
          provider: provider.name,
          instrumental: result.instrumental ?? false,
          displayable: true,
          attribution: provider.attribution,
          // A provider that carries its own rights states its own limits by
          // returning only what it may — there is no second cap to apply.
          maxDisplayLines: null,
        };
      } catch (error) {
        console.warn(
          `[lyrics] licensed provider ${provider.name} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    return null;
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
        ...this.rightsOf(),
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
        ...this.rightsOf(),
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
      ...this.rightsOf(),
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
        ...this.rightsOf(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Whether lines from the analysis-only providers may be shown.
   *
   * Those providers cannot answer this about themselves — they hold no rights
   * either way — so the answer comes from the operator's declared licence, or
   * is "no" when there is none. Kept in one place so that a new return path
   * cannot quietly default to displayable.
   */
  private rightsOf(): Pick<
    LyricsAnalysisInput,
    "displayable" | "attribution" | "maxDisplayLines"
  > {
    const licence = this.rights.displayLicence;
    if (!licence) return { displayable: false, attribution: null, maxDisplayLines: null };

    return {
      displayable: true,
      attribution: licence.attribution,
      maxDisplayLines: licence.maxLines ?? null,
    };
  }
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
