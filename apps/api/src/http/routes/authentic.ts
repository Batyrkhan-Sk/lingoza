import { Hono } from "hono";
import { getSpeech, synthesisAvailable } from "../../services/speech.js";
import {
  explainSpanishLine,
  browseBooks,
  browseFilms,
  browsePodcasts,
  getMediaOverview,
  openArticle,
  openBook,
  recordMediaActivity,
  searchMedia,
} from "../../services/authentic.js";

/**
 * Authentic media routes.
 *
 * Auth is applied centrally in http/app.ts, as with the other domain routers.
 * Every handler is safe against a dead upstream: sources return empty results
 * with a reason rather than throwing, so a Wikipedia outage degrades one
 * section of the page instead of failing the request.
 */
export const authenticRoutes = new Hono();

authenticRoutes.get("/media", async (c) => c.json(await getMediaOverview(c.get("user").id)));

authenticRoutes.get("/media/search", async (c) => {
  const query = c.req.query("q")?.trim();
  if (!query) {
    return c.json({ error: "invalid_query", message: "Search for a film, show, artist or book." }, 400);
  }
  return c.json(await searchMedia(c.get("user").id, query));
});

authenticRoutes.get("/media/films", async (c) =>
  c.json(
    await browseFilms(c.get("user").id, { animationOnly: c.req.query("animation") === "true" }),
  ),
);

authenticRoutes.get("/media/podcasts", async (c) => c.json(await browsePodcasts(c.get("user").id)));

authenticRoutes.get("/media/books", async (c) => c.json(await browseBooks(c.get("user").id)));

/** Open a Wikipedia article as a reading exercise. */
authenticRoutes.get("/media/article/:title", async (c) => {
  const article = await openArticle(c.get("user").id, decodeURIComponent(c.req.param("title")));
  if (!article) return c.json({ error: "not_found", message: "No article for that title." }, 404);
  return c.json(article);
});

/** Fetch an excerpt of a public-domain book. */
authenticRoutes.post("/media/book", async (c) => {
  const body = await c.req.json<{ textUrl?: string }>();
  if (!body.textUrl?.startsWith("https://www.gutenberg.org/")) {
    // Only Gutenberg URLs: this endpoint fetches and returns remote text, so an
    // open URL parameter would make the server a proxy for anything.
    return c.json({ error: "invalid_url", message: "Only Project Gutenberg texts are supported." }, 400);
  }

  const book = await openBook(body.textUrl);
  if (!book) return c.json({ error: "unavailable", message: "Could not fetch that text." }, 502);
  return c.json(book);
});

/** Credit time spent on authentic material. */
authenticRoutes.post("/media/complete", async (c) => {
  const body = await c.req.json<{ kind?: "reading" | "listening"; minutes?: number }>();
  return c.json(
    await recordMediaActivity({
      userId: c.get("user").id,
      kind: body.kind === "listening" ? "listening" : "reading",
      minutes: body.minutes,
    }),
  );
});

/**
 * Pronunciation audio for a word or sentence.
 *
 * Serves a real native recording where one exists and synthesis otherwise. The
 * web app uses the browser's own speech synthesis for instant feedback, but
 * this endpoint gives it the option of a human voice — and it is what the
 * Telegram bot uses, so both interfaces can sound the same.
 */
authenticRoutes.get("/speech", async (c) => {
  const text = c.req.query("text")?.trim();
  if (!text) {
    return c.json({ error: "invalid_query", message: "text is required." }, 400);
  }

  const audio = await getSpeech(text, {
    slow: c.req.query("slow") === "true",
    dialect: c.req.query("dialect") === "es-419" ? "es-419" : "es-ES",
  });

  if (!audio) {
    return c.json(
      {
        error: "unavailable",
        message: synthesisAvailable()
          ? "Could not produce audio for that."
          : "Speech synthesis needs GEMINI_API_KEY; only recorded single words are available.",
      },
      503,
    );
  }

  // Hono's c.body takes an ArrayBuffer; slice to the view's exact bounds so a
  // pooled Buffer does not leak neighbouring bytes into the response.
  const body = audio.data.buffer.slice(
    audio.data.byteOffset,
    audio.data.byteOffset + audio.data.byteLength,
  ) as ArrayBuffer;

  return c.body(body, 200, {
    "Content-Type": audio.mime,
    // Immutable: the same text always yields the same audio, and it is
    // already cached on disk by content hash.
    "Cache-Control": "public, max-age=604800, immutable",
    ...(audio.credit ? { "X-Audio-Credit": encodeURIComponent(audio.credit) } : {}),
    "X-Audio-Origin": audio.origin,
  });
});

/**
 * Break down one line of Spanish.
 *
 * The learner supplies the text, so this needs no content licence — it works on
 * a lyric they are reading elsewhere, a subtitle, or anything else they meet.
 */
authenticRoutes.post("/explain", async (c) => {
  const body = await c.req.json<{ line?: string; context?: string }>();
  const line = body.line?.trim();

  if (!line) {
    return c.json({ error: "invalid_body", message: "Paste a line of Spanish to break down." }, 400);
  }
  if (line.length > 400) {
    // A line at a time: the analysis is per-line, and long input is both a
    // worse explanation and a signal someone is pasting a whole work.
    return c.json(
      { error: "too_long", message: "One line at a time — up to about 400 characters." },
      400,
    );
  }

  return c.json(await explainSpanishLine(c.get("user").id, line, body.context));
});
