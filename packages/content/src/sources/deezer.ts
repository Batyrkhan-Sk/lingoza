import {
  fetchWithTimeout,
  type ContentSource,
  type FetchOptions,
  type SourcedTrack,
  type SourceResult,
} from "./types.js";

/**
 * Deezer — music metadata and 30-second preview clips.
 *
 * Music is superb listening practice: learners will replay a song they like far
 * more often than any exercise, and repetition is what builds phonological
 * familiarity.
 *
 * What this does **not** do is store or serve lyrics. Lyrics are licensed to
 * platforms by publishers; reproducing them would be infringement regardless of
 * educational intent. The preview clips used here are published by the platform
 * expressly for third-party playback, and every track links back to the full
 * work — where the learner can also read the lyrics legally.
 *
 * No API key is required for search, which is why it is preferred over
 * alternatives here.
 */

const API = "https://api.deezer.com";

export interface MusicQuery {
  /** Artist, track, or both. */
  search: string;
  limit?: number;
  /** Only return tracks that actually have a playable preview. */
  requirePreview?: boolean;
}

interface DeezerResponse {
  data?: {
    id?: number;
    title?: string;
    duration?: number;
    preview?: string;
    link?: string;
    artist?: { name?: string };
    album?: { title?: string; cover_medium?: string };
  }[];
  error?: { message?: string };
}

export class DeezerSource implements ContentSource<MusicQuery, SourcedTrack> {
  readonly name = "deezer";
  readonly attribution = "Track data and preview clips from Deezer";
  readonly licence = "metadata and platform-provided previews only; no lyrics";

  constructor(private readonly options: FetchOptions = {}) {}

  async fetch(query: MusicQuery): Promise<SourceResult<SourcedTrack>> {
    const { search, limit = 10, requirePreview = true } = query;
    const base: Omit<SourceResult<SourcedTrack>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    try {
      const url = new URL(`${API}/search`);
      url.searchParams.set("q", search);
      url.searchParams.set("limit", String(Math.min(limit * 2, 50)));

      const response = await fetchWithTimeout(url.toString(), this.options);
      if (!response.ok) {
        return { ...base, live: false, items: [], error: `HTTP ${response.status}` };
      }

      const payload = (await response.json()) as DeezerResponse;
      if (payload.error) {
        return { ...base, live: false, items: [], error: payload.error.message ?? "Deezer error" };
      }

      const items = (payload.data ?? [])
        .filter((track) => track.id && track.title)
        // A track without a preview is not listening practice, just a link.
        .filter((track) => !requirePreview || Boolean(track.preview))
        .slice(0, limit)
        .map<SourcedTrack>((track) => ({
          id: track.id!,
          title: track.title!,
          artist: track.artist?.name ?? "Unknown",
          album: track.album?.title ?? null,
          coverUrl: track.album?.cover_medium ?? null,
          previewUrl: track.preview ?? null,
          durationSeconds: track.duration ?? 0,
          externalUrl: track.link ?? `https://www.deezer.com/track/${track.id}`,
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
}

/**
 * Artists worth suggesting to a learner, by how hard they are to follow.
 *
 * Sung Spanish varies enormously in difficulty: a slow singer-songwriter
 * articulating every syllable is usable at A2, while reggaetón drops consonants
 * and runs at conversational speed with heavy regional slang. Sorting by that
 * rather than by popularity is the difference between motivating and defeating.
 */
export const SUGGESTED_ARTISTS: {
  name: string;
  level: "A2" | "B1" | "B2" | "C1";
  country: string;
  why: string;
}[] = [
  { name: "Jorge Drexler", level: "A2", country: "Uruguay", why: "Slow, precise diction and unusually clear vowels." },
  { name: "Natalia Lafourcade", level: "A2", country: "México", why: "Gentle pace, clean articulation, simple vocabulary." },
  { name: "Silvio Rodríguez", level: "B1", country: "Cuba", why: "Poetic but slow, and every consonant lands." },
  { name: "Juanes", level: "B1", country: "Colombia", why: "Mid-tempo rock with everyday vocabulary." },
  { name: "Shakira", level: "B1", country: "Colombia", why: "Clear delivery; many songs exist in both languages." },
  { name: "Rosalía", level: "B2", country: "España", why: "Andalusian phrasing and dropped consonants — a real step up." },
  { name: "Rauw Alejandro", level: "B2", country: "Puerto Rico", why: "Caribbean Spanish, fast, with aspirated -s." },
  { name: "Bad Bunny", level: "C1", country: "Puerto Rico", why: "Dense Puerto Rican slang, dropped endings, very fast." },
  { name: "Residente", level: "C1", country: "Puerto Rico", why: "Rapid political lyricism — among the hardest listening there is." },
];
