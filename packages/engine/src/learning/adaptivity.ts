import { SKILLS, type CefrLevel, type LearnerSnapshot, type Skill } from "../core/types.js";
import { overallScore } from "./scoring.js";
import { clamp } from "./srs.js";

/**
 * Personalised learning (§12).
 *
 * Everything here answers one question: given what this learner has actually
 * done, what should they do next? The output is a ranked list of concrete
 * recommendations with a stated reason — a recommendation the learner cannot
 * understand the motivation for is one they will ignore.
 */

export interface WeakArea {
  kind: "skill" | "grammar" | "vocabulary";
  key: string;
  label: string;
  /** 0–100; higher means more urgent. */
  urgency: number;
  detail: string;
}

export type RecommendationKind =
  | "lesson"
  | "vocabulary_review"
  | "grammar_drill"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "conversation"
  | "placement";

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  /** Why this is being recommended, shown verbatim in the UI. */
  reason: string;
  priority: number;
  minutes: number;
  /** Target identifier — lesson id, grammar topic id, scenario key, etc. */
  targetId?: string;
  targetSlug?: string;
}

/** A skill this far below the learner's average counts as lagging. */
const SKILL_GAP = 12;
/** Absolute floor: any skill under this is weak regardless of the average. */
const SKILL_FLOOR = 55;

export function findWeakAreas(snapshot: LearnerSnapshot): WeakArea[] {
  const areas: WeakArea[] = [];
  const active = SKILLS.filter((s) => snapshot.skills[s] > 0);
  const average =
    active.length > 0 ? active.reduce((sum, s) => sum + snapshot.skills[s], 0) / active.length : 0;

  for (const skill of active) {
    const score = snapshot.skills[skill];
    const belowAverage = average - score;
    if (score < SKILL_FLOOR || belowAverage >= SKILL_GAP) {
      areas.push({
        kind: "skill",
        key: skill,
        label: skillLabel(skill),
        urgency: clamp((SKILL_FLOOR - score) * 1.2 + belowAverage * 2, 0, 100),
        detail:
          belowAverage >= SKILL_GAP
            ? `${Math.round(score)}% — ${Math.round(belowAverage)} points below your average.`
            : `${Math.round(score)}% — below the level you need to progress comfortably.`,
      });
    }
  }

  // Recurring mistakes are the sharpest signal available: they are things the
  // learner got wrong repeatedly, not an aggregate that might be stale.
  for (const pattern of snapshot.mistakePatterns) {
    if (pattern.severity < 0.3) continue;
    areas.push({
      kind: pattern.category === "vocabulary" ? "vocabulary" : "grammar",
      key: pattern.patternKey,
      label: pattern.label,
      urgency: clamp(40 + pattern.occurrences * 8 * pattern.severity, 0, 100),
      detail: `You have made this mistake ${pattern.occurrences} time${pattern.occurrences === 1 ? "" : "s"}.`,
    });
  }

  // A large review backlog is itself a weakness — retention is decaying.
  if (snapshot.wordsDue > 40) {
    areas.push({
      kind: "vocabulary",
      key: "review_backlog",
      label: "Review backlog",
      urgency: clamp(30 + snapshot.wordsDue * 0.4, 0, 100),
      detail: `${snapshot.wordsDue} words are overdue. Words you do not review are words you lose.`,
    });
  }

  return areas.sort((a, b) => b.urgency - a.urgency).slice(0, 6);
}

export interface RecommendationContext {
  snapshot: LearnerSnapshot;
  /** The next unlocked lesson in the course, if any. */
  nextLesson?: { id: string; slug: string; title: string; estimatedMinutes: number } | null;
  /** Lesson the learner left unfinished. */
  resumeLesson?: { id: string; slug: string; title: string } | null;
  /** Grammar topics tied to the learner's active mistake patterns. */
  weakGrammar?: { id: string; slug: string; title: string }[];
  hasPlacement: boolean;
}

/**
 * The "Recommended for you" feed (§12). Ordered by priority; the first item is
 * what the home page surfaces as "what to study next".
 */
