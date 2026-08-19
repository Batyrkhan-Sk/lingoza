import {
  generateGrammarMnemonic,
  generateWordMnemonic,
  MNEMONIC_COACHING,
  parseLevel,
  rankMnemonics,
  shouldOfferMnemonic,
  type Mnemonic,
  type MnemonicKind,
} from "@lingoza/engine";
import { prisma } from "../db.js";
import { ai } from "./ai.js";

/**
 * Memory hooks.
 *
 * Curated hooks are seeded and shared; personal ones are generated on request
 * and belong to the learner who asked. Ranking prefers the learner's own, then
 * curated, then whatever the community has found helpful.
 *
 * The decision of *whether* to show a hook lives in the engine, not here — it
 * depends on the learner's strength on the item and whether they have attempted
 * recall yet, and that logic must be identical in the web app and the bot.
 */

function toEngine(row: {
  id: string;
  kind: string;
  scope: string;
  hook: string;
  imagery: string | null;
  explanation: string | null;
  keyword: string | null;
  userId: string | null;
  origin: string;
  helpfulCount: number;
  unhelpfulCount: number;
}): Mnemonic {
  return {
    id: row.id,
    kind: row.kind as MnemonicKind,
    scope: row.scope as "word" | "grammar",
    hook: row.hook,
    imagery: row.imagery,
    explanation: row.explanation,
    keyword: row.keyword,
    userId: row.userId,
    origin: row.origin as "curated" | "ai",
    helpfulCount: row.helpfulCount,
    unhelpfulCount: row.unhelpfulCount,
  };
}

export interface MnemonicView extends Mnemonic {
  coaching: string;
  /** How this learner rated it, if they have. */
  myRating: boolean | null;
}

async function decorate(rows: Awaited<ReturnType<typeof loadWordRows>>, userId: string): Promise<MnemonicView[]> {
  const ids = rows.map((r) => r.id);
  const ratings = await prisma.mnemonicRating.findMany({
    where: { userId, mnemonicId: { in: ids } },
  });
  const mine = new Map(ratings.map((r) => [r.mnemonicId, r.helpful]));

  return rankMnemonics(rows.map(toEngine), userId).map((mnemonic) => ({
    ...mnemonic,
    coaching: MNEMONIC_COACHING[mnemonic.kind],
    myRating: mine.get(mnemonic.id) ?? null,
  }));
}

function loadWordRows(wordId: string, userId: string) {
  return prisma.mnemonic.findMany({
    // Curated hooks (userId null) plus this learner's own — never someone
    // else's private hook.
    where: { wordId, OR: [{ userId: null }, { userId }] },
  });
}

export async function getWordMnemonics(userId: string, wordId: string) {
  const [rows, progress] = await Promise.all([
    loadWordRows(wordId, userId),
    prisma.vocabularyProgress.findUnique({ where: { userId_wordId: { userId, wordId } } }),
  ]);

  const mnemonics = await decorate(rows, userId);

  return {
    mnemonics,
    /**
     * Whether the hook should be shown now. The web app and the bot both
     * respect this rather than deciding for themselves.
     */
    offer: shouldOfferMnemonic({
      strength: progress?.strength ?? 0,
      attempted: true, // hooks are only ever requested after an attempt
      lapses: progress?.lapses ?? 0,
    }),
    canGenerate: ai.enabled,
  };
}

export async function getGrammarMnemonics(userId: string, topicId: string) {
  const rows = await prisma.mnemonic.findMany({
    where: { grammarTopicId: topicId, OR: [{ userId: null }, { userId }] },
  });
  return { mnemonics: await decorate(rows, userId), canGenerate: ai.enabled };
}

/**
 * Generate a personal hook for a word.
 *
 * Existing hooks are passed to the generator so a "give me another" produces
 * something genuinely different rather than a paraphrase.
 */
