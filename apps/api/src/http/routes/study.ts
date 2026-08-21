import { Hono } from "hono";
import type { RecallGrade } from "@lingoza/engine";
import { prisma } from "../../db.js";
import { currentDailyItem } from "../../services/dailyProgress.js";
import {
  getDueQueue,
  getDueSummary,
  getNewWordBudget,
  listVocabulary,
  reviewVocabulary,
  vocabularyTopics,
} from "../../services/vocabulary.js";
import {
  completeListening,
  completeReading,
  examplesForWord,
  realUsageForWord,
  getListening,
  getReading,
  listListening,
  listReading,
  lookupWord,
} from "../../services/media.js";
import { completeDailyItem, getDailySession, getHome } from "../../services/planner.js";
import { getDashboard, listAchievements } from "../../services/progress.js";
import { getPlacementTest, skipPlacement, submitPlacement } from "../../services/assessment.js";
import {
  createGrammarMnemonic,
  createWordMnemonic,
  deleteMnemonic,
  getGrammarMnemonics,
  getWordMnemonics,
  rateMnemonic,
} from "../../services/mnemonics.js";

// Auth is applied centrally in http/app.ts, not per-router.
export const studyRoutes = new Hono();

// ─── Home & dashboard ────────────────────────────────────────────────────────

studyRoutes.get("/home", async (c) => c.json(await getHome(c.get("user").id)));
studyRoutes.get("/dashboard", async (c) => c.json(await getDashboard(c.get("user").id)));
studyRoutes.get("/achievements", async (c) =>
  c.json({ achievements: await listAchievements(c.get("user").id) }),
);

// ─── Daily session ───────────────────────────────────────────────────────────

studyRoutes.get("/daily", async (c) => {
  const regenerate = c.req.query("regenerate") === "true";
  return c.json(await getDailySession(c.get("user").id, regenerate));
});

studyRoutes.post("/daily/items/:id/complete", async (c) => {
  return c.json(await completeDailyItem(c.get("user").id, c.req.param("id")));
});

// ─── Placement ───────────────────────────────────────────────────────────────

studyRoutes.get("/placement", async (c) => c.json({ questions: await getPlacementTest() }));

studyRoutes.post("/placement/submit", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    answers: { questionId: string; answer: string }[];
    speakingScore?: number;
  }>();

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return c.json({ error: "invalid_body", message: "answers[] is required." }, 400);
  }

  return c.json(
    await submitPlacement({
      userId: user.id,
      answers: body.answers,
      speakingScore: body.speakingScore,
    }),
  );
});

studyRoutes.post("/placement/skip", async (c) => c.json(await skipPlacement(c.get("user").id)));

// ─── Vocabulary ──────────────────────────────────────────────────────────────

studyRoutes.get("/vocabulary", async (c) => {
  const words = await listVocabulary(c.get("user").id, {
    level: c.req.query("level"),
    topic: c.req.query("topic"),
    status: c.req.query("status"),
    search: c.req.query("search"),
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  });
  return c.json({ words });
});

studyRoutes.get("/vocabulary/topics", async (c) => c.json({ topics: await vocabularyTopics() }));

studyRoutes.get("/vocabulary/due", async (c) => {
  const user = c.get("user");
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;

  // Today's plan decides what this session is for. While its review item is
  // open the queue is due words; once that budget is spent the vocabulary item
  // takes over and the queue is new words. With no open item — a learner who
  // has finished their plan and wants more — the queue is simply everything.
  const planned = await currentDailyItem(user.id, ["review", "vocabulary"]);
  const only = planned?.kind === "review" ? "due" : planned?.kind === "vocabulary" ? "new" : undefined;

  const [queue, summary, budget] = await Promise.all([
    getDueQueue(user.id, limit, { only }),
    getDueSummary(user.id),
    getNewWordBudget(user.id),
  ]);
  // The budget travels with the queue so both interfaces can say *why* new
  // words stopped, rather than silently running dry.
  return c.json({
    queue,
    summary,
    budget,
    plan: planned
      ? { title: planned.title, quantity: planned.quantity, progress: planned.progress }
      : null,
  });
});

studyRoutes.post("/vocabulary/:id/review", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    grade?: RecallGrade;
    answer?: string;
    seconds?: number;
    usedHint?: boolean;
    source?: "web" | "telegram" | "mobile";
  }>();

  if (!body.grade && body.answer === undefined) {
    return c.json({ error: "invalid_body", message: "Provide a grade or an answer." }, 400);
  }

  return c.json(
    await reviewVocabulary({
      userId: user.id,
      wordId: c.req.param("id"),
      grade: body.grade,
      answer: body.answer,
      seconds: body.seconds,
      usedHint: body.usedHint,
      source: body.source ?? "web",
    }),
  );
});

