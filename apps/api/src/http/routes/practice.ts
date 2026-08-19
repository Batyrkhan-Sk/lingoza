import { Hono } from "hono";
import type { TutorScenario } from "@lingoza/engine";
import { prisma } from "../../db.js";
import { submitExercise } from "../../services/assessment.js";
import {
  getConversation,
  listConversations,
  sendConversationMessage,
  startConversation,
  submitSpeaking,
  submitWriting,
  getMistakePatterns,
} from "../../services/practice.js";
import { aiStatus } from "../../services/ai.js";

// Auth is applied centrally in http/app.ts, not per-router.
export const practiceRoutes = new Hono();

/** Grade an exercise. Answers are checked server-side, never in the client. */
practiceRoutes.post("/exercises/:id/submit", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    answers: { questionId: string; answer: string; seconds?: number; usedHint?: boolean }[];
    source?: "web" | "telegram" | "mobile";
  }>();

  if (!Array.isArray(body.answers)) {
    return c.json({ error: "invalid_body", message: "answers[] is required." }, 400);
  }

  const result = await submitExercise({
    userId: user.id,
    exerciseId: c.req.param("id"),
    answers: body.answers,
    source: body.source ?? "web",
  });

  return c.json(result);
});

// ─── Writing ─────────────────────────────────────────────────────────────────

practiceRoutes.get("/writing/prompts", async (c) => {
  const level = c.req.query("level");
  const prompts = await prisma.writingPrompt.findMany({
    where: level ? { levelCode: level } : {},
    orderBy: { levelCode: "asc" },
  });
  return c.json({ prompts });
});

practiceRoutes.post("/writing", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ promptId?: string; instruction?: string; text?: string }>();

  if (!body.text?.trim()) {
    return c.json({ error: "empty", message: "Write something first." }, 400);
  }

  const result = await submitWriting({
    userId: user.id,
    promptId: body.promptId,
    instruction: body.instruction,
    text: body.text,
  });

  return c.json(result);
});

practiceRoutes.get("/writing/history", async (c) => {
  const attempts = await prisma.writingAttempt.findMany({
    where: { userId: c.get("user").id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { prompt: { select: { title: true } }, corrections: true },
  });
  return c.json({ attempts });
});

// ─── Speaking ────────────────────────────────────────────────────────────────

practiceRoutes.get("/speaking/prompts", async (c) => {
  const level = c.req.query("level");
  const prompts = await prisma.speakingPrompt.findMany({
    where: level ? { levelCode: level } : {},
    orderBy: { levelCode: "asc" },
  });
  return c.json({ prompts });
});

practiceRoutes.post("/speaking", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    promptId?: string;
    transcript?: string;
    durationSeconds?: number;
    instruction?: string;
  }>();

  if (!body.transcript?.trim()) {
    return c.json(
      { error: "no_speech", message: "Nothing was recognised — check your microphone and try again." },
      400,
    );
  }

  const result = await submitSpeaking({
    userId: user.id,
    promptId: body.promptId,
    transcript: body.transcript,
    durationSeconds: body.durationSeconds,
    instruction: body.instruction,
  });

  return c.json(result);
});

practiceRoutes.get("/speaking/history", async (c) => {
  const attempts = await prisma.speakingAttempt.findMany({
    where: { userId: c.get("user").id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { prompt: { select: { title: true } }, corrections: true },
  });
  return c.json({ attempts });
});

// ─── AI tutor ────────────────────────────────────────────────────────────────

practiceRoutes.get("/tutor/status", (c) => c.json(aiStatus()));

practiceRoutes.get("/tutor/conversations", async (c) => {
  return c.json({ conversations: await listConversations(c.get("user").id) });
});

practiceRoutes.post("/tutor/conversations", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ scenario?: string; origin?: "web" | "telegram" | "mobile" }>();

  const result = await startConversation({
    userId: user.id,
    scenario: (body.scenario ?? "casual") as TutorScenario,
    origin: body.origin ?? "web",
  });

  return c.json(result, 201);
});

practiceRoutes.get("/tutor/conversations/:id", async (c) => {
  const conversation = await getConversation(c.get("user").id, c.req.param("id"));
  if (!conversation) return c.json({ error: "not_found" }, 404);
  return c.json(conversation);
});

practiceRoutes.post("/tutor/conversations/:id/messages", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ content?: string }>();

  if (!body.content?.trim()) {
    return c.json({ error: "empty", message: "Say something first." }, 400);
  }

  const result = await sendConversationMessage({
    userId: user.id,
    conversationId: c.req.param("id"),
    content: body.content,
  });

  return c.json(result);
});

/** The learner's recurring mistakes — the basis of targeted practice. */
practiceRoutes.get("/mistakes", async (c) => {
  return c.json({ patterns: await getMistakePatterns(c.get("user").id) });
});
