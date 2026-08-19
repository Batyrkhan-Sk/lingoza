import { explainWord, parseLevel, servableLevels, XP_REWARDS, type Interface } from "@lingoza/engine";
import { prisma } from "../db.js";
import { ai, sources } from "./ai.js";
import { recordActivity } from "./progress.js";

/**
 * Listening and reading (§6, §9).
 *
 * Authored material is served first; live Spanish press is layered on top for
 * B1+ readers so advanced learners work on today's real language. Sourcing
 * failures are invisible to the learner — they just see the authored list.
 */

export async function listListening(userId: string, level?: string) {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const current = parseLevel(level ?? progress?.currentLevelCode);

  return prisma.listeningExercise.findMany({
    where: { levelCode: { in: servableLevels(current) } },
    orderBy: [{ levelCode: "asc" }, { title: "asc" }],
    include: { segments: { orderBy: { orderIndex: "asc" } } },
  });
}

export async function getListening(slug: string) {
  return prisma.listeningExercise.findUnique({
    where: { slug },
    include: {
      segments: { orderBy: { orderIndex: "asc" } },
      exercises: {
        include: { questions: { include: { options: true }, orderBy: { orderIndex: "asc" } } },
      },
    },
  });
}

export async function completeListening(input: {
  userId: string;
  listeningId: string;
  score?: number;
  source?: Interface;
}) {
  const { userId, score = 80, source = "web" } = input;
  return recordActivity({
    userId,
    activity: "listening",
    skills: { listening: score },
    weight: 0.6,
    xp: XP_REWARDS.listeningComplete,
    minutes: 5,
    source,
  });
}

export async function listReading(userId: string, level?: string) {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const current = parseLevel(level ?? progress?.currentLevelCode);

  const authored = await prisma.readingText.findMany({
    where: { levelCode: { in: servableLevels(current) } },
    orderBy: [{ levelCode: "asc" }, { title: "asc" }],
  });

  // Live press for B1+. Never blocks: on any failure `items` is empty.
  const live = await sources.readingFor(current);

  return {
    authored: authored.map((text) => ({
      slug: text.slug,
      title: text.title,
      levelCode: text.levelCode,
      genre: text.genre,
      intro: text.intro,
      wordCount: text.wordCount,
      estimatedMinutes: text.estimatedMinutes,
      live: false as const,
    })),
    live: live.items.map((article) => ({
      title: article.title,
      summary: article.summary,
      url: article.url,
      publisher: article.publisher,
      publishedAt: article.publishedAt ?? null,
      estimatedLevel: article.estimatedLevel ?? current,
      live: true as const,
    })),
    liveSource: {
      available: live.items.length > 0,
      attribution: "Headlines from Spanish-language publishers, linked to the original.",
      error: live.error ?? null,
    },
  };
}

export async function getReading(slug: string) {
  return prisma.readingText.findUnique({
    where: { slug },
    include: {
      glossary: true,
      exercises: {
        include: { questions: { include: { options: true }, orderBy: { orderIndex: "asc" } } },
      },
    },
  });
}

export async function completeReading(input: {
  userId: string;
  score?: number;
  source?: Interface;
}) {
  const { userId, score = 80, source = "web" } = input;
  return recordActivity({
    userId,
    activity: "reading",
    skills: { reading: score },
    weight: 0.6,
    xp: XP_REWARDS.readingComplete,
    minutes: 5,
    source,
  });
}

/**
 * Click-to-translate.
 *
 * Resolution order matters for both cost and latency: the authored glossary,
 * then the vocabulary table, and only then the AI. The overwhelming majority
 * of lookups are words the curriculum already knows about, so they cost
 * nothing and return instantly.
 */
export async function lookupWord(input: {
  userId: string;
  word: string;
  sentence: string;
  readingSlug?: string;
}) {
  const { userId, word, sentence, readingSlug } = input;
  const clean = word.toLowerCase().replace(/[^\p{L}\p{M}'-]/gu, "");

  if (readingSlug) {
    const glossary = await prisma.readingGlossaryEntry.findFirst({
      where: { reading: { slug: readingSlug }, term: { equals: clean } },
    });
    if (glossary) {
      return {
        word: clean,
        meaning: glossary.meaning,
        note: glossary.note ?? undefined,
        source: "glossary" as const,
      };
    }
  }

  const known = await prisma.vocabularyWord.findFirst({
    where: {
      OR: [{ spanish: clean }, { spanish: `el ${clean}` }, { spanish: `la ${clean}` }],
    },
  });
  if (known) {
    return {
      word: clean,
      meaning: known.english,
      lemma: known.spanish,
      partOfSpeech: known.partOfSpeech,
      note: known.gender ? `${known.gender === "m" ? "masculine" : "feminine"} noun` : undefined,
      source: "vocabulary" as const,
      wordId: known.id,
    };
  }

  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const explanation = await explainWord(ai, {
    word: clean,
    sentence,
    level: parseLevel(progress?.currentLevelCode),
  });

  return explanation;
}

/** Attested example sentences for a word, from open data. */
export async function examplesForWord(userId: string, wordId: string) {
  const word = await prisma.vocabularyWord.findUniqueOrThrow({ where: { id: wordId } });
  const sourced = await sources.examplesFor(
    word.spanish.replace(/^(el|la|los|las)\s+/, ""),
    parseLevel(word.levelCode),
  );

  return {
    authored: { spanish: word.exampleSentence, english: word.exampleTranslation },
    sourced: sourced.items,
    attribution: sourced.items.length > 0 ? "Tatoeba (CC-BY 2.0 FR)" : null,
    error: sourced.error ?? null,
  };
}
