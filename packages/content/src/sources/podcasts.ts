import { parseRss } from "./press.js";
import {
  fetchWithTimeout,
  type ContentSource,
  type FetchOptions,
  type SourcedEpisode,
  type SourceResult,
} from "./types.js";

/**
 * Spanish podcast feeds — long-form listening.
 *
 * RSS exists to be syndicated, so feeds are consumed exactly as intended: the
 * episode's own audio URL is played from the publisher, nothing is re-hosted,
 * and every episode links back to its show.
 *
 * Long-form listening is the gap between "understands exercises" and
 * "understands people". A learner who can follow twenty minutes of unscripted
 * speech has crossed a threshold that no graded audio can take them across.
 */

/** A show as presented to the learner — the feed URL is an internal detail. */
export interface PodcastShow {
  publisher: string;
  /** Difficulty, which for audio is mostly about pace and how scripted it is. */
  level: "A2" | "B1" | "B2" | "C1";
  region: "es-ES" | "es-419";
  description: string;
}

interface Feed extends PodcastShow {
  url: string;
}

/**
 * Curated because discovery is the hard part, not playback.
 *
 * Ordered by how hard they are to follow: learner-oriented shows speak slowly
 * and script every word; native shows do neither.
 */
const FEEDS: Feed[] = [
  {
    url: "https://feeds.megaphone.fm/espanolistos",
    publisher: "Españolistos",
    level: "A2",
    region: "es-419",
    description: "Made for learners — slow, scripted, and every word articulated.",
  },
  {
    url: "https://www.spanishpodcast.org/podcasts.xml",
    publisher: "SpanishPodcast",
    level: "A2",
    region: "es-ES",
    description: "Short scripted episodes with deliberate pacing.",
  },
  {
    url: "https://feeds.simplecast.com/T3Nh6Mv1",
    publisher: "Radio Ambulante",
    level: "B2",
    region: "es-419",
    description: "Narrative journalism from across Latin America. Many accents, produced audio.",
  },
  {
    url: "https://www.rtve.es/api/programas/1873/audios.rss",
    publisher: "RTVE",
    level: "C1",
    region: "es-ES",
    description: "Spanish public radio at full native pace, entirely unadapted.",
  },
];

export interface PodcastQuery {
  level?: "A2" | "B1" | "B2" | "C1";
  region?: "es-ES" | "es-419" | "any";
  limit?: number;
}

export class PodcastSource implements ContentSource<PodcastQuery, SourcedEpisode> {
  readonly name = "podcasts";
  readonly attribution = "Episodes from publisher RSS feeds, played from the source";
  readonly licence = "syndicated feeds; audio streamed from the publisher, never re-hosted";

  constructor(private readonly options: FetchOptions = {}) {}

  /** The shows themselves, so a learner can pick before fetching episodes. */
  get shows(): PodcastShow[] {
    return FEEDS.map(({ publisher, level, region, description }) => ({
      publisher,
      level,
      region,
      description,
    }));
  }

  async fetch(query: PodcastQuery = {}): Promise<SourceResult<SourcedEpisode>> {
    const { level, region = "any", limit = 12 } = query;
    const base: Omit<SourceResult<SourcedEpisode>, "items"> = {
      source: this.name,
      live: true,
      fetchedAt: new Date(),
    };

    const order = ["A2", "B1", "B2", "C1"];
    const feeds = FEEDS.filter((feed) => {
      if (region !== "any" && feed.region !== region) return false;
      // Show everything at or below the learner's level — an easier podcast is
      // still useful practice, a harder one is just discouraging.
      if (level && order.indexOf(feed.level) > order.indexOf(level)) return false;
      return true;
    });

    const settled = await Promise.allSettled(feeds.map((feed) => this.fetchFeed(feed)));
    const items = settled
      .filter((r): r is PromiseFulfilledResult<SourcedEpisode[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    if (items.length === 0) {
      return { ...base, live: false, items: [], error: "No episodes could be fetched." };
    }

    return { ...base, items: items.slice(0, limit) };
  }

  private async fetchFeed(feed: Feed): Promise<SourcedEpisode[]> {
    const response = await fetchWithTimeout(feed.url, this.options, { redirect: "follow" });
    if (!response.ok) throw new Error(`${feed.publisher}: HTTP ${response.status}`);

    const xml = await response.text();

    // Reuse the news-feed parser for title/description/link, then pull the
    // enclosure and duration, which are podcast-specific.
    const articles = parseRss(xml, feed.publisher);
    const enclosures = [...xml.matchAll(/<enclosure\b[^>]*url="([^"]+)"/gi)].map((m) => m[1]);
    const durations = [...xml.matchAll(/<itunes:duration>([^<]+)<\/itunes:duration>/gi)].map(
      (m) => m[1],
    );

    return articles.slice(0, 4).map((article, index) => ({
      title: article.title,
      description: article.summary,
      audioUrl: enclosures[index] ?? null,
      pageUrl: article.url,
      publisher: feed.publisher,
      durationSeconds: parseDuration(durations[index]),
      publishedAt: article.publishedAt ?? null,
    }));
  }
}

/** iTunes duration is "3600", "60:00" or "01:00:00" depending on the publisher. */
function parseDuration(value: string | undefined): number | null {
  if (!value) return null;
  const parts = value.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;

  if (parts.length === 1) return parts[0] ?? null;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return null;
}
