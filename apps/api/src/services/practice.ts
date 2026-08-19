import {
  countWords,
  detectPatterns,
  evaluateSpeaking,
  evaluateWriting,
  parseLevel,
  tutorReply,
  updateSeverity,
  XP_REWARDS,
  type CefrLevel,
  type Correction,
  type Interface,
  type MistakePatternSummary,
  type TutorScenario,
} from "@lingoza/engine";
import { findScenario } from "@lingoza/content";
import { prisma } from "../db.js";
import { ai } from "./ai.js";
import { recordActivity } from "./progress.js";

/**
 * Productive practice: writing, speaking and tutor conversations.
 *
 * All three share one behaviour that matters pedagogically — every correction
 * they produce is fed into the learner's mistake patterns, which is what makes
 * the daily planner and the tutor able to target real, individual weaknesses
 * rather than generic drills (§8, §12).
 */

async function learnerLevel(userId: string): Promise<CefrLevel> {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  return parseLevel(progress?.currentLevelCode);
}

// ─── Writing ─────────────────────────────────────────────────────────────────

export async function submitWriting(input: {
  userId: string;
  promptId?: string;
  instruction?: string;
  text: string;
  source?: Interface;
}) {
  const { userId, promptId, text, source = "web" } = input;
  const level = await learnerLevel(userId);

  const prompt = promptId
    ? await prisma.writingPrompt.findUnique({ where: { id: promptId } })
    : null;

  const evaluation = await evaluateWriting(ai, {
    level: parseLevel(prompt?.levelCode ?? level),
    instruction: prompt?.instruction ?? input.instruction ?? "Write freely in Spanish.",
    text,
    minWords: prompt?.minWords,
    maxWords: prompt?.maxWords,
    targetStructures: (prompt?.targetStructures ?? "").split("\n").filter(Boolean),
  });

  const attempt = await prisma.writingAttempt.create({
    data: {
      userId,
      promptId: prompt?.id ?? null,
      text,
      wordCount: countWords(text),
      grammarScore: evaluation.grammarScore,
      vocabularyScore: evaluation.vocabularyScore,
      structureScore: evaluation.structureScore,
      coherenceScore: evaluation.coherenceScore,
      naturalnessScore: evaluation.naturalnessScore,
      spellingScore: evaluation.spellingScore,
      overallScore: evaluation.overallScore,
      improvedVersion: evaluation.improvedVersion || null,
      feedback: evaluation.feedback,
      evaluatedBy: evaluation.provider,
      corrections: {
        create: evaluation.corrections.map((correction) => ({
          original: correction.original,
          corrected: correction.corrected,
          explanation: correction.explanation,
          category: correction.category,
          severity: correction.severity,
        })),
      },
    },
    include: { corrections: true },
  });

  await recordMistakes(userId, evaluation.corrections);

  const activity = await recordActivity({
    userId,
    activity: "writing",
    skills: {
      writing: evaluation.overallScore,
      grammar: evaluation.grammarScore,
      vocabulary: evaluation.vocabularyScore,
    },
    weight: 1,
    xp: XP_REWARDS.writingAttempt,
    minutes: Math.max(3, Math.round(countWords(text) / 15)),
    source,
  });

  return { ...evaluation, attemptId: attempt.id, activity };
}

// ─── Speaking ────────────────────────────────────────────────────────────────

