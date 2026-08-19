import { CEFR_LEVELS, type CefrLevel, type PlacementSection } from "../core/types.js";
import { levelIndex, LEVEL_DESCRIPTIONS } from "../core/cefr.js";
import { clamp } from "./srs.js";

/**
 * Placement test (§2).
 *
 * The test is adaptive-by-scoring rather than adaptive-by-branching: the
 * learner answers a fixed spread of items across all six levels, and the
 * estimate is the highest level at which they still demonstrate control.
 *
 * The rule is deliberately conservative. Placing someone too high leaves them
 * lost and they quit; placing them slightly low costs them a few easy lessons
 * and builds confidence. So a level counts as "held" only at ≥75% accuracy,
 * and the recommendation always starts at the *beginning* of the held level's
 * successor material rather than mid-level.
 */

export interface PlacementAnswer {
  questionId: string;
  section: PlacementSection;
  levelCode: CefrLevel;
  isCorrect: boolean;
}

export interface PlacementOutcome {
  estimatedLevel: CefrLevel;
  confidence: number;
  correctCount: number;
  questionCount: number;
  sectionScores: Record<PlacementSection, number>;
  levelAccuracy: Record<CefrLevel, { correct: number; total: number; accuracy: number }>;
  recommendation: string;
  /** Skills that already lag at the estimated level, for the first plan. */
  weakSections: PlacementSection[];
}

/** Accuracy required at a level to count it as under control. */
const HOLD_THRESHOLD = 0.75;
/** Accuracy above which we consider the level not merely held but easy. */
const STRONG_THRESHOLD = 0.9;

export function scorePlacement(answers: PlacementAnswer[]): PlacementOutcome {
  const levelAccuracy = {} as PlacementOutcome["levelAccuracy"];
  for (const level of CEFR_LEVELS) {
    levelAccuracy[level] = { correct: 0, total: 0, accuracy: 0 };
  }

  const sectionTally: Record<string, { correct: number; total: number }> = {};

  for (const answer of answers) {
    const bucket = levelAccuracy[answer.levelCode];
    bucket.total += 1;
    if (answer.isCorrect) bucket.correct += 1;

    sectionTally[answer.section] ??= { correct: 0, total: 0 };
    const section = sectionTally[answer.section]!;
    section.total += 1;
    if (answer.isCorrect) section.correct += 1;
  }

  for (const level of CEFR_LEVELS) {
    const bucket = levelAccuracy[level];
    bucket.accuracy = bucket.total === 0 ? 0 : bucket.correct / bucket.total;
  }

  // Walk up from A1; the estimate is the last level held consecutively. The
  // walk stops at the first gap so a lucky guess three levels up cannot pull
  // the estimate past material the learner has clearly not met.
  let held: CefrLevel = "A1";
  let heldAny = false;
  for (const level of CEFR_LEVELS) {
    const bucket = levelAccuracy[level];
    if (bucket.total === 0) continue;
    if (bucket.accuracy >= HOLD_THRESHOLD) {
      held = level;
      heldAny = true;
    } else {
      break;
    }
  }

  // If even A1 was not held, the learner starts at A1 regardless.
  let estimated: CefrLevel = heldAny ? held : "A1";

  // Held the level comfortably *and* showed partial control of the next one?
  // Then start at the next level — they would be bored otherwise.
  const heldIndex = levelIndex(estimated);
  const next = CEFR_LEVELS[heldIndex + 1];
  if (heldAny && next) {
    const heldBucket = levelAccuracy[estimated];
    const nextBucket = levelAccuracy[next];
    if (
      heldBucket.accuracy >= STRONG_THRESHOLD &&
      nextBucket.total > 0 &&
      nextBucket.accuracy >= 0.5
    ) {
      estimated = next;
    }
  }

  const sectionScores = {
    vocabulary: 0,
    grammar: 0,
    reading: 0,
    listening: 0,
    sentence_construction: 0,
    speaking: 0,
  } as Record<PlacementSection, number>;

  for (const [section, tally] of Object.entries(sectionTally)) {
    sectionScores[section as PlacementSection] =
      tally.total === 0 ? 0 : (tally.correct / tally.total) * 100;
  }

  const answeredSections = Object.entries(sectionTally)
    .filter(([, t]) => t.total > 0)
    .map(([s]) => s as PlacementSection);

  const average =
    answeredSections.length === 0
      ? 0
      : answeredSections.reduce((sum, s) => sum + sectionScores[s], 0) / answeredSections.length;

  const weakSections = answeredSections
    .filter((s) => sectionScores[s] < Math.max(50, average - 15))
    .sort((a, b) => sectionScores[a] - sectionScores[b]);

  const correctCount = answers.filter((a) => a.isCorrect).length;

  return {
    estimatedLevel: estimated,
    confidence: placementConfidence(answers.length, levelAccuracy, estimated),
    correctCount,
    questionCount: answers.length,
    sectionScores,
    levelAccuracy,
    weakSections,
    recommendation: buildRecommendation(estimated, weakSections, sectionScores),
  };
}

