import {
  explainPassage,
  parseLevel,
  splitPassageLines,
  type CefrLevel,
  type Interface,
  type PassageLine,
} from "@lingoza/engine";
import { ai } from "./ai.js";
import { recordActivity } from "./progress.js";
import { prisma } from "../db.js";

/**
 * Walking through a passage the learner brought — line, meaning, line, meaning.
 *
 * This is the reading mode a song actually needs. The breakdown of a lyric as
 * a bag of words tells a learner which words are hard; it does not let them
 * *read the song*, which is the thing they wanted to do and the reason they
 * chose that song over a textbook.
 *
 * The text is supplied by the learner, from wherever they are legitimately
 * reading it. That is what makes this unrestricted where fetching the same
 * words for them is not: analysing text someone shows you is what a dictionary
 * does, and it needs no more permission than a dictionary does. Nothing here
 * is persisted — the passage lives in memory for an hour so the learner can
 * page through it, and then it is gone.
 *
 * Explained a page at a time rather than all at once, because a sixty-line
 * song is sixty lines of generation the learner may abandon after eight, and
 * because a page arrives in a few seconds where the whole song would not.
 */

/** Lines per page. Six fits a phone screen with its breakdown attached. */
const PAGE_LINES = 6;
/** Longest passage accepted. A song is well inside this; a novel is not. */
const MAX_LINES = 200;
const BUFFER_TTL_MS = 60 * 60_000;
const BUFFER_LIMIT = 200;

interface Passage {
  lines: string[];
  /** Where the next page starts. */
  cursor: number;
  context?: string;
  level: CefrLevel;
  /** Pages already explained, so paging back costs nothing. */
  pages: Map<number, PassageLine[]>;
  expires: number;
}

const passages = new Map<string, Passage>();

export interface BreakdownPage {
  lines: PassageLine[];
  /** 1-based line numbers of this page, for "lines 7–12 of 54". */
  from: number;
  to: number;
  total: number;
  /** True when this page ends the passage. */
  done: boolean;
  context?: string;
  message: string | null;
}

function empty(message: string): BreakdownPage {
  return { lines: [], from: 0, to: 0, total: 0, done: true, message };
}

/**
 * Take a pasted passage and explain its first page.
 *
 * One passage per learner at a time: a second paste replaces the first, which
 * is what someone moving from one song to the next means by it, and avoids
 * asking them to manage a list of open passages in a chat window.
 */
export async function startBreakdown(
  userId: string,
  text: string,
  options: { context?: string; source?: Interface } = {},
): Promise<BreakdownPage> {
  const lines = splitPassageLines(text, MAX_LINES);
  if (lines.length === 0) return empty("There was no Spanish in that — paste the words themselves.");

  if (!ai.enabled) {
    return empty(
      "Line-by-line reading needs an AI provider. Add GEMINI_API_KEY to enable it.",
    );
  }

  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const level = parseLevel(progress?.currentLevelCode);

  if (passages.size >= BUFFER_LIMIT) {
    const oldest = passages.keys().next().value;
    if (oldest) passages.delete(oldest);
  }

  passages.set(userId, {
    lines,
    cursor: 0,
    context: options.context,
    level,
    pages: new Map(),
    expires: Date.now() + BUFFER_TTL_MS,
  });

  return nextBreakdownPage(userId, options.source);
}

/** Explain the next page of the passage this learner is working through. */
export async function nextBreakdownPage(
  userId: string,
  source: Interface = "telegram",
): Promise<BreakdownPage> {
  const passage = passages.get(userId);
  if (!passage || passage.expires < Date.now()) {
    passages.delete(userId);
    return empty("That passage has expired — paste it again and I'll pick up where we were.");
  }

  const start = passage.cursor;
  if (start >= passage.lines.length) {
    return { lines: [], from: 0, to: 0, total: passage.lines.length, done: true, message: null };
  }

  const slice = passage.lines.slice(start, start + PAGE_LINES);
  const cached = passage.pages.get(start);

  const explained =
    cached ??
    (
      await explainPassage(ai, {
        lines: slice,
        level: passage.level,
        context: passage.context,
      })
    )?.lines;

  if (!explained) {
    return empty("Couldn't read that part just now — try again in a moment.");
  }

  passage.pages.set(start, explained);
  passage.cursor = start + slice.length;
  passage.expires = Date.now() + BUFFER_TTL_MS;

  const done = passage.cursor >= passage.lines.length;

  // Credited per page, not per passage: someone who reads eight lines of a
  // song and stops did eight lines of reading, and a learner who works
  // through the whole thing should not have to finish to be counted.
  if (!cached) {
    await recordActivity({
      userId,
      activity: "reading",
      skills: { reading: 70, vocabulary: 60 },
      weight: 0.15,
      xp: 4,
      minutes: 2,
      source,
    }).catch((error) => {
      console.warn("[breakdown] could not record activity:", error instanceof Error ? error.message : error);
    });
  }

  return {
    lines: explained,
    from: start + 1,
    to: start + slice.length,
    total: passage.lines.length,
    done,
    context: passage.context,
    message: null,
  };
}

/** Whether this learner has a passage open — drives the "continue" prompt. */
export function hasOpenPassage(userId: string): boolean {
  const passage = passages.get(userId);
  if (!passage) return false;
  if (passage.expires < Date.now()) {
    passages.delete(userId);
    return false;
  }
  return passage.cursor < passage.lines.length;
}
