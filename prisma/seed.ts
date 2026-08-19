/**
 * Seed the database from @lingoza/content.
 *
 * The curriculum is verified before anything is written: material that fails
 * verification is material a learner would be taught wrongly, so a failing
 * check aborts the seed rather than warning and continuing.
 *
 * Idempotent — safe to re-run after editing content. Existing rows are updated
 * in place by slug, so learner progress (which references ids) survives.
 */
import { PrismaClient } from "@prisma/client";
import {
  COURSES,
  CULTURE_NOTES,
  GRAMMAR_MNEMONICS,
  WORD_MNEMONICS,
  GRAMMAR_CONTRASTS,
  GRAMMAR_TOPICS,
  PLACEMENT_QUESTIONS,
  SCENARIOS,
  VOCABULARY,
  formatReport,
  verifyCurriculum,
} from "@lingoza/content";
import { ACHIEVEMENTS, CEFR_LEVELS, LEVEL_DESCRIPTIONS, countWords } from "@lingoza/engine";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const report = verifyCurriculum();
  if (!report.ok) {
    console.error(formatReport(report));
    throw new Error("Content verification failed — refusing to seed incorrect material.");
  }
  console.log(
    `Content verified: ${report.checked.lessons} lessons, ${report.checked.words} words, ${report.warnings} warnings.\n`,
  );

  // ─── Levels ────────────────────────────────────────────────────────────────
  for (const [index, code] of CEFR_LEVELS.entries()) {
    const meta = LEVEL_DESCRIPTIONS[code];
    await prisma.level.upsert({
      where: { code },
      create: {
        code,
        name: meta.name,
        description: meta.canDo,
        canDo: meta.canDo,
        orderIndex: index,
      },
      update: { name: meta.name, description: meta.canDo, canDo: meta.canDo, orderIndex: index },
    });
  }
  console.log(`✓ ${CEFR_LEVELS.length} levels`);

  // ─── Vocabulary ────────────────────────────────────────────────────────────
  for (const word of VOCABULARY) {
    await prisma.vocabularyWord.upsert({
      where: { spanish_levelCode: { spanish: word.spanish, levelCode: word.levelCode } },
      create: {
        spanish: word.spanish,
        english: word.english,
        pronunciation: word.pronunciation,
        exampleSentence: word.exampleSentence,
        exampleTranslation: word.exampleTranslation,
        difficulty: word.difficulty,
        levelCode: word.levelCode,
        topic: word.topic,
        partOfSpeech: word.partOfSpeech,
        gender: word.gender ?? null,
        pluralForm: word.pluralForm ?? null,
        frequencyRank: word.frequencyRank ?? null,
        region: word.region ?? null,
        regionalVariant: word.regionalVariant ?? null,
      },
      update: {
        english: word.english,
        pronunciation: word.pronunciation,
        exampleSentence: word.exampleSentence,
        exampleTranslation: word.exampleTranslation,
        difficulty: word.difficulty,
        topic: word.topic,
        partOfSpeech: word.partOfSpeech,
        gender: word.gender ?? null,
        pluralForm: word.pluralForm ?? null,
        frequencyRank: word.frequencyRank ?? null,
      },
    });
  }

  // Word relations need every word to exist first, hence the second pass.
  const wordsBySpanish = new Map(
    (await prisma.vocabularyWord.findMany()).map((w) => [stripArticle(w.spanish), w]),
  );

  for (const word of VOCABULARY) {
    const source = wordsBySpanish.get(stripArticle(word.spanish));
    if (!source) continue;

    const edges: { kind: string; targets: string[] }[] = [
      { kind: "synonym", targets: word.synonyms ?? [] },
      { kind: "antonym", targets: word.antonyms ?? [] },
      { kind: "related", targets: word.related ?? [] },
    ];

    for (const { kind, targets } of edges) {
      for (const targetName of targets) {
        const target = wordsBySpanish.get(stripArticle(targetName));
        if (!target || target.id === source.id) continue;
        await prisma.wordRelation.upsert({
          where: { sourceId_targetId_kind: { sourceId: source.id, targetId: target.id, kind } },
          create: { sourceId: source.id, targetId: target.id, kind },
          update: {},
        });
      }
    }
  }
  console.log(`✓ ${VOCABULARY.length} vocabulary words`);

  // ─── Grammar ───────────────────────────────────────────────────────────────
  for (const [index, topic] of GRAMMAR_TOPICS.entries()) {
    const record = await prisma.grammarTopic.upsert({
      where: { slug: topic.slug },
      create: {
        slug: topic.slug,
        title: topic.title,
        levelCode: topic.levelCode,
        orderIndex: index,
        category: topic.category,
        explanation: topic.explanation,
        whenToUse: topic.whenToUse,
        formula: topic.formula,
      },
      update: {
        title: topic.title,
        levelCode: topic.levelCode,
        orderIndex: index,
        category: topic.category,
        explanation: topic.explanation,
        whenToUse: topic.whenToUse,
        formula: topic.formula,
      },
    });

    // Examples and mistakes are replaced wholesale — they have no learner
    // state attached, so rewriting them is simpler than diffing.
    await prisma.grammarExample.deleteMany({ where: { topicId: record.id } });
    await prisma.commonMistake.deleteMany({ where: { topicId: record.id } });

    await prisma.grammarExample.createMany({
      data: topic.examples.map((example, order) => ({
        topicId: record.id,
        spanish: example.spanish,
        english: example.english,
        note: example.note ?? null,
        realWorld: example.realWorld ?? false,
        orderIndex: order,
      })),
    });

    await prisma.commonMistake.createMany({
      data: topic.mistakes.map((mistake, order) => ({
        topicId: record.id,
        wrong: mistake.wrong,
        right: mistake.right,
        explanation: mistake.explanation,
        orderIndex: order,
      })),
    });
  }

  for (const contrast of GRAMMAR_CONTRASTS) {
    const [topicA, topicB] = await Promise.all([
      prisma.grammarTopic.findUnique({ where: { slug: contrast.topicASlug } }),
      prisma.grammarTopic.findUnique({ where: { slug: contrast.topicBSlug } }),
    ]);
    if (!topicA || !topicB) continue;

    const record = await prisma.grammarContrast.upsert({
      where: { slug: contrast.slug },
      create: {
        slug: contrast.slug,
        title: contrast.title,
        summary: contrast.summary,
        detail: contrast.detail,
        topicAId: topicA.id,
        labelA: contrast.labelA,
        topicBId: topicB.id,
        labelB: contrast.labelB,
      },
      update: {
        title: contrast.title,
        summary: contrast.summary,
        detail: contrast.detail,
        topicAId: topicA.id,
        labelA: contrast.labelA,
        topicBId: topicB.id,
        labelB: contrast.labelB,
      },
    });

    await prisma.contrastRow.deleteMany({ where: { contrastId: record.id } });
    await prisma.contrastRow.createMany({
      data: contrast.rows.map((row, order) => ({
        contrastId: record.id,
        dimension: row.dimension,
        sideA: row.sideA,
        sideB: row.sideB,
        exampleA: row.exampleA,
        exampleB: row.exampleB,
        orderIndex: order,
      })),
    });
  }
  console.log(`✓ ${GRAMMAR_TOPICS.length} grammar topics, ${GRAMMAR_CONTRASTS.length} contrasts`);

  // ─── Courses → modules → lessons ───────────────────────────────────────────
  const lessonIdsBySlug = new Map<string, string>();

  for (const [courseIndex, course] of COURSES.entries()) {
    const level = await prisma.level.findUniqueOrThrow({ where: { code: course.levelCode } });

    const courseRecord = await prisma.course.upsert({
      where: { slug: course.slug },
      create: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        orderIndex: courseIndex,
        levelId: level.id,
      },
      update: {
        title: course.title,
        description: course.description,
        orderIndex: courseIndex,
        levelId: level.id,
      },
    });

    for (const [moduleIndex, module] of course.modules.entries()) {
      const moduleRecord = await prisma.module.upsert({
        where: { slug: module.slug },
        create: {
          slug: module.slug,
          title: module.title,
          description: module.description,
          theme: module.theme,
          icon: module.icon,
          orderIndex: moduleIndex,
          courseId: courseRecord.id,
        },
        update: {
          title: module.title,
          description: module.description,
          theme: module.theme,
          icon: module.icon,
          orderIndex: moduleIndex,
          courseId: courseRecord.id,
        },
      });

      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        const lessonRecord = await prisma.lesson.upsert({
          where: { slug: lesson.slug },
          create: {
            slug: lesson.slug,
            title: lesson.title,
            objective: lesson.objective,
            orderIndex: lessonIndex,
            estimatedMinutes: lesson.estimatedMinutes,
            explanation: lesson.explanation,
            review: lesson.review,
            culturalNote: lesson.culturalNote ?? null,
            moduleId: moduleRecord.id,
          },
          update: {
            title: lesson.title,
            objective: lesson.objective,
            orderIndex: lessonIndex,
            estimatedMinutes: lesson.estimatedMinutes,
            explanation: lesson.explanation,
            review: lesson.review,
            culturalNote: lesson.culturalNote ?? null,
            moduleId: moduleRecord.id,
          },
        });

        lessonIdsBySlug.set(lesson.slug, lessonRecord.id);
        await seedLessonContent(lessonRecord.id, lesson, wordsBySpanish);
      }
    }
  }

  // Prerequisites, once every lesson id is known.
  for (const course of COURSES) {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        const lessonId = lessonIdsBySlug.get(lesson.slug);
        if (!lessonId) continue;

        for (const prereqSlug of lesson.prerequisites ?? []) {
          const prerequisiteId = lessonIdsBySlug.get(prereqSlug);
          if (!prerequisiteId) continue;
          await prisma.lessonPrerequisite.upsert({
            where: { lessonId_prerequisiteId: { lessonId, prerequisiteId } },
            create: { lessonId, prerequisiteId },
            update: {},
          });
        }
      }
    }
  }
  console.log(`✓ ${lessonIdsBySlug.size} lessons across ${COURSES.length} courses`);

  // ─── Placement bank ────────────────────────────────────────────────────────
  await prisma.placementQuestion.deleteMany({});
  for (const [index, question] of PLACEMENT_QUESTIONS.entries()) {
    await prisma.placementQuestion.create({
      data: {
        section: question.section,
        levelCode: question.levelCode,
        prompt: question.prompt,
        context: question.context ?? null,
        correctAnswer: question.correctAnswer,
        acceptedAnswers: (question.acceptedAnswers ?? []).join("\n") || null,
        explanation: question.explanation,
        audioText: question.audioText ?? null,
        orderIndex: index,
        options: {
          create: (question.options ?? []).map((text, order) => ({
            text,
            isCorrect: text === question.correctAnswer,
            orderIndex: order,
          })),
        },
      },
    });
  }
  console.log(`✓ ${PLACEMENT_QUESTIONS.length} placement questions`);

  // ─── Culture, scenarios, achievements ──────────────────────────────────────
  for (const note of CULTURE_NOTES) {
    await prisma.cultureNote.upsert({
      where: { slug: note.slug },
      create: { ...note, place: note.place ?? null },
      update: { ...note, place: note.place ?? null },
    });
  }

  for (const scenario of SCENARIOS) {
    const data = {
      title: scenario.title,
      levelCode: scenario.levelCode,
      setting: scenario.setting,
      goal: scenario.goal,
      tutorRole: scenario.tutorRole,
      icon: scenario.icon,
      usefulPhrases: scenario.usefulPhrases.join("\n"),
    };
    await prisma.scenario.upsert({
      where: { slug: scenario.slug },
      create: { slug: scenario.slug, ...data },
      update: data,
    });
  }

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      create: achievement,
      update: achievement,
    });
  }
  console.log(
    `✓ ${CULTURE_NOTES.length} culture notes, ${SCENARIOS.length} scenarios, ${ACHIEVEMENTS.length} achievements`,
  );

  // ─── Memory hooks ──────────────────────────────────────────────────────────
  // Curated hooks have userId null, so they are shared by every learner.
  // Personal AI-generated ones are never touched by the seed.
  await prisma.mnemonic.deleteMany({ where: { origin: "curated" } });

  let hooks = 0;
  for (const mnemonic of GRAMMAR_MNEMONICS) {
    const topic = await prisma.grammarTopic.findUnique({ where: { slug: mnemonic.grammarSlug } });
    if (!topic) continue;
    await prisma.mnemonic.create({
      data: {
        kind: mnemonic.kind,
        scope: "grammar",
        hook: mnemonic.hook,
        imagery: mnemonic.imagery ?? null,
        explanation: mnemonic.explanation ?? null,
        origin: "curated",
        grammarTopicId: topic.id,
      },
    });
    hooks += 1;
  }

  for (const mnemonic of WORD_MNEMONICS) {
    const word = wordsBySpanish.get(stripArticle(mnemonic.spanish));
    if (!word) continue;
    await prisma.mnemonic.create({
      data: {
        kind: mnemonic.kind,
        scope: "word",
        hook: mnemonic.hook,
        keyword: mnemonic.keyword ?? null,
        imagery: mnemonic.imagery ?? null,
        explanation: mnemonic.explanation ?? null,
        origin: "curated",
        wordId: word.id,
      },
    });
    hooks += 1;
  }
  console.log(`✓ ${hooks} curated memory hooks`);

  console.log("\nSeed complete.\n");
}

