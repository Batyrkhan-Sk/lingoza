import { LESSON_SECTIONS, type LessonSection, type LessonStatus } from "../core/types.js";

/**
 * The lesson state machine (§3, §19).
 *
 * A lesson is nine sections in a fixed order. Position is stored as data —
 * the current section plus the set completed — rather than held in any client's
 * memory, which is precisely what allows a learner to start a lesson in the
 * browser, walk away, and be handed the next section by the Telegram bot.
 */

export interface SessionState {
  currentSection: LessonSection;
  completedSections: LessonSection[];
  status: LessonStatus;
}

export interface SectionAvailability {
  section: LessonSection;
  /** Sections with no content in this lesson are skipped, not shown empty. */
  present: boolean;
}

export function parseSections(serialized: string): LessonSection[] {
  return serialized
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is LessonSection => (LESSON_SECTIONS as readonly string[]).includes(s));
}

export function serializeSections(sections: LessonSection[]): string {
  // Keep them in lesson order regardless of completion order.
  return LESSON_SECTIONS.filter((s) => sections.includes(s)).join(",");
}

export function sectionIndex(section: LessonSection): number {
  return LESSON_SECTIONS.indexOf(section);
}

export function sectionLabel(section: LessonSection): string {
  switch (section) {
    case "explanation": return "Explanation";
    case "examples": return "Examples";
    case "vocabulary": return "Vocabulary";
    case "grammar": return "Grammar";
    case "listening": return "Listening";
    case "practice": return "Practice";
    case "speaking": return "Speaking";
    case "test": return "Test";
    case "review": return "Review";
  }
}

/**
 * Advance past `section`. Returns the next section that actually has content,
 * so a lesson without a listening clip moves straight from grammar to practice
 * instead of presenting an empty screen.
 */
export function completeSection(
  state: SessionState,
  section: LessonSection,
  available: SectionAvailability[],
): SessionState {
  const completed = state.completedSections.includes(section)
    ? state.completedSections
    : [...state.completedSections, section];

  const next = nextSection(section, available);

  return {
    completedSections: completed,
    currentSection: next ?? section,
    status: next === null ? "completed" : "in_progress",
  };
}

export function nextSection(
  section: LessonSection,
  available: SectionAvailability[],
): LessonSection | null {
  const presence = new Map(available.map((a) => [a.section, a.present]));
  for (let i = sectionIndex(section) + 1; i < LESSON_SECTIONS.length; i++) {
    const candidate = LESSON_SECTIONS[i]!;
    if (presence.get(candidate) !== false) return candidate;
  }
  return null;
}

export function firstSection(available: SectionAvailability[]): LessonSection {
  const presence = new Map(available.map((a) => [a.section, a.present]));
  return LESSON_SECTIONS.find((s) => presence.get(s) !== false) ?? "explanation";
}

/** 0–100 completion of a lesson in progress, counting only present sections. */
export function sessionProgress(
  state: SessionState,
  available: SectionAvailability[],
): number {
  const present = available.filter((a) => a.present).map((a) => a.section);
  if (present.length === 0) return 0;
  const done = state.completedSections.filter((s) => present.includes(s)).length;
  return (done / present.length) * 100;
}

export function initialSession(available: SectionAvailability[]): SessionState {
  return {
    currentSection: firstSection(available),
    completedSections: [],
    status: "in_progress",
  };
}

/**
 * Whether a lesson may be started, given its prerequisites. Enforcing this is
 * what keeps the course a progression rather than a menu (§23).
 */
export function isUnlocked(input: {
  prerequisiteIds: string[];
  completedLessonIds: Set<string>;
}): boolean {
  return input.prerequisiteIds.every((id) => input.completedLessonIds.has(id));
}

export function lockReason(input: {
  prerequisites: { id: string; title: string }[];
  completedLessonIds: Set<string>;
}): string | null {
  const missing = input.prerequisites.filter((p) => !input.completedLessonIds.has(p.id));
  if (missing.length === 0) return null;
  if (missing.length === 1) return `Finish "${missing[0]!.title}" first.`;
  return `Finish ${missing.length} earlier lessons first, starting with "${missing[0]!.title}".`;
}
