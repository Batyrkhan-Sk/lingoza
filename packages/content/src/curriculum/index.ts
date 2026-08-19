import type { CefrLevel } from "@lingoza/engine";
import type { CourseEntry, LessonEntry, ModuleEntry } from "../types.js";
import { A1_COURSE } from "./a1.js";
import { A2_COURSE } from "./a2.js";
import { B1_COURSE } from "./b1.js";
import { B2_COURSE } from "./b2.js";
import { C1_COURSE } from "./c1.js";
import { C2_COURSE } from "./c2.js";

/**
 * The course catalogue, in teaching order.
 *
 * Array position is the curriculum order — `orderIndex` for levels, courses,
 * modules and lessons is derived from it at seed time, so reordering a lesson
 * is a matter of moving it in the file rather than renumbering anything.
 */
export const COURSES: CourseEntry[] = [
  A1_COURSE,
  A2_COURSE,
  B1_COURSE,
  B2_COURSE,
  C1_COURSE,
  C2_COURSE,
];

export function courseForLevel(level: CefrLevel): CourseEntry | undefined {
  return COURSES.find((course) => course.levelCode === level);
}

export function allModules(): ModuleEntry[] {
  return COURSES.flatMap((course) => course.modules);
}

export function allLessons(): LessonEntry[] {
  return allModules().flatMap((module) => module.lessons);
}

export function findLesson(slug: string): LessonEntry | undefined {
  return allLessons().find((lesson) => lesson.slug === slug);
}

/** The lesson a learner starting at `level` should begin with. */
export function firstLessonOfLevel(level: CefrLevel): LessonEntry | undefined {
  return courseForLevel(level)?.modules[0]?.lessons[0];
}

export { A1_COURSE, A2_COURSE, B1_COURSE, B2_COURSE, C1_COURSE, C2_COURSE };