/** Lesson-attached content: examples, links, exercises, media, prompts. */
async function seedLessonContent(
  lessonId: string,
  lesson: (typeof COURSES)[number]["modules"][number]["lessons"][number],
  wordsBySpanish: Map<string, { id: string }>,
): Promise<void> {
  await prisma.lessonExample.deleteMany({ where: { lessonId } });
  await prisma.lessonExample.createMany({
    data: (lesson.examples ?? []).map((example, order) => ({
      lessonId,
      spanish: example.spanish,
      english: example.english,
      note: example.note ?? null,
      orderIndex: order,
    })),
  });

  // Vocabulary links
  await prisma.lessonVocabulary.deleteMany({ where: { lessonId } });
  for (const [order, name] of (lesson.vocabulary ?? []).entries()) {
    const word = wordsBySpanish.get(stripArticle(name));
    if (!word) continue;
    await prisma.lessonVocabulary.create({
      data: { lessonId, wordId: word.id, orderIndex: order },
    });
  }

  // Grammar links
  await prisma.lessonGrammar.deleteMany({ where: { lessonId } });
  for (const [order, slug] of (lesson.grammar ?? []).entries()) {
    const topic = await prisma.grammarTopic.findUnique({ where: { slug } });
    if (!topic) continue;
    await prisma.lessonGrammar.create({
      data: { lessonId, topicId: topic.id, orderIndex: order },
    });
  }

  // Exercises are replaced wholesale. Learner attempts reference question ids,
  // so this does discard historical attempt links for edited exercises — an
  // acceptable trade for content that is still being authored.
  await prisma.exercise.deleteMany({ where: { lessonId } });
  for (const [order, exercise] of (lesson.exercises ?? []).entries()) {
    const topic = exercise.grammarSlug
      ? await prisma.grammarTopic.findUnique({ where: { slug: exercise.grammarSlug } })
      : null;

    await prisma.exercise.create({
      data: {
        lessonId,
        title: exercise.title,
        kind: exercise.kind,
        prompt: exercise.prompt,
        section: exercise.section,
        orderIndex: order,
        grammarTopicId: topic?.id ?? null,
        questions: {
          create: exercise.questions.map((question, questionOrder) => ({
            kind: question.kind,
            prompt: question.prompt,
            context: question.context ?? null,
            correctAnswer: question.correctAnswer,
            acceptedAnswers: (question.acceptedAnswers ?? []).join("\n") || null,
            explanation: question.explanation,
            hint: question.hint ?? null,
            points: question.points ?? 10,
            orderIndex: questionOrder,
            options: {
              create: (question.options ?? []).map((option, optionOrder) => ({
                text: option.text,
                isCorrect: option.text === question.correctAnswer,
                feedback: option.feedback ?? null,
                orderIndex: optionOrder,
              })),
            },
          })),
        },
      },
    });
  }

  // Listening
  for (const listening of lesson.listening ?? []) {
    const record = await prisma.listeningExercise.upsert({
      where: { slug: listening.slug },
      create: {
        slug: listening.slug,
        title: listening.title,
        levelCode: listening.levelCode,
        format: listening.format,
        speed: listening.speed,
        accent: listening.accent,
        region: listening.region,
        intro: listening.intro ?? null,
        lessonId,
        durationSeconds: listening.segments.length * 4,
      },
      update: {
        title: listening.title,
        intro: listening.intro ?? null,
        lessonId,
      },
    });

    await prisma.listeningSegment.deleteMany({ where: { listeningId: record.id } });
    await prisma.listeningSegment.createMany({
      data: listening.segments.map((segment, order) => ({
        listeningId: record.id,
        orderIndex: order,
        speaker: segment.speaker ?? null,
        spanish: segment.spanish,
        english: segment.english,
        // Timings are approximate until real audio is attached; the client
        // uses them only to highlight the current line during playback.
        startSeconds: order * 4,
        endSeconds: (order + 1) * 4,
      })),
    });

    if (listening.questions?.length) {
      await prisma.exercise.deleteMany({ where: { listeningId: record.id } });
      await prisma.exercise.create({
        data: {
          title: `${listening.title} — comprehension`,
          kind: "listening",
          prompt: "Answer based on what you heard.",
          section: "practice",
          listeningId: record.id,
          questions: {
            create: listening.questions.map((question, order) => ({
              kind: question.kind,
              prompt: question.prompt,
              correctAnswer: question.correctAnswer,
              acceptedAnswers: (question.acceptedAnswers ?? []).join("\n") || null,
              explanation: question.explanation,
              orderIndex: order,
              options: {
                create: (question.options ?? []).map((option, optionOrder) => ({
                  text: option.text,
                  isCorrect: option.text === question.correctAnswer,
                  feedback: option.feedback ?? null,
                  orderIndex: optionOrder,
                })),
              },
            })),
          },
        },
      });
    }
  }

  // Reading
  for (const reading of lesson.reading ?? []) {
    const record = await prisma.readingText.upsert({
      where: { slug: reading.slug },
      create: {
        slug: reading.slug,
        title: reading.title,
        levelCode: reading.levelCode,
        genre: reading.genre,
        body: reading.body,
        intro: reading.intro ?? null,
        source: reading.source ?? null,
        wordCount: countWords(reading.body),
        estimatedMinutes: Math.max(2, Math.round(countWords(reading.body) / 80)),
        lessonId,
      },
      update: { body: reading.body, intro: reading.intro ?? null, lessonId },
    });

    await prisma.readingGlossaryEntry.deleteMany({ where: { readingId: record.id } });
    await prisma.readingGlossaryEntry.createMany({
      data: (reading.glossary ?? []).map((entry) => ({
        readingId: record.id,
        term: entry.term,
        meaning: entry.meaning,
        note: entry.note ?? null,
      })),
    });

    if (reading.questions?.length) {
      await prisma.exercise.deleteMany({ where: { readingId: record.id } });
      await prisma.exercise.create({
        data: {
          title: `${reading.title} — comprehension`,
          kind: "reading",
          prompt: "Answer based on the text.",
          section: "practice",
          readingId: record.id,
          questions: {
            create: reading.questions.map((question, order) => ({
              kind: question.kind,
              prompt: question.prompt,
              correctAnswer: question.correctAnswer,
              acceptedAnswers: (question.acceptedAnswers ?? []).join("\n") || null,
              explanation: question.explanation,
              orderIndex: order,
              options: {
                create: (question.options ?? []).map((option, optionOrder) => ({
                  text: option.text,
                  isCorrect: option.text === question.correctAnswer,
                  feedback: option.feedback ?? null,
                  orderIndex: optionOrder,
                })),
              },
            })),
          },
        },
      });
    }
  }

  // Speaking & writing prompts
  for (const prompt of lesson.speaking ?? []) {
    const data = {
      title: prompt.title,
      levelCode: prompt.levelCode,
      instruction: prompt.instruction,
      targetText: prompt.targetText ?? null,
      focusSounds: (prompt.focusSounds ?? []).join(",") || null,
      mode: prompt.mode,
      lessonId,
    };
    await prisma.speakingPrompt.upsert({
      where: { slug: prompt.slug },
      create: { slug: prompt.slug, ...data },
      update: data,
    });
  }

  for (const prompt of lesson.writing ?? []) {
    const data = {
      title: prompt.title,
      levelCode: prompt.levelCode,
      instruction: prompt.instruction,
      minWords: prompt.minWords,
      maxWords: prompt.maxWords,
      targetStructures: (prompt.targetStructures ?? []).join("\n") || null,
      lessonId,
    };
    await prisma.writingPrompt.upsert({
      where: { slug: prompt.slug },
      create: { slug: prompt.slug, ...data },
      update: data,
    });
  }
}

function stripArticle(word: string): string {
  return word.toLowerCase().trim().replace(/^(el|la|los|las|un|una)\s+/, "");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
