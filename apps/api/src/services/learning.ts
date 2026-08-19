import {
  LESSON_SECTIONS,
  completeSection,
  isUnlocked,
  levelProgress,
  lockReason,
  parseSections,
  parseLevel,
  serializeSections,
  sessionProgress,
  XP_REWARDS,
  type LessonSection,
  type Interface,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { recordActivity, refreshDerivedCounters } from "./progress.js";

/**
 * Curriculum and lesson flow.
 *
 * Lesson position lives in the database, never in a client, which is what lets
 * a learner start a lesson in the browser and be handed the next section by
 * the Telegram bot (§19).
 */

export async function getCurriculum(userId: string) {
  const [levels, lessonProgress] = await Promise.all([
    prisma.level.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        courses: {
          orderBy: { orderIndex: "asc" },
          include: {
            modules: {
              orderBy: { orderIndex: "asc" },
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" },
                  include: { prerequisites: { include: { prerequisite: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({ where: { userId } }),
  ]);

  const progressByLesson = new Map(lessonProgress.map((p) => [p.lessonId, p]));
  const completed = new Set(
    lessonProgress.filter((p) => p.status === "completed").map((p) => p.lessonId),
  );

  return levels.map((level) => ({
    code: level.code,
    name: level.name,
    description: level.description,
    canDo: level.canDo,
    courses: level.courses.map((course) => ({
      slug: course.slug,
      title: course.title,
      description: course.description,
      modules: course.modules.map((module) => ({
        slug: module.slug,
        title: module.title,
        description: module.description,
        theme: module.theme,
        icon: module.icon,
        lessons: module.lessons.map((lesson) => {
          const progress = progressByLesson.get(lesson.id);
          const prerequisiteIds = lesson.prerequisites.map((p) => p.prerequisiteId);
          const unlocked = isUnlocked({ prerequisiteIds, completedLessonIds: completed });
          return {
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            objective: lesson.objective,
            estimatedMinutes: lesson.estimatedMinutes,
            status: progress?.status ?? "not_started",
            score: progress?.score ?? 0,
            unlocked,
            lockReason: unlocked
              ? null
              : lockReason({
                  prerequisites: lesson.prerequisites.map((p) => ({
                    id: p.prerequisite.id,
                    title: p.prerequisite.title,
                  })),
                  completedLessonIds: completed,
                }),
          };
        }),
      })),
    })),
  }));
}

/** Full lesson payload: all nine sections plus where the learner is in them. */
export async function getLesson(userId: string, slug: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { slug },
    include: {
      module: { include: { course: { include: { level: true } } } },
      examples: { orderBy: { orderIndex: "asc" } },
      vocabulary: { orderBy: { orderIndex: "asc" }, include: { word: true } },
      grammar: { orderBy: { orderIndex: "asc" }, include: { topic: { include: { examples: true, mistakes: true } } } },
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
      listening: { include: { segments: { orderBy: { orderIndex: "asc" } } } },
      reading: { include: { glossary: true } },
      speaking: true,
      writing: true,
      prerequisites: { include: { prerequisite: true } },
    },
  });

  if (!lesson) return null;

  const [progress, completedLessons] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    }),
    prisma.lessonProgress.findMany({ where: { userId, status: "completed" }, select: { lessonId: true } }),
  ]);

  const completedIds = new Set(completedLessons.map((l) => l.lessonId));
  const unlocked = isUnlocked({
    prerequisiteIds: lesson.prerequisites.map((p) => p.prerequisiteId),
    completedLessonIds: completedIds,
  });

  const available = sectionAvailability(lesson);
  const completedSections = parseSections(progress?.completedSections ?? "");

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
    explanation: lesson.explanation,
    review: lesson.review,
    culturalNote: lesson.culturalNote,
    level: lesson.module.course.level.code,
    moduleTitle: lesson.module.title,
    unlocked,
    lockReason: unlocked
      ? null
      : lockReason({
          prerequisites: lesson.prerequisites.map((p) => ({
            id: p.prerequisite.id,
            title: p.prerequisite.title,
          })),
          completedLessonIds: completedIds,
        }),
    sections: {
      available,
      current: (progress?.currentSection ?? "explanation") as LessonSection,
      completed: completedSections,
      progressPercent: sessionProgress(
        { currentSection: (progress?.currentSection ?? "explanation") as LessonSection, completedSections, status: "in_progress" },
        available,
      ),
    },
    status: progress?.status ?? "not_started",
    score: progress?.score ?? 0,
    examples: lesson.examples,
    vocabulary: lesson.vocabulary.map((v) => v.word),
    grammar: lesson.grammar.map((g) => g.topic),
    exercises: lesson.exercises.map(serializeExercise),
    listening: lesson.listening,
    reading: lesson.reading,
    speaking: lesson.speaking,
    writing: lesson.writing,
  };
}

type LessonWithSections = {
  explanation: string;
  examples: unknown[];
  vocabulary: unknown[];
  grammar: unknown[];
  listening: unknown[];
  speaking: unknown[];
  exercises: { section: string }[];
  review: string;
};

