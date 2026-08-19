import { clamp } from "./srs.js";
import type { CefrLevel, Skill, SkillScores } from "../core/types.js";
import { SKILLS } from "../core/types.js";
import { levelIndex } from "../core/cefr.js";

/**
 * Score-keeping (§11).
 *
 * Skill scores are exponential moving averages rather than lifetime means:
 * a learner who was weak at listening in January and has practised since
 * should see that reflected, not averaged away.
 */

/** Weight of the newest result. Higher = more reactive, noisier. */
const ALPHA = 0.25;
/** New skills start here so an untouched skill reads as "unknown", not "0". */
export const UNSCORED = 0;

export function emptySkillScores(): SkillScores {
  return { listening: 0, speaking: 0, reading: 0, writing: 0, grammar: 0, vocabulary: 0 };
}

/**
 * Fold one result (0–100) into a skill score.
 * `weight` scales the update by how substantial the activity was — a 20-item
 * test should move the number more than a single flashcard.
 */
export function updateSkillScore(current: number, result: number, weight = 1): number {
  const alpha = clamp(ALPHA * weight, 0.05, 0.6);
  if (current === 0) {
    // First ever data point for this skill: adopt it, lightly damped.
    return clamp(result * 0.9, 0, 100);
  }
  return clamp(current + alpha * (result - current), 0, 100);
}

export function updateSkills(
  scores: SkillScores,
  updates: Partial<Record<Skill, number>>,
  weight = 1,
): SkillScores {
  const next = { ...scores };
  for (const skill of SKILLS) {
    const value = updates[skill];
    if (typeof value === "number") {
      next[skill] = updateSkillScore(next[skill], value, weight);
    }
  }
  return next;
}

/**
 * Overall proficiency. Receptive skills (listening, reading) and productive
 * skills (speaking, writing) are weighted equally, with grammar and vocabulary
 * as the underlying resources — this mirrors how CEFR itself is assessed.
 */
export function overallScore(scores: SkillScores): number {
  const weights: Record<Skill, number> = {
    listening: 0.2,
    reading: 0.15,
    speaking: 0.2,
    writing: 0.15,
    grammar: 0.15,
    vocabulary: 0.15,
  };
  const active = SKILLS.filter((s) => scores[s] > 0);
  if (active.length === 0) return 0;
  const totalWeight = active.reduce((sum, s) => sum + weights[s], 0);
  const weighted = active.reduce((sum, s) => sum + scores[s] * weights[s], 0);
  return clamp(weighted / totalWeight, 0, 100);
}

export interface QuizScore {
  score: number;
  correctCount: number;
  questionCount: number;
  xp: number;
  passed: boolean;
  /** Message shown on the results screen, in the learner's native language. */
  verdict: string;
}

/** Below this a lesson test does not count as passed and is re-offered. */
export const PASS_THRESHOLD = 70;

export function scoreQuiz(input: {
  results: boolean[];
  level?: CefrLevel;
  durationSeconds?: number;
  hintsUsed?: number;
}): QuizScore {
  const { results, level = "A1", hintsUsed = 0 } = input;
  const questionCount = results.length;
  const correctCount = results.filter(Boolean).length;
  const score = questionCount === 0 ? 0 : (correctCount / questionCount) * 100;

  // XP rewards accuracy, scaled by level so advanced work is worth more.
  const levelMultiplier = 1 + levelIndex(level) * 0.15;
  const hintPenalty = Math.min(hintsUsed * 2, 20);
  const xp = Math.max(
    0,
    Math.round((correctCount * 8 + (score >= 90 ? 20 : 0)) * levelMultiplier) - hintPenalty,
  );

  return {
    score,
    correctCount,
    questionCount,
    xp,
    passed: score >= PASS_THRESHOLD,
    verdict: verdictFor(score),
  };
}

function verdictFor(score: number): string {
  if (score >= 95) return "Excellent — you have this cold.";
  if (score >= 85) return "Strong. A couple of details to tidy up.";
  if (score >= PASS_THRESHOLD) return "Passed. Worth reviewing the ones you missed.";
  if (score >= 50) return "Not quite yet — go back over the explanation and try again.";
  return "This one needs another pass. Re-read the lesson before retrying.";
}

/**
 * Progress through a level, as the share of its lessons completed weighted by
 * how well they were passed. Completing everything at 71% is not the same as
 * completing everything at 95%, and the dashboard should not pretend it is.
 */
export function levelProgress(input: {
  lessons: { completed: boolean; score: number }[];
}): number {
  const { lessons } = input;
  if (lessons.length === 0) return 0;
  const earned = lessons.reduce((sum, l) => {
    if (!l.completed) return sum;
    // A pass counts fully; quality above the threshold is a small bonus.
    return sum + 0.85 + 0.15 * clamp((l.score - PASS_THRESHOLD) / (100 - PASS_THRESHOLD), 0, 1);
  }, 0);
  return clamp((earned / lessons.length) * 100, 0, 100);
}

/**
 * Decide whether the learner is ready to move up a CEFR level. Requires broad
 * coverage *and* balanced skills — someone who reads at 90 but speaks at 30 is
 * not a B1, and telling them so is more useful than a flattering promotion.
 */
export function readyToAdvance(input: {
  levelCompletion: number;
  skills: SkillScores;
}): { ready: boolean; reason: string } {
  const { levelCompletion, skills } = input;
  const weakest = SKILLS.reduce<Skill>(
    (min, s) => (skills[s] < skills[min] ? s : min),
    "listening",
  );

  if (levelCompletion < 85) {
    return {
      ready: false,
      reason: `Finish the rest of this level first — you are ${Math.round(levelCompletion)}% through.`,
    };
  }
  if (skills[weakest] < 60) {
    return {
      ready: false,
      reason: `Your ${weakest} is at ${Math.round(skills[weakest])}%. Bring it to 60% before moving up.`,
    };
  }
  if (overallScore(skills) < 70) {
    return { ready: false, reason: "Consolidate a little more before advancing." };
  }
  return { ready: true, reason: "You have met the bar for the next level." };
}
