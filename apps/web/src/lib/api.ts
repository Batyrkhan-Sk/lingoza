/**
 * The API client.
 *
 * One place that knows the token lives in localStorage and that a 401 means
 * "sign in again" — every screen just calls `api.get(...)` and never thinks
 * about headers or auth.
 */

const TOKEN_KEY = "lingoza.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401) {
    setToken(null);
    // Full reload rather than a router navigation: the whole cache is now
    // stale, and a hard reset is the honest way to handle a dead session.
    window.location.href = "/login";
    throw new ApiError("Session expired.", 401);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const body = payload as { message?: string; error?: string };
    throw new ApiError(body.message ?? "Something went wrong.", response.status, body.error);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Shared response shapes ──────────────────────────────────────────────────

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Skills {
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  grammar: number;
  vocabulary: number;
}

export interface Me {
  id: string;
  email: string | null;
  displayName: string;
  dialectPreference: string;
  dailyTimeBudget: number;
  timezone: string;
  telegramLinked: boolean;
  remindersEnabled: boolean;
  /** Local times the Telegram bot nudges at, e.g. ["08:45", "13:00", "20:00"]. */
  reminderTimes: string[];
  level: CefrLevel;
  needsPlacement: boolean;
}

export interface HomeData {
  headline: string;
  level: CefrLevel;
  overall: number;
  courseProgress: number;
  streak: number;
  xp: number;
  wordsDue: number;
  hasPlacement: boolean;
  continueLesson: { slug: string; title: string } | null;
  weakAreas: { kind: string; key: string; label: string; urgency: number; detail: string }[];
  recommendations: {
    kind: string;
    title: string;
    reason: string;
    priority: number;
    minutes: number;
    targetSlug?: string;
  }[];
  advancement: { ready: boolean; reason: string };
}

export interface Dashboard {
  level: CefrLevel;
  skills: Skills;
  overall: number;
  xp: number;
  playerLevel: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgressPercent: number;
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
  wordsLearned: number;
  wordsMastered: number;
  grammarMastered: number;
  totalStudyMinutes: number;
  minutesToday: number;
  dailyTimeBudget: number;
  courseProgress: number;
  wordsDue: number;
}

export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  status: "not_started" | "in_progress" | "completed";
  score: number;
  unlocked: boolean;
  lockReason: string | null;
}

export interface ModuleSummary {
  slug: string;
  title: string;
  description: string;
  theme: string;
  icon: string;
  lessons: LessonSummary[];
}

export interface LevelSummary {
  code: CefrLevel;
  name: string;
  description: string;
  canDo: string;
  courses: { slug: string; title: string; description: string; modules: ModuleSummary[] }[];
}

export type LessonSectionName =
  | "explanation" | "examples" | "vocabulary" | "grammar"
  | "listening" | "practice" | "speaking" | "test" | "review";

export interface Word {
  id: string;
  spanish: string;
  english: string;
  pronunciation: string;
  exampleSentence: string;
  exampleTranslation: string;
  levelCode: CefrLevel;
  topic: string;
  partOfSpeech: string;
  gender: string | null;
  pluralForm: string | null;
  region?: string | null;
  regionalVariant?: string | null;
  status?: string;
  strength?: number;
  related?: { kind: string; spanish: string; english: string }[];
}

export interface QuestionView {
  id: string;
  kind: string;
  prompt: string;
  context: string | null;
  hint: string | null;
  points?: number;
  options: { id: string; text: string }[];
}

export interface ExerciseView {
  id: string;
  title: string;
  kind: string;
  prompt: string;
  section: string;
  questions: QuestionView[];
}

export interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  explanation: string;
  review: string;
  culturalNote: string | null;
  level: CefrLevel;
  moduleTitle: string;
  unlocked: boolean;
  lockReason: string | null;
  sections: {
    available: { section: LessonSectionName; present: boolean }[];
    current: LessonSectionName;
    completed: LessonSectionName[];
    progressPercent: number;
  };
  status: string;
  score: number;
  examples: { id: string; spanish: string; english: string; note: string | null }[];
  vocabulary: Word[];
  grammar: {
    id: string; slug: string; title: string; formula: string;
    explanation: string; whenToUse: string;
    examples: { spanish: string; english: string; note: string | null }[];
    mistakes: { wrong: string; right: string; explanation: string }[];
  }[];
  exercises: ExerciseView[];
  listening: {
    id: string; slug: string; title: string; accent: string; speed: string; intro: string | null;
    segments: { id: string; speaker: string | null; spanish: string; english: string }[];
  }[];
  reading: { id: string; slug: string; title: string; body: string; intro: string | null }[];
  speaking: { id: string; slug: string; title: string; instruction: string; targetText: string | null; mode: string }[];
  writing: { id: string; slug: string; title: string; instruction: string; minWords: number; maxWords: number }[];
}

export interface QuizFeedback {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  note?: string;
  optionFeedback?: string;
}

export interface QuizOutcome {
  score: number;
  correctCount: number;
  questionCount: number;
  xp: number;
  passed: boolean;
  verdict: string;
  feedback: QuizFeedback[];
  activity: {
    xpEarned: number;
    streak: number;
    streakMessage: string;
    unlockedAchievements: { slug: string; title: string; description: string }[];
  };
}