/**
 * Confidence reflects both how much evidence there is and how cleanly the
 * levels separated. A learner who was 100% at A2 and 0% at B1 gives a sharp
 * signal; one who scored 60% at every level gives a muddy one.
 */
function placementConfidence(
  answered: number,
  levelAccuracy: PlacementOutcome["levelAccuracy"],
  estimated: CefrLevel,
): number {
  if (answered === 0) return 0;
  const volume = clamp(answered / 30, 0, 1);

  const at = levelAccuracy[estimated].accuracy;
  const above = CEFR_LEVELS[levelIndex(estimated) + 1];
  const aboveAccuracy = above ? levelAccuracy[above].accuracy : 0;
  const separation = clamp(at - aboveAccuracy, 0, 1);

  return clamp(0.4 * volume + 0.6 * separation + 0.15, 0, 1);
}

function buildRecommendation(
  level: CefrLevel,
  weakSections: PlacementSection[],
  scores: Record<PlacementSection, number>,
): string {
  const { name } = LEVEL_DESCRIPTIONS[level];
  const parts: string[] = [];

  parts.push(
    level === "A1"
      ? "We recommend starting at A1 from the beginning — the foundations are what everything above depends on."
      : `Your Spanish looks like ${level} (${name}). We recommend starting at the beginning of ${level} so nothing is skipped.`,
  );

  if (weakSections.length > 0) {
    const named = weakSections
      .map((s) => `${placementSectionLabel(s)} (${Math.round(scores[s])}%)`)
      .join(" and ");
    parts.push(
      `Your weakest area${weakSections.length > 1 ? "s were" : " was"} ${named}, so your daily sessions will start with extra work there.`,
    );
  }

  return parts.join(" ");
}

export function placementSectionLabel(section: PlacementSection): string {
  switch (section) {
    case "vocabulary":
      return "vocabulary";
    case "grammar":
      return "grammar";
    case "reading":
      return "reading comprehension";
    case "listening":
      return "listening comprehension";
    case "sentence_construction":
      return "sentence construction";
    case "speaking":
      return "speaking";
  }
}

/**
 * Seed skill scores from the placement result so the dashboard is populated on
 * day one instead of showing six zeros. Damped, because a 25-question test is
 * weaker evidence than actual coursework.
 */
export function skillsFromPlacement(outcome: PlacementOutcome) {
  const damp = (value: number) => clamp(value * 0.8, 0, 100);
  return {
    vocabulary: damp(outcome.sectionScores.vocabulary),
    grammar: damp(outcome.sectionScores.grammar),
    reading: damp(outcome.sectionScores.reading),
    listening: damp(outcome.sectionScores.listening),
    writing: damp(outcome.sectionScores.sentence_construction),
    speaking: damp(outcome.sectionScores.speaking || outcome.sectionScores.sentence_construction * 0.6),
  };
}

/** The learner chose "Start from A1" instead of testing. */
export function manualA1Outcome(): PlacementOutcome {
  return {
    estimatedLevel: "A1",
    confidence: 1,
    correctCount: 0,
    questionCount: 0,
    sectionScores: {
      vocabulary: 0,
      grammar: 0,
      reading: 0,
      listening: 0,
      sentence_construction: 0,
      speaking: 0,
    },
    levelAccuracy: CEFR_LEVELS.reduce(
      (acc, level) => ({ ...acc, [level]: { correct: 0, total: 0, accuracy: 0 } }),
      {} as PlacementOutcome["levelAccuracy"],
    ),
    weakSections: [],
    recommendation:
      "Starting from A1 at your request. You will begin with the alphabet and pronunciation, then greetings.",
  };
}
