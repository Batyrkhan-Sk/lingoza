import { fetchWithTimeout, type FetchOptions } from "./types.js";

/**
 * Native pronunciation recordings from Wikimedia Commons.
 *
 * Preferred over synthesis for single words, for two reasons. A real speaker
 * carries the stress, vowel quality and rhythm that a learner is trying to
 * imitate; and the recordings come from identifiable places, so a learner can
 * hear that a word genuinely sounds different in Madrid and in Sinaloa rather
 * than being told so.
 *
 * Lingua Libre is a Wikimedia project in which volunteers record their own
 * language word by word. Files are CC-licensed and named predictably:
 *
 *   LL-Q1321 (spa)-<speaker>-<word>.wav
 *
 * Q1321 is Wikidata's identifier for Spanish, which is what makes this
 * searchable at all.
 */

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

export interface NativeRecording {
  word: string;
  audioUrl: string;
  mime: string;
  /** The contributor, which is also the licence attribution. */
  speaker: string;
  /** Where they are from, when the filename says so. */
  region: string | null;
  licence: string;
  pageUrl: string;
}

export class PronunciationSource {
  readonly name = "lingua-libre";
  readonly attribution = "Pronunciation recordings from Wikimedia Commons / Lingua Libre";
  readonly licence = "CC-BY-SA / CC0 depending on the recording";

  constructor(private readonly options: FetchOptions = {}) {}

  /**
   * Find a native recording of one word, or null if nobody has recorded it.
   *
   * Coverage is good for common vocabulary and thin for anything rare, which is
   * exactly the right shape: the words a beginner needs are the words most
   * likely to have been recorded.
   */
  async find(word: string): Promise<NativeRecording | null> {
    const clean = word.toLowerCase().trim().replace(/^(el|la|los|las)\s+/, "");
    if (!clean || clean.length > 40) return null;

    try {
      const title = await this.findFileTitle(clean);
      if (!title) return null;

      const info = await this.fileInfo(title);
      if (!info) return null;

      return {
        word: clean,
        audioUrl: info.url,
        mime: info.mime,
        speaker: extractSpeaker(title),
        region: extractRegion(title),
        licence: this.attribution,
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
      };
    } catch {
      return null;
    }
  }

  private async findFileTitle(word: string): Promise<string | null> {
    const url = new URL(COMMONS_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    // Restrict to the File namespace and the Spanish Lingua Libre prefix.
    url.searchParams.set("srsearch", `LL-Q1321 (spa) ${word}`);
    url.searchParams.set("srnamespace", "6");
    url.searchParams.set("srlimit", "10");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetchWithTimeout(url.toString(), this.options);
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      query?: { search?: { title?: string }[] };
    };

    const candidates = (payload.query?.search ?? [])
      .map((hit) => hit.title)
      .filter((title): title is string => Boolean(title));

    // Search is fuzzy, so require the filename to end with exactly this word —
    // otherwise a search for "perro" happily returns "perropresa".
    const exact = candidates.find((title) => {
      const match = title.match(/-([^-]+)\.(wav|ogg|mp3|flac)$/i);
      return match?.[1]?.toLowerCase() === word;
    });

    return exact ?? null;
  }

  private async fileInfo(title: string): Promise<{ url: string; mime: string } | null> {
    const url = new URL(COMMONS_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", title);
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetchWithTimeout(url.toString(), this.options);
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      query?: { pages?: Record<string, { imageinfo?: { url?: string; mime?: string }[] }> };
    };

    const info = Object.values(payload.query?.pages ?? {})[0]?.imageinfo?.[0];
    if (!info?.url) return null;

    return { url: info.url, mime: info.mime ?? "audio/wav" };
  }
}

/** `LL-Q1321 (spa)-Sinaloa-perro.wav` → `Sinaloa` */
function extractSpeaker(title: string): string {
  const match = title.match(/\(spa\)-(.+?)-[^-]+\.(wav|ogg|mp3|flac)$/i);
  return match?.[1] ?? "Wikimedia contributor";
}

/**
 * Recover a place from the contributor name where one is recognisable.
 *
 * Lingua Libre contributors often name themselves after where they are from,
 * which is worth surfacing: hearing that a word is pronounced differently in
 * Chile and in Madrid teaches something a single "correct" recording cannot.
 */
function extractRegion(title: string): string | null {
  const speaker = extractSpeaker(title).toLowerCase();
  const places: Record<string, string> = {
    sinaloa: "Sinaloa, México",
    chile: "Chile",
    mexico: "México",
    méxico: "México",
    argentina: "Argentina",
    colombia: "Colombia",
    peru: "Perú",
    perú: "Perú",
    españa: "España",
    spain: "España",
    madrid: "Madrid, España",
    andalu: "Andalucía, España",
    venezuela: "Venezuela",
    uruguay: "Uruguay",
    cuba: "Cuba",
  };

  for (const [key, place] of Object.entries(places)) {
    if (speaker.includes(key)) return place;
  }
  return null;
}
