import {
  fetchWithTimeout,
  type ContentSource,
  type FetchOptions,
  type SourcedFilm,
  type SourceResult,
} from "./types.js";

/**
 * TMDB — films and series, with Spanish-language synopses.
 *
 * Requesting `language=es-ES` returns overviews written in Spanish rather than
 * translated at display time, which makes them genuine reading material: a
 * paragraph of real Spanish about a film the learner has already seen, so the
 * content is predictable and only the language is new.
 *
 * Only metadata and synopses are used — never subtitles or dialogue, which are
 * licensed works. The learner is pointed at the film; they watch it wherever
 * they normally would.
 *
 * Needs a free API key. Without one the source reports itself unavailable and
 * the rest of the media feature carries on unaffected.
 */

const API = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p/w342";

/** TMDB's genre id for Animation — how cartoons are identified. */
const ANIMATION_GENRE_ID = 16;

export interface FilmQuery {
  search?: string;
  /** Return only animation, for learners who want cartoons. */
  animationOnly?: boolean;
  /** "movie" | "tv" | "both" */
  kind?: "movie" | "tv" | "both";
  limit?: number;
}

interface TmdbResult {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  media_type?: string;
}

export class TmdbSource implements ContentSource<FilmQuery, SourcedFilm> {
  readonly name = "tmdb";
  readonly attribution = "Film and series data from TMDB (themoviedb.org)";
  readonly licence = "metadata and synopses only; no subtitles or dialogue";

  constructor(
    private readonly apiKey: string,
    private readonly options: FetchOptions = {},
  ) {}

  get available(): boolean {
    return this.apiKey.length > 0;
  }

  async fetch(query: FilmQuery): Promise<SourceResult<SourcedFilm>> {
    const { search, animationOnly = false, kind = "both", limit = 12 } = query;
    const base: Omit<SourceResult<SourcedFilm>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    if (!this.available) {
      return {
        ...base,
        live: false,
        items: [],
        error: "TMDB_API_KEY is not set — add a free key from themoviedb.org to enable films.",
      };
    }

    try {
      const url = search ? this.searchUrl(search, kind) : this.discoverUrl(animationOnly, kind);
      const response = await fetchWithTimeout(url, this.options);

      if (!response.ok) {
        return {
          ...base,
          live: false,
          items: [],
          error: response.status === 401 ? "TMDB rejected the API key." : `HTTP ${response.status}`,
        };
      }

      const payload = (await response.json()) as { results?: TmdbResult[] };

      const items = (payload.results ?? [])
        .filter((result) => result.id && (result.title || result.name))
        // An entry with no synopsis is a poster and nothing to read.
        .filter((result) => (result.overview ?? "").trim().length > 30)
        .filter((result) => !animationOnly || (result.genre_ids ?? []).includes(ANIMATION_GENRE_ID))
        .slice(0, limit)
        .map<SourcedFilm>((result) => {
          const mediaType: "movie" | "tv" =
            result.media_type === "tv" || (!result.title && Boolean(result.name)) ? "tv" : "movie";
          const date = result.release_date ?? result.first_air_date ?? "";
          return {
            id: result.id!,
            title: result.title ?? result.name ?? "",
            originalTitle: result.original_title ?? result.original_name ?? null,
            overview: (result.overview ?? "").trim(),
            posterUrl: result.poster_path ? `${IMAGES}${result.poster_path}` : null,
            releaseYear: date ? date.slice(0, 4) : null,
            isAnimation: (result.genre_ids ?? []).includes(ANIMATION_GENRE_ID),
            mediaType,
            rating: typeof result.vote_average === "number" ? result.vote_average : null,
          };
        });

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

  private searchUrl(search: string, kind: FilmQuery["kind"]): string {
    const path = kind === "both" ? "search/multi" : `search/${kind}`;
    const url = new URL(`${API}/${path}`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("query", search);
    // Spanish overviews, not English ones translated later.
    url.searchParams.set("language", "es-ES");
    url.searchParams.set("include_adult", "false");
    return url.toString();
  }

  private discoverUrl(animationOnly: boolean, kind: FilmQuery["kind"]): string {
    const url = new URL(`${API}/discover/${kind === "tv" ? "tv" : "movie"}`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("language", "es-ES");
    url.searchParams.set("sort_by", "popularity.desc");
    url.searchParams.set("include_adult", "false");
    if (animationOnly) url.searchParams.set("with_genres", String(ANIMATION_GENRE_ID));
    return url.toString();
  }
}

/**
 * Films and series that suit learners, with a note on *why*.
 *
 * The usual advice — "watch anything with Spanish subtitles" — ignores that
 * difficulty varies wildly by dialect and delivery. Animation is consistently
 * the easiest starting point: dubbed dialogue is recorded clean, articulated
 * clearly, and paced for children.
 */
export const SUGGESTED_WATCHING: {
  title: string;
  level: "A2" | "B1" | "B2" | "C1";
  country: string;
  why: string;
}[] = [
  { title: "Coco", level: "A2", country: "México / Pixar", why: "Clear Mexican Spanish, simple sentences, and the story carries you." },
  { title: "Encanto", level: "A2", country: "Colombia / Disney", why: "Colombian accent, often called the clearest Spanish for learners." },
  { title: "El Libro de la Vida", level: "A2", country: "México", why: "Animation, slow delivery, heavy cultural content." },
  { title: "Elite", level: "B1", country: "España", why: "Contemporary Madrid Spanish, though the slang moves fast." },
  { title: "La Casa de Papel", level: "B2", country: "España", why: "Rapid peninsular Spanish with a lot of shouting over each other." },
  { title: "Roma", level: "B2", country: "México", why: "Quiet, slow, unusually clear — but long silences and 1970s register." },
  { title: "Club de Cuervos", level: "B2", country: "México", why: "Comedy timing means fast overlapping dialogue." },
  { title: "El Laberinto del Fauno", level: "C1", country: "España / México", why: "Literary register and period vocabulary." },
];