export async function createWordMnemonic(userId: string, wordId: string) {
  const [word, existing, progress] = await Promise.all([
    prisma.vocabularyWord.findUniqueOrThrow({ where: { id: wordId } }),
    prisma.mnemonic.findMany({ where: { wordId, OR: [{ userId: null }, { userId }] } }),
    prisma.userProgress.findUnique({ where: { userId } }),
  ]);

  const generated = await generateWordMnemonic(ai, {
    spanish: word.spanish,
    english: word.english,
    level: parseLevel(progress?.currentLevelCode),
    gender: word.gender,
    avoid: existing.map((m) => m.hook),
  });

  if (!generated) {
    return {
      created: null,
      message: ai.enabled
        ? "Could not come up with a hook worth keeping for this one. Some words genuinely have no good sound-alike — repetition is the honest answer there."
        : "Personal hooks need an AI provider. Add GEMINI_API_KEY to enable them.",
    };
  }

  const row = await prisma.mnemonic.create({
    data: {
      kind: generated.kind,
      scope: "word",
      hook: generated.hook,
      imagery: generated.imagery ?? null,
      explanation: generated.explanation ?? null,
      keyword: generated.keyword ?? null,
      origin: "ai",
      wordId,
      userId,
    },
  });

  return {
    created: { ...toEngine(row), coaching: MNEMONIC_COACHING[generated.kind], myRating: null },
    message: null,
  };
}

export async function createGrammarMnemonic(userId: string, topicId: string) {
  const [topic, progress, pattern] = await Promise.all([
    prisma.grammarTopic.findUniqueOrThrow({ where: { id: topicId } }),
    prisma.userProgress.findUnique({ where: { userId } }),
    // If we know the specific error they keep making, target the hook at it.
    prisma.mistakePattern.findFirst({
      where: { userId, grammarTopicId: topicId },
      orderBy: { severity: "desc" },
    }),
  ]);

  const generated = await generateGrammarMnemonic(ai, {
    title: topic.title,
    formula: topic.formula,
    whenToUse: topic.whenToUse,
    level: parseLevel(progress?.currentLevelCode),
    mistake: pattern
      ? `${pattern.label}${pattern.exampleWrong ? ` — e.g. "${pattern.exampleWrong}"` : ""}`
      : undefined,
  });

  if (!generated) {
    return {
      created: null,
      message: ai.enabled
        ? "Could not produce a useful hook for this structure."
        : "Personal hooks need an AI provider. Add GEMINI_API_KEY to enable them.",
    };
  }

  const row = await prisma.mnemonic.create({
    data: {
      kind: generated.kind,
      scope: "grammar",
      hook: generated.hook,
      explanation: generated.explanation ?? null,
      origin: "ai",
      grammarTopicId: topicId,
      userId,
    },
  });

  return {
    created: { ...toEngine(row), coaching: MNEMONIC_COACHING[generated.kind], myRating: null },
    message: null,
  };
}

/**
 * Rate a hook. One vote per learner per hook; changing your mind updates the
 * counts rather than adding to them.
 */
export async function rateMnemonic(userId: string, mnemonicId: string, helpful: boolean) {
  const existing = await prisma.mnemonicRating.findUnique({
    where: { mnemonicId_userId: { mnemonicId, userId } },
  });

  if (existing?.helpful === helpful) {
    return prisma.mnemonic.findUniqueOrThrow({ where: { id: mnemonicId } });
  }

  await prisma.mnemonicRating.upsert({
    where: { mnemonicId_userId: { mnemonicId, userId } },
    create: { mnemonicId, userId, helpful },
    update: { helpful },
  });

  // Recount rather than increment, so a flipped vote cannot drift the totals.
  const [helpfulCount, unhelpfulCount] = await Promise.all([
    prisma.mnemonicRating.count({ where: { mnemonicId, helpful: true } }),
    prisma.mnemonicRating.count({ where: { mnemonicId, helpful: false } }),
  ]);

  return prisma.mnemonic.update({
    where: { id: mnemonicId },
    data: { helpfulCount, unhelpfulCount },
  });
}

export async function deleteMnemonic(userId: string, mnemonicId: string) {
  // Only your own hooks; curated ones are shared and are rated, not deleted.
  const result = await prisma.mnemonic.deleteMany({ where: { id: mnemonicId, userId } });
  return result.count > 0;
}
