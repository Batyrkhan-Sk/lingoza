/**
 * @lingoza/engine — the learning system.
 *
 * Everything that decides *what a learner should do next* and *how well they
 * did it* lives here, with no dependency on HTTP, React, Prisma or Telegram.
 * The web app, the bot and any future mobile client are interfaces over this
 * one engine (§24).
 */

export * from "./core/types.js";
export * from "./core/cefr.js";
export * from "./core/text.js";
export * from "./learning/srs.js";
export * from "./learning/scoring.js";
export * from "./learning/placement.js";
export * from "./learning/adaptivity.js";
export * from "./learning/daily.js";
export * from "./learning/gamification.js";
export * from "./learning/lesson-session.js";
export * from "./learning/mistakes.js";
export * from "./learning/mnemonics.js";
export * from "./learning/reminders.js";

export * from "./ai/provider.js";
export * from "./ai/client.js";
export * from "./ai/tutor.js";
export * from "./ai/writing.js";
export * from "./ai/speaking.js";
export * from "./ai/lookup.js";
export * from "./ai/mnemonics.js";
export * from "./ai/tts.js";
export * from "./ai/explain.js";