export function recommend(context: RecommendationContext): Recommendation[] {
  const { snapshot, nextLesson, resumeLesson, weakGrammar = [], hasPlacement } = context;
  const out: Recommendation[] = [];

  if (!hasPlacement) {
    out.push({
      kind: "placement",
      title: "Take the placement test",
      reason: "We do not know your level yet — 15 minutes now saves you weeks of the wrong material.",
      priority: 100,
      minutes: 15,
    });
  }

  if (resumeLesson) {
    out.push({
      kind: "lesson",
      title: `Continue: ${resumeLesson.title}`,
      reason: "You left this lesson unfinished.",
      priority: 95,
      minutes: 8,
      targetId: resumeLesson.id,
      targetSlug: resumeLesson.slug,
    });
  }

  if (snapshot.wordsDue > 0) {
    out.push({
      kind: "vocabulary_review",
      title: `Review ${snapshot.wordsDue} word${snapshot.wordsDue === 1 ? "" : "s"}`,
      reason:
        snapshot.wordsDue > 40
          ? "Your review queue is backing up. Clearing it protects everything you have already learned."
          : "These words are due today — reviewing them now is what makes them stick.",
      priority: snapshot.wordsDue > 40 ? 92 : 80,
      minutes: Math.min(15, Math.ceil(snapshot.wordsDue / 4)),
    });
  }

  const weakAreas = findWeakAreas(snapshot);

  for (const area of weakAreas.slice(0, 3)) {
    if (area.kind === "skill") {
      const skill = area.key as Skill;
      const rec = skillRecommendation(skill);
      if (rec) {
        out.push({
          ...rec,
          reason: `${skillLabel(skill)} is your weakest skill (${area.detail})`,
          priority: 70 + area.urgency / 10,
        });
      }
    } else if (area.kind === "grammar") {
      const topic = weakGrammar.find((t) => area.key.includes(t.slug.replace(/-/g, "_")));
      out.push({
        kind: "grammar_drill",
        title: `Drill: ${area.label}`,
        reason: area.detail,
        priority: 68 + area.urgency / 10,
        minutes: 6,
        targetId: topic?.id,
        targetSlug: topic?.slug,
      });
    }
  }

  if (nextLesson) {
    out.push({
      kind: "lesson",
      title: nextLesson.title,
      reason: "The next lesson on your path.",
      priority: 75,
      minutes: nextLesson.estimatedMinutes,
      targetId: nextLesson.id,
      targetSlug: nextLesson.slug,
    });
  }

  // Conversation practice is recommended once there is enough language to use.
  if (snapshot.lessonsCompleted >= 3) {
    out.push({
      kind: "conversation",
      title: "Talk with your AI tutor",
      reason:
        snapshot.skills.speaking < snapshot.skills.listening - 10
          ? "You understand more than you produce — speaking is the fastest way to close that gap."
          : "Ten minutes of real conversation consolidates everything else you have done.",
      priority: snapshot.skills.speaking < 50 ? 78 : 60,
      minutes: 10,
    });
  }

  return dedupe(out).sort((a, b) => b.priority - a.priority);
}

function skillRecommendation(skill: Skill): Omit<Recommendation, "reason" | "priority"> | null {
  switch (skill) {
    case "listening":
      return { kind: "listening", title: "Extra listening practice", minutes: 8 };
    case "speaking":
      return { kind: "speaking", title: "Speaking drill", minutes: 8 };
    case "reading":
      return { kind: "reading", title: "Read a short text", minutes: 10 };
    case "writing":
      return { kind: "writing", title: "Writing exercise", minutes: 12 };
    case "grammar":
      return { kind: "grammar_drill", title: "Grammar review", minutes: 8 };
    case "vocabulary":
      return { kind: "vocabulary_review", title: "Vocabulary session", minutes: 8 };
    default:
      return null;
  }
}

function dedupe(recommendations: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  return recommendations.filter((r) => {
    const key = `${r.kind}:${r.targetId ?? r.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function skillLabel(skill: Skill): string {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

/**
 * How the mix of a study session should shift for this learner. Returns
 * multipliers around 1.0 that the daily planner applies to its base recipe —
 * weak listening means proportionally more listening, not a fixed prescription.
 */
export function studyMix(snapshot: LearnerSnapshot): Record<Skill, number> {
  const active = SKILLS.filter((s) => snapshot.skills[s] > 0);
  const average = active.length > 0 ? overallScore(snapshot.skills) : 50;

  const mix = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    const score = snapshot.skills[skill] || average;
    // 20 points below average → 1.4×; 20 above → 0.7×.
    mix[skill] = clamp(1 + (average - score) / 50, 0.6, 1.8);
  }
  return mix;
}

/** One-line summary of standing, used on the dashboard and in Telegram. */
export function progressHeadline(snapshot: LearnerSnapshot): string {
  const weak = findWeakAreas(snapshot)[0];
  const overall = Math.round(overallScore(snapshot.skills));
  if (snapshot.lessonsCompleted === 0) return "Ready to start. Your first lesson is waiting.";
  if (!weak) return `Balanced across the board at ${overall}%. Keep going.`;
  return `Overall ${overall}%. Your focus right now: ${weak.label.toLowerCase()}.`;
}

/** Levels are advisory here; the engine never silently moves a learner up. */
export function suggestedLevelChange(input: {
  current: CefrLevel;
  levelCompletion: number;
  skills: LearnerSnapshot["skills"];
}): { direction: "up" | "stay"; message: string } {
  const overall = overallScore(input.skills);
  if (input.levelCompletion >= 85 && overall >= 70) {
    return {
      direction: "up",
      message: `You have finished ${Math.round(input.levelCompletion)}% of ${input.current} at ${Math.round(overall)}% overall. Ready to move up when you are.`,
    };
  }
  return { direction: "stay", message: `Keep working through ${input.current}.` };
}
