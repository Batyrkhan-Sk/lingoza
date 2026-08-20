import { countWords, explainLine, parseLevel, XP_REWARDS, type CefrLevel, type Interface } from "@lingoza/engine";
import { MediaSources } from "@lingoza/content";
import { config } from "../config.js";
import { ai } from "./ai.js";
import { prisma } from "../db.js";
import { recordActivity } from "./progress.js";

/**
 * Authentic media — real Spanish, not written for learners.
 *
 * The point is comprehensible input from material the learner already cares
 * about: the Spanish Wikipedia article on a film they have seen is readable
 * long before an arbitrary article is, because they can predict the content and
 * only the language is unfamiliar.
 *
 * Nothing copyrighted is stored. What is served is CC-BY-SA prose,
 * publisher-provided preview clips, syndicated podcast audio, official metadata
 * and public-domain books — always attributed, always linking back to the
 * rights-holder.
 *
 * Lyrics and subtitles are never reproduced: they are licensed works, and the
 * free routes to them (LRCLIB, lyrics.ovh) carry no distribution licence — the
 * text is available, permission is not. Two things cover the same ground
 * without republishing anything. `studySong` reads a song's lyrics to derive
 * facts about it — coverage, vocabulary, grammar, pace — and discards the text.
 * `explainSpanishLine` works from the other direction, analysing a line the
 * learner supplies, which needs no licence at all.
 */

export const media = new MediaSources({
  tmdbApiKey: config.media.tmdbApiKey,
  enabled: config.sourcingEnabled,
});

async function levelOf(userId: string): Promise<CefrLevel> {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  return parseLevel(progress?.currentLevelCode);
}

/** The landing view: what is available, plus level-appropriate starting points. */
export async function getMediaOverview(userId: string) {
  const level = await levelOf(userId);
  return {
    level,
    status: media.status,
    suggestions: media.suggestions(level),
    /** Set out plainly so the constraint is visible rather than mysterious. */
    notice:
      "Lyrics and subtitles are copyrighted, so they are not reproduced here. " +
      "For songs you get a full breakdown of what is in them — how much you already " +
      "know, the words to learn first, the grammar they run on — plus the real audio " +
      "and a link to read the words at the source. Paste those words back and they " +
      "are read line by line, meaning under each line.",
  };
}

/**
 * One search across every source.
 *
 * A learner types "Coco" or "Bad Bunny" and should not have to know which
 * source that lives in — so all of them are queried in parallel and whatever
 * answers is returned. A failing source contributes nothing and is reported,
 * rather than failing the whole search.
 */
export async function searchMedia(userId: string, query: string) {
  const level = await levelOf(userId);

  const [articles, tracks, films, books] = await Promise.all([
    media.articles({ search: query, limit: 5 }),
    media.music({ search: query, limit: 8 }),
    media.films({ search: query, limit: 8 }),
    media.books({ search: query }),
  ]);

  return {
    query,
    level,
    articles: {
      items: articles.items,
      attribution: "Spanish Wikipedia, CC BY-SA 4.0",
      error: articles.error ?? null,
    },
    music: {
      items: tracks.items,
      attribution: "Deezer — 30-second previews; full track and lyrics on the platform",
      error: tracks.error ?? null,
    },
    films: {
      items: films.items,
      attribution: "TMDB — synopsis and metadata only",
      error: films.error ?? null,
    },
    books: {
      items: books.items,
      attribution: "Project Gutenberg — public domain",
      error: books.error ?? null,
    },
  };
}

/** Films and cartoons, browsable without a search term. */
export async function browseFilms(userId: string, options: { animationOnly?: boolean } = {}) {
  const level = await levelOf(userId);
  const result = await media.films({ animationOnly: options.animationOnly, kind: "movie" });
  return {
    level,
    items: result.items,
    suggestions: media.suggestions(level).watching,
    attribution: "TMDB — synopsis and metadata only",
    error: result.error ?? null,
  };
}