/** The word in real Spanish — news, encyclopedic and everyday registers. */
studyRoutes.get("/vocabulary/:id/usage", async (c) =>
  c.json(await realUsageForWord(c.get("user").id, c.req.param("id"))),
);

studyRoutes.get("/vocabulary/:id/examples", async (c) =>
  c.json(await examplesForWord(c.get("user").id, c.req.param("id"))),
);

// ─── Listening ───────────────────────────────────────────────────────────────

studyRoutes.get("/listening", async (c) =>
  c.json({ exercises: await listListening(c.get("user").id, c.req.query("level")) }),
);

studyRoutes.get("/listening/:slug", async (c) => {
  const exercise = await getListening(c.req.param("slug"));
  if (!exercise) return c.json({ error: "not_found" }, 404);
  return c.json(exercise);
});

studyRoutes.post("/listening/:slug/complete", async (c) => {
  const user = c.get("user");
  const exercise = await getListening(c.req.param("slug"));
  if (!exercise) return c.json({ error: "not_found" }, 404);

  const body = await c.req.json<{ score?: number }>().catch(() => ({ score: undefined }));
  return c.json(
    await completeListening({ userId: user.id, listeningId: exercise.id, score: body.score }),
  );
});

// ─── Reading ─────────────────────────────────────────────────────────────────

studyRoutes.get("/reading", async (c) =>
  c.json(await listReading(c.get("user").id, c.req.query("level"))),
);

studyRoutes.get("/reading/:slug", async (c) => {
  const text = await getReading(c.req.param("slug"));
  if (!text) return c.json({ error: "not_found" }, 404);
  return c.json(text);
});

studyRoutes.post("/reading/:slug/complete", async (c) => {
  const body = await c.req.json<{ score?: number }>().catch(() => ({ score: undefined }));
  return c.json(await completeReading({ userId: c.get("user").id, score: body.score }));
});

/** Click-to-translate, used by both the reading and listening screens. */
studyRoutes.post("/lookup", async (c) => {
  const body = await c.req.json<{ word?: string; sentence?: string; readingSlug?: string }>();
  if (!body.word?.trim()) {
    return c.json({ error: "invalid_body", message: "word is required." }, 400);
  }

  return c.json(
    await lookupWord({
      userId: c.get("user").id,
      word: body.word,
      sentence: body.sentence ?? "",
      readingSlug: body.readingSlug,
    }),
  );
});

// ─── Progress detail ─────────────────────────────────────────────────────────

studyRoutes.get("/progress/history", async (c) => {
  const userId = c.get("user").id;
  const [quizzes, sessions, goals] = await Promise.all([
    prisma.quizResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { lesson: { select: { title: true } } },
    }),
    prisma.studySession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
    prisma.dailyGoal.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 30 }),
  ]);

  return c.json({ quizzes, sessions, goals });
});

// ─── Memory hooks ────────────────────────────────────────────────────────────

/**
 * Hooks for a word. Requested only after a recall attempt — the client does not
 * pre-fetch these, because seeing the hook before trying removes the retrieval
 * practice that does the actual work.
 */
studyRoutes.get("/mnemonics/word/:wordId", async (c) =>
  c.json(await getWordMnemonics(c.get("user").id, c.req.param("wordId"))),
);

studyRoutes.post("/mnemonics/word/:wordId/generate", async (c) =>
  c.json(await createWordMnemonic(c.get("user").id, c.req.param("wordId"))),
);

studyRoutes.get("/mnemonics/grammar/:topicId", async (c) =>
  c.json(await getGrammarMnemonics(c.get("user").id, c.req.param("topicId"))),
);

studyRoutes.post("/mnemonics/grammar/:topicId/generate", async (c) =>
  c.json(await createGrammarMnemonic(c.get("user").id, c.req.param("topicId"))),
);

studyRoutes.post("/mnemonics/:id/rate", async (c) => {
  const body = await c.req.json<{ helpful?: boolean }>();
  if (typeof body.helpful !== "boolean") {
    return c.json({ error: "invalid_body", message: "helpful must be true or false." }, 400);
  }
  const updated = await rateMnemonic(c.get("user").id, c.req.param("id"), body.helpful);
  return c.json({ helpfulCount: updated.helpfulCount, unhelpfulCount: updated.unhelpfulCount });
});

studyRoutes.delete("/mnemonics/:id", async (c) => {
  const removed = await deleteMnemonic(c.get("user").id, c.req.param("id"));
  return removed ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404);
});