export async function submitSpeaking(input: {
  userId: string;
  promptId?: string;
  transcript: string;
  durationSeconds?: number;
  instruction?: string;
  source?: Interface;
}) {
  const { userId, promptId, transcript, durationSeconds, source = "web" } = input;
  const level = await learnerLevel(userId);

  const prompt = promptId
    ? await prisma.speakingPrompt.findUnique({ where: { id: promptId } })
    : null;

  const evaluation = await evaluateSpeaking(ai, {
    level: parseLevel(prompt?.levelCode ?? level),
    instruction: prompt?.instruction ?? input.instruction ?? "Speak freely in Spanish.",
    targetText: prompt?.targetText ?? undefined,
    transcript,
    durationSeconds,
    focusSounds: (prompt?.focusSounds ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  });

  const attempt = await prisma.speakingAttempt.create({
    data: {
      userId,
      promptId: prompt?.id ?? null,
      transcript,
      durationSeconds: durationSeconds ?? 0,
      pronunciationScore: evaluation.pronunciationScore,
      vocabularyScore: evaluation.vocabularyScore,
      grammarScore: evaluation.grammarScore,
      fluencyScore: evaluation.fluencyScore,
      structureScore: evaluation.structureScore,
      overallScore: evaluation.overallScore,
      feedback: evaluation.feedback,
      evaluatedBy: evaluation.provider,
      corrections: {
        create: evaluation.corrections.map((correction) => ({
          original: correction.original,
          corrected: correction.corrected,
          explanation: correction.explanation,
          category: correction.category,
          severity: correction.severity,
        })),
      },
    },
  });

  await recordMistakes(userId, evaluation.corrections);

  const activity = await recordActivity({
    userId,
    activity: "speaking",
    skills: {
      speaking: evaluation.overallScore,
      grammar: evaluation.grammarScore,
      vocabulary: evaluation.vocabularyScore,
    },
    weight: 0.8,
    xp: XP_REWARDS.speakingAttempt,
    minutes: Math.max(2, Math.round((durationSeconds ?? 60) / 60)),
    source,
  });

  return { ...evaluation, attemptId: attempt.id, activity };
}

// ─── AI tutor conversations ──────────────────────────────────────────────────

export async function startConversation(input: {
  userId: string;
  scenario: TutorScenario;
  origin?: Interface;
}) {
  const { userId, scenario, origin = "web" } = input;
  const level = await learnerLevel(userId);
  const brief = findScenario(scenario);

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      scenario,
      title: brief?.title ?? "Conversation",
      levelCode: level,
      origin,
    },
  });

  // The tutor opens, so the learner is never staring at an empty box.
  const turn = await tutorReply(ai, await tutorContext(userId, scenario, level), []);

  const message = await prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: "tutor",
      content: turn.reply,
      translation: turn.translation || null,
    },
  });

  return {
    conversationId: conversation.id,
    scenario,
    title: conversation.title,
    usefulPhrases: brief?.usefulPhrases ?? [],
    goal: brief?.goal ?? null,
    messages: [{ id: message.id, role: "tutor", content: turn.reply, translation: turn.translation }],
  };
}

