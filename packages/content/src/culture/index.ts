import type { CefrLevel } from "@lingoza/engine";
import type { CultureNoteEntry, ScenarioEntry } from "../types.js";
import { CULTURE_NOTES } from "./notes.js";
import { SCENARIOS } from "./scenarios.js";

export { CULTURE_NOTES } from "./notes.js";
export { SCENARIOS } from "./scenarios.js";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Culture notes a learner at this level can actually read. */
export function cultureForLevel(level: CefrLevel): CultureNoteEntry[] {
  const ceiling = LEVELS.indexOf(level);
  return CULTURE_NOTES.filter((note) => LEVELS.indexOf(note.levelCode) <= ceiling);
}

/** Scenarios unlocked at this level, easiest first. */
export function scenariosForLevel(level: CefrLevel): ScenarioEntry[] {
  const ceiling = LEVELS.indexOf(level);
  return SCENARIOS.filter((scenario) => LEVELS.indexOf(scenario.levelCode) <= ceiling).sort(
    (a, b) => LEVELS.indexOf(a.levelCode) - LEVELS.indexOf(b.levelCode),
  );
}

export function findScenario(slug: string): ScenarioEntry | undefined {
  return SCENARIOS.find((scenario) => scenario.slug === slug);
}