/** Which of the nine sections this lesson actually has content for. */
export function sectionAvailability(lesson: LessonWithSections) {
  const hasExerciseSection = (section: string) =>
    lesson.exercises.some((e) => e.section === section);

  const present: Record<LessonSection, boolean> = {
    explanation: lesson.explanation.trim().length > 0,
    examples: lesson.examples.length > 0,
    vocabulary: lesson.vocabulary.length > 0,
    grammar: lesson.grammar.length > 0,
    listening: lesson.listening.length > 0,
    practice: hasExerciseSection("practice"),
    speaking: lesson.speaking.length > 0,
    test: hasExerciseSection("test"),
    review: lesson.review.trim().length > 0,
  };

  return LESSON_SECTIONS.map((section) => ({ section, present: present[section] }));
}

/** Start or resume a lesson. */
export async function startLesson(userId: string, lessonId: string) {
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  if (existing) {
    await prisma.lessonProgress.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
  } else {
    await prisma.lessonProgress.create({
      data: { userId, lessonId, status: "in_progress", currentSection: "explanation" },
    });
  }

  await prisma.userProgress.update({ where: { userId }, data: { resumeLessonId: lessonId } });
  return existing;
}

/**
 * Mark a section finished and advance. Returns the next section, or null when
 * the lesson is complete — which is what every interface renders next.
 */
export async function completeLessonSection(input: {
  userId: string;
  lessonId: string;
  section: LessonSection;
  minutes?: number;
  source?: Interface;
}) {
  const { userId, lessonId, section, minutes = 1, source = "web" } = input;

  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: {
      examples: true,
      vocabulary: true,
      grammar: true,
      listening: true,
      speaking: true,
      exercises: { select: { section: true } },
    },
  });

  const progress =
    (await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } })) ??
    (await prisma.lessonProgress.create({
      data: { userId, lessonId, status: "in_progress" },
    }));

  const available = sectionAvailability(lesson);
  const next = completeSection(
    {
      currentSection: progress.currentSection as LessonSection,
      completedSections: parseSections(progress.completedSections),
      status: progress.status as "in_progress",
    },
    section,
    available,
  );

  const finished = next.status === "completed";

  await prisma.lessonProgress.update({
    where: { id: progress.id },
    data: {
      currentSection: next.currentSection,
      completedSections: serializeSections(next.completedSections),
      status: next.status,
      completedAt: finished ? new Date() : null,
      studyMinutes: progress.studyMinutes + minutes,
      lastSeenAt: new Date(),
      attempts: finished ? progress.attempts + 1 : progress.attempts,
    },
  });

  const activity = await recordActivity({
    userId,
    activity: "lesson",
    minutes,
    xp: finished ? XP_REWARDS.lessonComplete : XP_REWARDS.lessonSection,
    source,
  });

  if (finished) {
    await refreshDerivedCounters(userId);
    await recomputeCourseProgress(userId);
    await prisma.userProgress.update({ where: { userId }, data: { resumeLessonId: null } });
  }

  return {
    nextSection: finished ? null : next.currentSection,
    completed: finished,
    progressPercent: sessionProgress(next, available),
    activity,
  };
}

/** Recompute how far through their current level the learner is. */
export async function recomputeCourseProgress(userId: string): Promise<number> {
  const progress = await prisma.userProgress.findUniqueOrThrow({ where: { userId } });
  const level = parseLevel(progress.currentLevelCode);

  const lessons = await prisma.lesson.findMany({
    where: { module: { course: { level: { code: level } } } },
    select: { id: true },
  });

  const lessonProgress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
  });
  const byId = new Map(lessonProgress.map((p) => [p.lessonId, p]));

  const percent = levelProgress({
    lessons: lessons.map((lesson) => {
      const p = byId.get(lesson.id);
      return { completed: p?.status === "completed", score: p?.score ?? 0 };
    }),
  });

  await prisma.userProgress.update({ where: { userId }, data: { overallProgress: percent } });
  return percent;
}

/** The next lesson the learner can actually start. */
export async function getNextLesson(userId: string) {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const level = parseLevel(progress?.currentLevelCode);

  const lessons = await prisma.lesson.findMany({
    where: { module: { course: { level: { code: level } } } },
    orderBy: [{ module: { orderIndex: "asc" } }, { orderIndex: "asc" }],
    include: { prerequisites: true },
  });

  const done = await prisma.lessonProgress.findMany({ where: { userId } });
  const completed = new Set(done.filter((d) => d.status === "completed").map((d) => d.lessonId));

  for (const lesson of lessons) {
    if (completed.has(lesson.id)) continue;
    if (!isUnlocked({ prerequisiteIds: lesson.prerequisites.map((p) => p.prerequisiteId), completedLessonIds: completed })) {
      continue;
    }
    return lesson;
  }
  return null;
}

function serializeExercise(exercise: {
  id: string;
  title: string;
  kind: string;
  prompt: string;
  section: string;
  questions: {
    id: string;
    kind: string;
    prompt: string;
    context: string | null;
    explanation: string;
    hint: string | null;
    points: number;
    options: { id: string; text: string; orderIndex: number }[];
  }[];
}) {
  return {
    id: exercise.id,
    title: exercise.title,
    kind: exercise.kind,
    prompt: exercise.prompt,
    section: exercise.section,
    questions: exercise.questions.map((question) => ({
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      context: question.context,
      hint: question.hint,
      points: question.points,
      // correctAnswer and explanation are deliberately NOT sent to the client:
      // answers are graded server-side so they cannot be read out of the
      // network response before answering.
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    })),
  };
}
