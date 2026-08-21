import type { LearnerSnapshot } from "../core/types.js";
import { studyMix, findWeakAreas } from "./adaptivity.js";
import { clamp } from "./srs.js";

/**
 * Daily learning (§13).
 *
 * Generates one personalised session per day, sized to the minutes the learner
 * actually has. The base recipe at 20 minutes is the spec's: 5–10 words, one
 * grammar concept, 5–10 exercises, a listening, a speaking, a short
 * conversation and a review of old material. Longer budgets scale the
 * quantities; shorter budgets drop the lowest-value items rather than
 * shrinking everything into uselessness.
 */

export const TIME_BUDGETS = [10, 20, 30, 45, 60] as const;
export type TimeBudget = (typeof TIME_BUDGETS)[number];

export type DailyItemKind =
  | "vocabulary"
  | "grammar"
  | "exercise"
  | "listening"
  | "speaking"
  | "conversation"
  | "review"
  | "lesson";

export interface PlannedItem {
  kind: DailyItemKind;
  title: string;
  /** Shown under the title so the learner knows why it is in today's plan. */
  rationale: string;
  minutes: number;
  orderIndex: number;
  /** How many underlying units (words, questions) the item covers. */
  quantity?: number;
  lessonId?: string;
  grammarTopicId?: string;
}

export interface DailyPlanInput {
  snapshot: LearnerSnapshot;
  targetMinutes: number;
  /** Next unlocked lesson, if the learner has one available. */
  nextLesson?: { id: string; title: string } | null;
  /** Grammar topic scheduled for today. */
  grammarTopic?: { id: string; title: string } | null;
  /** Words genuinely due for review right now. */
  wordsDue?: number;
  /** New words available at the learner's level. */
  newWordsAvailable?: number;
  /**
   * How many new words the learner wants per day, if they have said.
   * Overrides the default allocation derived from their time budget.
   */
  newWordsTarget?: number;
}

export interface DailyPlan {
  targetMinutes: number;
  items: PlannedItem[];
  totalMinutes: number;
  summary: string;
}

/** Minutes each item type costs per unit, calibrated from typical pacing. */
const MINUTES = {
  vocabularyPerWord: 0.4,
  reviewPerWord: 0.25,
  grammar: 4,
  exercisePerQuestion: 0.5,
  listening: 5,
  speaking: 4,
  conversation: 6,
  lesson: 10,
} as const;