export async function sendConversationMessage(input: {
  userId: string;
  conversationId: string;
  content: string;
  source?: Interface;
}) {
  const { userId, conversationId, content, source = "web" } = input;

  const conversation = await prisma.conversation.findFirstOrThrow({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  await prisma.conversationMessage.create({
    data: { conversationId, role: "user", content },
  });

  const history = [
    ...conversation.messages.map((m) => ({
      role: (m.role === "tutor" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  const context = await tutorContext(
    userId,
    conversation.scenario as TutorScenario,
    parseLevel(conversation.levelCode),
  );
  const turn = await tutorReply(ai, context, history);

  const message = await prisma.conversationMessage.create({
    data: {
      conversationId,
      role: "tutor",
      content: turn.reply,
      translation: turn.translation || null,
      coaching: turn.coaching || null,
      corrections: {
        create: turn.corrections.map((correction) => ({
          original: correction.original,
          corrected: correction.corrected,
          explanation: correction.explanation,
          category: correction.category,
          severity: correction.severity,
        })),
      },
    },
    include: { corrections: true },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  await recordMistakes(userId, turn.corrections);

  const activity = await recordActivity({
    userId,
    activity: "tutor",
    skills: { speaking: turn.corrections.length === 0 ? 80 : 60 },
    weight: 0.2,
    xp: XP_REWARDS.conversationTurn,
    minutes: 1,
    source,
  });

  return {
    reply: turn.reply,
    translation: turn.translation,
    coaching: turn.coaching,
    corrections: message.corrections,
    suggestion: turn.suggestion,
    provider: turn.provider,
    activity,
  };
}

export async function getConversation(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { corrections: true },
      },
    },
  });
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 25,
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
  });
}

async function tutorContext(userId: string, scenario: TutorScenario, level: CefrLevel) {
  const [user, patterns, recentWords] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getMistakePatterns(userId),
    prisma.vocabularyProgress.findMany({
      where: { userId },
      orderBy: { firstSeenAt: "desc" },
      take: 15,
      include: { word: true },
    }),
  ]);

  const brief = findScenario(scenario);

  return {
    level,
    scenario,
    role: brief?.tutorRole,
    setting: brief?.setting,
    goal: brief?.goal,
    mistakePatterns: patterns,
    recentVocabulary: recentWords.map((r) => r.word.spanish),
    dialect: user.dialectPreference as "es-ES" | "es-419",
    learnerName: user.displayName,
  };
}

// ─── Mistake patterns ────────────────────────────────────────────────────────

/**
 * Roll corrections up into durable patterns. Severity rises when a mistake
 * recurs and decays when it stops, so a fixed weakness leaves the dashboard.
 */
export async function recordMistakes(userId: string, corrections: Correction[]): Promise<void> {
  if (corrections.length === 0) return;

  const patterns = detectPatterns(corrections);

  for (const pattern of patterns) {
    const existing = await prisma.mistakePattern.findUnique({
      where: { userId_patternKey: { userId, patternKey: pattern.patternKey } },
    });

    const example = corrections.find(
      (c) => c.category === pattern.category || patterns.length === 1,
    );

    if (existing) {
      const daysSince = (Date.now() - existing.lastSeenAt.getTime()) / 86_400_000;
      await prisma.mistakePattern.update({
        where: { id: existing.id },
        data: {
          occurrences: existing.occurrences + 1,
          severity: updateSeverity({
            currentSeverity: existing.severity,
            occurrences: existing.occurrences + 1,
            daysSinceLastSeen: daysSince,
            triggeredAgain: true,
          }),
          lastSeenAt: new Date(),
          exampleWrong: example?.original ?? existing.exampleWrong,
          exampleRight: example?.corrected ?? existing.exampleRight,
        },
      });
    } else {
      const topic = pattern.grammarSlug
        ? await prisma.grammarTopic.findUnique({ where: { slug: pattern.grammarSlug } })
        : null;

      await prisma.mistakePattern.create({
        data: {
          userId,
          patternKey: pattern.patternKey,
          category: pattern.category,
          label: pattern.label,
          exampleWrong: example?.original ?? null,
          exampleRight: example?.corrected ?? null,
          grammarTopicId: topic?.id ?? null,
        },
      });
    }
  }
}

export async function getMistakePatterns(userId: string): Promise<MistakePatternSummary[]> {
  const rows = await prisma.mistakePattern.findMany({
    where: { userId },
    orderBy: { severity: "desc" },
    take: 10,
  });

  // Apply time decay on read, so a pattern the learner has stopped triggering
  // fades without needing a scheduled job to sweep the table.
  return rows
    .map((row) => ({
      patternKey: row.patternKey,
      label: row.label,
      category: row.category as MistakePatternSummary["category"],
      occurrences: row.occurrences,
      severity: updateSeverity({
        currentSeverity: row.severity,
        occurrences: row.occurrences,
        daysSinceLastSeen: (Date.now() - row.lastSeenAt.getTime()) / 86_400_000,
        triggeredAgain: false,
      }),
      grammarTopicId: row.grammarTopicId,
    }))
    .filter((pattern) => pattern.severity >= 0.2);
}
