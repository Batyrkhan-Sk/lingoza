import { Hono } from "hono";
import type { LessonSection } from "@lingoza/engine";
import { prisma } from "../../db.js";
import {
  completeLessonSection,
  getCurriculum,
  getLesson,
  getNextLesson,
  startLesson,
} from "../../services/learning.js";

// Auth is applied centrally in http/app.ts, not per-router.
export const learnRoutes = new Hono();

/** The whole course tree with the learner's progress and lock state. */
learnRoutes.get("/curriculum", async (c) => {
  return c.json({ levels: await getCurriculum(c.get("user").id) });
});

learnRoutes.get("/lessons/next", async (c) => {
  const lesson = await getNextLesson(c.get("user").id);
  return c.json({
    lesson: lesson ? { slug: lesson.slug, title: lesson.title, objective: lesson.objective } : null,
  });
});

learnRoutes.get("/lessons/:slug", async (c) => {
  const lesson = await getLesson(c.get("user").id, c.req.param("slug"));
  if (!lesson) return c.json({ error: "not_found", message: "No such lesson." }, 404);
  return c.json(lesson);
});

learnRoutes.post("/lessons/:slug/start", async (c) => {
  const user = c.get("user");
  const lesson = await prisma.lesson.findUnique({ where: { slug: c.req.param("slug") } });
  if (!lesson) return c.json({ error: "not_found" }, 404);

  await startLesson(user.id, lesson.id);
  return c.json({ ok: true, lessonId: lesson.id });
});

/** Finish a section and get handed the next one — the cross-interface hinge. */
learnRoutes.post("/lessons/:slug/sections/:section/complete", async (c) => {
  const user = c.get("user");
  const lesson = await prisma.lesson.findUnique({ where: { slug: c.req.param("slug") } });
  if (!lesson) return c.json({ error: "not_found" }, 404);

  // A section can be completed with no body at all, so an unparseable or
  // absent payload is normal rather than an error.
  type SectionBody = { minutes?: number; source?: "web" | "telegram" | "mobile" };
  const body = await c.req.json<SectionBody>().catch((): SectionBody => ({}));

  const result = await completeLessonSection({
    userId: user.id,
    lessonId: lesson.id,
    section: c.req.param("section") as LessonSection,
    minutes: body.minutes,
    source: body.source ?? "web",
  });

  return c.json(result);
});

// ─── Grammar ─────────────────────────────────────────────────────────────────

learnRoutes.get("/grammar", async (c) => {
  const user = c.get("user");
  const level = c.req.query("level");

  const topics = await prisma.grammarTopic.findMany({
    where: level ? { levelCode: level } : {},
    orderBy: [{ levelCode: "asc" }, { orderIndex: "asc" }],
    include: { progress: { where: { userId: user.id } } },
  });

  return c.json({
    topics: topics.map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      levelCode: topic.levelCode,
      category: topic.category,
      formula: topic.formula,
      mastery: topic.progress[0]?.mastery ?? 0,
      status: topic.progress[0]?.status ?? "not_started",
    })),
  });
});

learnRoutes.get("/grammar/contrasts", async (c) => {
  const contrasts = await prisma.grammarContrast.findMany({
    include: {
      rows: { orderBy: { orderIndex: "asc" } },
      topicA: { select: { slug: true, levelCode: true } },
      topicB: { select: { slug: true, levelCode: true } },
    },
  });
  return c.json({ contrasts });
});

learnRoutes.get("/grammar/:slug", async (c) => {
  const user = c.get("user");
  const topic = await prisma.grammarTopic.findUnique({
    where: { slug: c.req.param("slug") },
    include: {
      examples: { orderBy: { orderIndex: "asc" } },
      mistakes: { orderBy: { orderIndex: "asc" } },
      progress: { where: { userId: user.id } },
      exercises: {
        include: { questions: { include: { options: true }, orderBy: { orderIndex: "asc" } } },
      },
      contrastsA: { include: { rows: { orderBy: { orderIndex: "asc" } } } },
      contrastsB: { include: { rows: { orderBy: { orderIndex: "asc" } } } },
    },
  });

  if (!topic) return c.json({ error: "not_found" }, 404);

  return c.json({
    ...topic,
    mastery: topic.progress[0]?.mastery ?? 0,
    status: topic.progress[0]?.status ?? "not_started",
    contrasts: [...topic.contrastsA, ...topic.contrastsB],
    exercises: topic.exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      prompt: exercise.prompt,
      questions: exercise.questions.map((question) => ({
        id: question.id,
        kind: question.kind,
        prompt: question.prompt,
        context: question.context,
        hint: question.hint,
        options: question.options.map((o) => ({ id: o.id, text: o.text })),
      })),
    })),
  });
});

// ─── Culture & scenarios ─────────────────────────────────────────────────────

learnRoutes.get("/culture", async (c) => {
  const notes = await prisma.cultureNote.findMany({ orderBy: { levelCode: "asc" } });
  return c.json({ notes });
});

learnRoutes.get("/scenarios", async (c) => {
  const scenarios = await prisma.scenario.findMany({ orderBy: { levelCode: "asc" } });
  return c.json({
    scenarios: scenarios.map((s) => ({
      ...s,
      usefulPhrases: s.usefulPhrases.split("\n").filter(Boolean),
    })),
  });
});