/** Podcast episodes at or below the learner's level. */
export async function browsePodcasts(userId: string) {
  const level = await levelOf(userId);
  const podcastLevel = (["A2", "B1", "B2", "C1"] as const).includes(level as never)
    ? (level as "A2" | "B1" | "B2" | "C1")
    : level === "A1"
      ? "A2"
      : "C1";

  const result = await media.episodes({ level: podcastLevel });
  return {
    level,
    shows: media.shows,
    items: result.items,
    attribution: "Publisher RSS feeds — audio streamed from the source",
    error: result.error ?? null,
  };
}

export async function browseBooks(userId: string) {
  const level = await levelOf(userId);
  const result = await media.books({});

  return {
    level,
    items: result.items,
    /** Literary Spanish below B2 discourages rather than teaches. */
    tooAdvanced: ["A1", "A2", "B1"].includes(level),
    attribution: "Project Gutenberg — public domain",
    error: result.error ?? null,
  };
}

/**
 * Open one article as a reading exercise.
 *
 * Returns the prose plus the same click-to-translate affordance the authored
 * readings have, so authentic text is not a second-class experience.
 */
export async function openArticle(userId: string, title: string) {
  const [level, article] = await Promise.all([levelOf(userId), media.article(title)]);
  if (!article) return null;

  return {
    ...article,
    learnerLevel: level,
    /** An honest warning rather than letting them bounce off it. */
    challenging:
      ["A1", "A2"].includes(level) &&
      ["B2", "C1", "C2"].includes(article.estimatedLevel ?? "B1"),
  };
}

/** An excerpt of a public-domain book — the one full text free to reproduce. */
export async function openBook(textUrl: string) {
  const excerpt = await media.bookExcerpt(textUrl);
  if (!excerpt) return null;
  return {
    excerpt,
    wordCount: countWords(excerpt),
    attribution: "Project Gutenberg — public domain",
  };
}

/**
 * Record time spent on authentic material.
 *
 * Deliberately weighted lower than a graded exercise: we know the learner spent
 * the time, but not how much they understood, so it should nudge the skill
 * score rather than drive it.
 */
export async function recordMediaActivity(input: {
  userId: string;
  kind: "reading" | "listening";
  minutes?: number;
  source?: Interface;
}) {
  const { userId, kind, minutes = 5, source = "web" } = input;
  return recordActivity({
    userId,
    activity: kind,
    skills: kind === "reading" ? { reading: 72 } : { listening: 72 },
    weight: 0.35,
    xp: kind === "reading" ? XP_REWARDS.readingComplete : XP_REWARDS.listeningComplete,
    minutes,
    source,
  });
}


/**
 * Break down a line of Spanish the learner supplies.
 *
 * Works on anything: a lyric they are reading elsewhere, a subtitle, a sign, a
 * message. Analysing text the reader brings needs no content licence, which is
 * why this is the feature that actually delivers word-by-word meaning and
 * grammar regardless of what any lyrics provider will hand over.
 */
export async function explainSpanishLine(userId: string, line: string, context?: string) {
  const level = await levelOf(userId);
  const explanation = await explainLine(ai, { line, level, context });

  if (!explanation) {
    return {
      explanation: null,
      message: ai.enabled
        ? "Could not analyse that line."
        : "Line analysis needs an AI provider. Add GEMINI_API_KEY to enable it.",
    };
  }

  // Time spent decoding real Spanish is reading practice, weighted lightly
  // because we cannot tell how much was understood.
  //
  // Deliberately not awaited into the result: the learner asked for an
  // explanation, and losing it because a progress row could not be written
  // would be absurd. Credit is best-effort; the analysis is the product.
  await recordActivity({
    userId,
    activity: "reading",
    skills: { reading: 70, grammar: 70 },
    weight: 0.2,
    xp: 5,
    minutes: 1,
  }).catch((error) => {
    console.warn("[explain] could not record activity:", error instanceof Error ? error.message : error);
  });

  return { explanation, message: null };
}