export function generateDailyPlan(input: DailyPlanInput): DailyPlan {
  const {
    snapshot,
    targetMinutes,
    nextLesson = null,
    grammarTopic = null,
    wordsDue = snapshot.wordsDue,
    newWordsAvailable = 10,
  } = input;

  const budget = clamp(targetMinutes, 5, 180);
  const mix = studyMix(snapshot);
  const scale = budget / 20; // the spec's recipe is calibrated at 20 minutes
  const items: PlannedItem[] = [];
  let order = 0;
  let spent = 0;

  const push = (item: Omit<PlannedItem, "orderIndex">) => {
    items.push({ ...item, orderIndex: order++ });
    spent += item.minutes;
  };

  // 1. Reviews first, always. They are time-critical in a way new material is
  //    not: a word reviewed tomorrow instead of today is measurably weaker.
  if (wordsDue > 0) {
    // Ten at the reference budget, scaled with it. The floor is a floor rather
    // than a target: a learner whose vocabulary is weak gets more, never fewer.
    const reviewCount = Math.min(
      wordsDue,
      Math.max(Math.round(10 * scale), Math.round(12 * scale * mix.vocabulary)),
    );
    push({
      kind: "review",
      title: `Review ${reviewCount} words`,
      rationale:
        wordsDue > reviewCount
          ? `${wordsDue} due in total — the most overdue first.`
          : "Everything due today.",
      minutes: round(reviewCount * MINUTES.reviewPerWord),
      quantity: reviewCount,
    });
  }

  // 2. New vocabulary — 5–10 at the reference budget.
  // 10 at the reference budget. The ceiling is deliberately generous rather
  // than paternalistic: a learner who wants a heavy day should get one, and the
  // consequence — a larger review queue in two days — is theirs to manage.
  const newWords = clamp(
    Math.round((input.newWordsTarget ?? 10) * scale * mix.vocabulary),
    budget <= 10 ? 3 : 5,
    Math.min(newWordsAvailable, 40),
  );
  if (newWords > 0) {
    push({
      kind: "vocabulary",
      title: `${newWords} new words`,
      rationale: "High-frequency words at your level.",
      minutes: round(newWords * MINUTES.vocabularyPerWord + 1),
      quantity: newWords,
    });
  }

  // 3. One grammar concept.
  if (grammarTopic) {
    push({
      kind: "grammar",
      title: grammarTopic.title,
      rationale: "Today's grammar focus.",
      minutes: MINUTES.grammar,
      grammarTopicId: grammarTopic.id,
    });
  }

  // 4. Exercises drilling the above.
  const questionCount = clamp(Math.round(8 * scale), 4, 25);
  push({
    kind: "exercise",
    title: `${questionCount} practice exercises`,
    rationale: grammarTopic
      ? `Drilling ${grammarTopic.title.toLowerCase()} and today's words.`
      : "Practice on today's material.",
    minutes: round(questionCount * MINUTES.exercisePerQuestion),
    quantity: questionCount,
  });

  // 5–7. Skill work, ordered by weakness so the weakest gets the surviving
  //      time when the budget is tight.
  const skillItems: Omit<PlannedItem, "orderIndex">[] = [
    {
      kind: "listening",
      title: "Listening exercise",
      rationale: rationaleFor(snapshot, "listening"),
      minutes: round(MINUTES.listening * clamp(mix.listening, 0.8, 1.4)),
    },
    {
      kind: "speaking",
      title: "Speaking drill",
      rationale: rationaleFor(snapshot, "speaking"),
      minutes: round(MINUTES.speaking * clamp(mix.speaking, 0.8, 1.4)),
    },
    {
      kind: "conversation",
      title: "Short conversation with your tutor",
      rationale: "Use today's material in a real exchange.",
      minutes: MINUTES.conversation,
    },
  ];
  skillItems.sort((a, b) => priorityOf(snapshot, b.kind) - priorityOf(snapshot, a.kind));

  for (const item of skillItems) {
    // At a 10-minute budget only the highest-value skill item survives.
    if (spent + item.minutes > budget * 1.15 && items.length >= 4) break;
    push(item);
  }

  // 8. The lesson itself, when there is room for it.
  if (nextLesson && spent + MINUTES.lesson <= budget * 1.2) {
    push({
      kind: "lesson",
      title: nextLesson.title,
      rationale: "The next lesson on your path.",
      minutes: MINUTES.lesson,
      lessonId: nextLesson.id,
    });
  }

  const totalMinutes = round(items.reduce((sum, i) => sum + i.minutes, 0));

  return {
    targetMinutes: budget,
    items,
    totalMinutes,
    summary: summarize(items, budget),
  };
}

function priorityOf(snapshot: LearnerSnapshot, kind: DailyItemKind): number {
  const weak = findWeakAreas(snapshot);
  const match = weak.find((w) => w.key === kind || (kind === "conversation" && w.key === "speaking"));
  const base = kind === "listening" ? 50 : kind === "speaking" ? 48 : 40;
  return base + (match ? match.urgency : 0);
}

function rationaleFor(snapshot: LearnerSnapshot, skill: "listening" | "speaking"): string {
  const score = snapshot.skills[skill];
  if (score === 0) return "Building this skill from the start.";
  const other = skill === "listening" ? snapshot.skills.speaking : snapshot.skills.listening;
  if (score < other - 10) {
    return `Your ${skill} (${Math.round(score)}%) is behind — extra time here today.`;
  }
  return `Keeping your ${skill} sharp.`;
}

function summarize(items: PlannedItem[], budget: number): string {
  const words = items
    .filter((i) => i.kind === "vocabulary" || i.kind === "review")
    .reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  const grammar = items.find((i) => i.kind === "grammar");
  const parts = [`${budget} minutes`];
  if (words > 0) parts.push(`${words} words`);
  if (grammar) parts.push(grammar.title);
  const skills = items
    .filter((i) => ["listening", "speaking", "conversation"].includes(i.kind))
    .map((i) => i.kind);
  if (skills.length > 0) parts.push(skills.join(" + "));
  return parts.join(" · ");
}

function round(value: number): number {
  return Math.max(1, Math.round(value));
}

/** Local YYYY-MM-DD for the learner's timezone, so "today" is unambiguous. */
export function localDateKey(date: Date = new Date(), timeZone = "UTC"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
