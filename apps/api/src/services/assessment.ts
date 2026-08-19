import {
  checkAnswer,
  manualA1Outcome,
  parseLevel,
  scorePlacement,
  scoreQuiz,
  skillsFromPlacement,
  type CefrLevel,
  type Interface,
  type PlacementAnswer,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { recordActivity } from "./progress.js";
import { recomputeCourseProgress } from "./learning.js";

/**
 * Assessment: the placement test and exercise grading.
 *
 * Grading happens here, on the server, and correct answers are never sent to
 * the client before an answer is submitted — otherwise every quiz is one
 * devtools panel away from being meaningless.
 */

export async function getPlacementTest() {
  const questions = await prisma.placementQuestion.findMany({
    orderBy: [{ levelCode: "asc" }, { orderIndex: "asc" }],
    include: { options: { orderBy: { orderIndex: "asc" } } },
  });

  return questions.map((question) => ({
    id: question.id,
    section: question.section,
    prompt: question.prompt,
    context: question.context,
    // The level is withheld: showing "this is a C1 question" changes how hard
    // people try, which biases the estimate.
    audioText: question.audioText,
    options: question.options.map((option) => ({ id: option.id, text: option.text })),
  }));
}

export interface PlacementSubmission {
  userId: string;
  answers: { questionId: string; answer: string }[];
  /** Optional spoken sample, scored separately. */
  speakingScore?: number;
}

export async function submitPlacement(input: PlacementSubmission) {
  const { userId, answers, speakingScore } = input;

  const questions = await prisma.placementQuestion.findMany({
    where: { id: { in: answers.map((a) => a.questionId) } },
    include: { options: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  const graded: PlacementAnswer[] = [];
  const detail: { questionId: string; correct: boolean; explanation: string; correctAnswer: string }[] = [];

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue;

    const accepted = (question.acceptedAnswers ?? "").split("\n").filter(Boolean);
    const result = checkAnswer(answer.answer, question.correctAnswer, { accepted });

    graded.push({
      questionId: question.id,
      section: question.section as PlacementAnswer["section"],
      levelCode: question.levelCode as CefrLevel,
      isCorrect: result.isCorrect,
    });
    detail.push({
      questionId: question.id,
      correct: result.isCorrect,
      explanation: question.explanation,
      correctAnswer: question.correctAnswer,
    });
  }

  const outcome = scorePlacement(graded);
  if (typeof speakingScore === "number") {
    outcome.sectionScores.speaking = speakingScore;
  }

  const skills = skillsFromPlacement(outcome);

  const startingLesson = await firstLessonOfLevel(outcome.estimatedLevel);

  await prisma.$transaction([
    prisma.placementResult.create({
      data: {
        userId,
        estimatedLevel: outcome.estimatedLevel,
        confidence: outcome.confidence,
        vocabularyScore: outcome.sectionScores.vocabulary,
        grammarScore: outcome.sectionScores.grammar,
        readingScore: outcome.sectionScores.reading,
        listeningScore: outcome.sectionScores.listening,
        constructionScore: outcome.sectionScores.sentence_construction,
        speakingScore: speakingScore ?? null,
        correctCount: outcome.correctCount,
        questionCount: outcome.questionCount,
        recommendation: outcome.recommendation,
        recommendedModuleSlug: startingLesson?.module.slug ?? null,
      },
    }),
    prisma.userProgress.update({
      where: { userId },
      data: {
        currentLevelCode: outcome.estimatedLevel,
        placementLevelCode: outcome.estimatedLevel,
        listeningScore: skills.listening,
        speakingScore: skills.speaking,
        readingScore: skills.reading,
        writingScore: skills.writing,
        grammarScore: skills.grammar,
        vocabularyScore: skills.vocabulary,
      },
    }),
  ]);

  await recomputeCourseProgress(userId);

  return {
    ...outcome,
    detail,
    startingLesson: startingLesson
      ? { slug: startingLesson.slug, title: startingLesson.title, moduleTitle: startingLesson.module.title }
      : null,
  };
}

/** The learner chose "Start from A1" instead of taking the test. */
export async function skipPlacement(userId: string) {
  const outcome = manualA1Outcome();
  const startingLesson = await firstLessonOfLevel("A1");

  await prisma.$transaction([
    prisma.placementResult.create({
      data: {
        userId,
        estimatedLevel: "A1",
        confidence: 1,
        correctCount: 0,
        questionCount: 0,
        recommendation: outcome.recommendation,
        recommendedModuleSlug: startingLesson?.module.slug ?? null,
        skipped: true,
      },
    }),
    prisma.userProgress.update({
      where: { userId },
      data: { currentLevelCode: "A1", placementLevelCode: "A1" },
    }),
  ]);

  return {
    ...outcome,
    detail: [],
    startingLesson: startingLesson
      ? { slug: startingLesson.slug, title: startingLesson.title, moduleTitle: startingLesson.module.title }
      : null,
  };
}

async function firstLessonOfLevel(level: CefrLevel) {
  return prisma.lesson.findFirst({
    where: { module: { course: { level: { code: level } } } },
    orderBy: [{ module: { orderIndex: "asc" } }, { orderIndex: "asc" }],
    include: { module: true },
  });
}

export interface QuizSubmission {
  userId: string;
  exerciseId: string;
  answers: { questionId: string; answer: string; seconds?: number; usedHint?: boolean }[];
  source?: Interface;
}

/** Grade a whole exercise, record the result, and return per-question feedback. */
export async function submitExercise(input: QuizSubmission) {
  const { userId, exerciseId, answers, source = "web" } = input;

  const exercise = await prisma.exercise.findUniqueOrThrow({
    where: { id: exerciseId },
    include: {
      questions: { include: { options: true } },
      lesson: { include: { module: { include: { course: { include: { level: true } } } } } },
      grammarTopic: true,
    },
  });

  const byId = new Map(exercise.questions.map((q) => [q.id, q]));
  const results: boolean[] = [];
  const feedback: {
    questionId: string;
    correct: boolean;
    correctAnswer: string;
    explanation: string;
    note?: string;
    /** Why the specific wrong option they chose is wrong. */
    optionFeedback?: string;
  }[] = [];

  let hintsUsed = 0;

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue;
    if (answer.usedHint) hintsUsed += 1;

    const accepted = (question.acceptedAnswers ?? "").split("\n").filter(Boolean);
    const check = checkAnswer(answer.answer, question.correctAnswer, { accepted });

    const chosen = question.options.find((o) => o.text === answer.answer);

    results.push(check.isCorrect);
    feedback.push({
      questionId: question.id,
      correct: check.isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      note: check.note,
      optionFeedback: !check.isCorrect ? (chosen?.feedback ?? undefined) : undefined,
    });

    await prisma.questionAttempt.create({
      data: {
        userId,
        questionId: question.id,
        givenAnswer: answer.answer,
        isCorrect: check.isCorrect,
        timeSeconds: answer.seconds ?? 0,
        usedHint: answer.usedHint ?? false,
      },
    });
  }

  const level = parseLevel(exercise.lesson?.module.course.level.code);
  const score = scoreQuiz({ results, level, hintsUsed });

  const quizResult = await prisma.quizResult.create({
    data: {
      userId,
      exerciseId,
      lessonId: exercise.lessonId,
      score: score.score,
      correctCount: score.correctCount,
      questionCount: score.questionCount,
      xpEarned: score.xp,
      source,
    },
  });

  // Grammar mastery, when the exercise drills a specific structure.
  if (exercise.grammarTopicId) {
    await updateGrammarMastery(userId, exercise.grammarTopicId, score.score);
  }

  // A test section's score is the lesson's score.
  if (exercise.section === "test" && exercise.lessonId) {
    await prisma.lessonProgress.updateMany({
      where: { userId, lessonId: exercise.lessonId },
      data: { score: score.score },
    });
  }

  const activity = await recordActivity({
    userId,
    activity: "practice",
    skills: exercise.grammarTopicId
      ? { grammar: score.score }
      : { grammar: score.score, vocabulary: score.score },
    weight: Math.min(1, results.length / 8),
    xp: score.xp,
    minutes: Math.max(1, Math.round(results.length * 0.5)),
    source,
  });

  return { ...score, quizResultId: quizResult.id, feedback, activity };
}

export async function updateGrammarMastery(userId: string, topicId: string, score: number) {
  const existing = await prisma.grammarProgress.findUnique({
    where: { userId_topicId: { userId, topicId } },
  });

  // Same exponential moving average as skill scores, so mastery tracks recent
  // performance rather than being dragged down forever by an early failure.
  const mastery = existing ? existing.mastery + 0.3 * (score - existing.mastery) : score * 0.85;
  const status = mastery >= 85 ? "mastered" : mastery >= 60 ? "practised" : "learning";

  await prisma.grammarProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: {
      userId,
      topicId,
      mastery,
      status,
      timesSeen: 1,
      timesCorrect: score >= 70 ? 1 : 0,
      lastPractisedAt: new Date(),
    },
    update: {
      mastery,
      status,
      timesSeen: { increment: 1 },
      timesCorrect: { increment: score >= 70 ? 1 : 0 },
      lastPractisedAt: new Date(),
    },
  });
}
