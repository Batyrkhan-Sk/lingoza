import { CEFR_LEVELS, type CefrLevel } from "@lingoza/engine";
import type {
  CourseEntry,
  LessonEntry,
  PlacementQuestionEntry,
  QuestionEntry,
  VocabularyEntry,
  GrammarTopicEntry,
  GrammarContrastEntry,
  GrammarMnemonicEntry,
  WordMnemonicEntry,
} from "../types.js";

/**
 * Content verification.
 *
 * Learning material that is subtly wrong is worse than no material: a learner
 * cannot tell the difference, and will confidently reproduce the error. These
 * checks run over the entire curriculum in CI and before every seed.
 *
 * Three classes of check:
 *
 *  1. **Structural** — do the references resolve, are slugs unique, is the
 *     prerequisite graph acyclic and forward-only.
 *  2. **Pedagogical** — is every lesson taught with material at or below its
 *     own level, does every exercise test what its lesson actually taught.
 *  3. **Linguistic** — Spanish orthography that can be checked mechanically:
 *     paired ¿…? and ¡…!, accented question words, correct answers that are
 *     actually present among the options.
 *
 * Anything that cannot be checked mechanically is reported as a warning for a
 * human to review, never silently passed.
 */

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  /** Stable machine-readable code, e.g. "prereq.missing". */
  code: string;
  /** Where the problem is, e.g. "lesson:a1-greetings-hello". */
  where: string;
  message: string;
}

export interface VerificationInput {
  courses: CourseEntry[];
  vocabulary: VocabularyEntry[];
  grammar: GrammarTopicEntry[];
  contrasts: GrammarContrastEntry[];
  placement: PlacementQuestionEntry[];
  grammarMnemonics?: GrammarMnemonicEntry[];
  wordMnemonics?: WordMnemonicEntry[];
}

export interface VerificationReport {
  findings: Finding[];
  errors: number;
  warnings: number;
  checked: {
    courses: number;
    modules: number;
    lessons: number;
    exercises: number;
    questions: number;
    words: number;
    grammarTopics: number;
    placementItems: number;
    mnemonics: number;
  };
  ok: boolean;
}

const levelIndex = (level: string): number => CEFR_LEVELS.indexOf(level as CefrLevel);

export function verifyContent(input: VerificationInput): VerificationReport {
  const findings: Finding[] = [];
  const add = (severity: Severity, code: string, where: string, message: string) =>
    findings.push({ severity, code, where, message });

  const lessons = input.courses.flatMap((c) => c.modules.flatMap((m) => m.lessons));
  const lessonLevels = new Map<string, CefrLevel>();
  const lessonOrder = new Map<string, number>();

  for (const course of input.courses) {
    let order = 0;
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        lessonLevels.set(lesson.slug, course.levelCode);
        lessonOrder.set(lesson.slug, levelIndex(course.levelCode) * 1000 + order++);
      }
    }
  }

  const wordsBySlug = new Map(input.vocabulary.map((w) => [w.spanish.toLowerCase(), w]));
  /** Headwords without their articles, for resolving cross-references. */
  const bareWords = new Set(input.vocabulary.map((w) => stripArticle(w.spanish)));
  const grammarBySlug = new Map(input.grammar.map((t) => [t.slug, t]));

  // ─── Structural: unique slugs ──────────────────────────────────────────────
  checkUnique(input.courses.map((c) => c.slug), "course", add);
  checkUnique(input.courses.flatMap((c) => c.modules.map((m) => m.slug)), "module", add);
  checkUnique(lessons.map((l) => l.slug), "lesson", add);
  checkUnique(input.grammar.map((t) => t.slug), "grammar topic", add);
  checkUnique(
    input.vocabulary.map((w) => `${w.spanish}|${w.levelCode}`),
    "vocabulary entry",
    add,
  );

  // ─── Courses & levels ──────────────────────────────────────────────────────
  const seenLevels = new Set(input.courses.map((c) => c.levelCode));
  for (const level of CEFR_LEVELS) {
    if (!seenLevels.has(level)) {
      add("error", "level.missing", `level:${level}`, `No course defined for ${level}.`);
    }
  }

  for (const course of input.courses) {
    if (course.modules.length === 0) {
      add("error", "course.empty", `course:${course.slug}`, "Course has no modules.");
    }
    for (const module of course.modules) {
      if (module.lessons.length === 0) {
        add("error", "module.empty", `module:${module.slug}`, "Module has no lessons.");
      }
    }
  }

  // ─── Lessons ───────────────────────────────────────────────────────────────
  for (const lesson of lessons) {
    const where = `lesson:${lesson.slug}`;
    const level = lessonLevels.get(lesson.slug)!;

    if (lesson.explanation.trim().length < 80) {
      add("warning", "lesson.thin", where, "Explanation is very short for a full lesson.");
    }
    if (!lesson.objective.trim()) {
      add("error", "lesson.objective", where, "Lesson has no objective.");
    }
    if (!lesson.review.trim()) {
      add("warning", "lesson.review", where, "Lesson has no review summary (section 9).");
    }

    // Prerequisites must exist and must come earlier in the course order.
    for (const prereq of lesson.prerequisites ?? []) {
      if (!lessonOrder.has(prereq)) {
        add("error", "prereq.missing", where, `Prerequisite "${prereq}" does not exist.`);
        continue;
      }
      if (lessonOrder.get(prereq)! >= lessonOrder.get(lesson.slug)!) {
        add(
          "error",
          "prereq.forward",
          where,
          `Prerequisite "${prereq}" comes later in the course — a learner could never unlock this.`,
        );
      }
    }

    // Vocabulary referenced by a lesson must exist and be at or below its level.
    for (const word of lesson.vocabulary ?? []) {
      const entry = wordsBySlug.get(word.toLowerCase());
      if (!entry) {
        add("error", "vocab.missing", where, `Vocabulary "${word}" is not in the word list.`);
        continue;
      }
      if (levelIndex(entry.levelCode) > levelIndex(level)) {
        add(
          "error",
          "vocab.too-advanced",
          where,
          `"${word}" is ${entry.levelCode} vocabulary but the lesson is ${level}.`,
        );
      }
    }

    // Same for grammar.
    for (const slug of lesson.grammar ?? []) {
      const topic = grammarBySlug.get(slug);
      if (!topic) {
        add("error", "grammar.missing", where, `Grammar topic "${slug}" does not exist.`);
        continue;
      }
      if (levelIndex(topic.levelCode) > levelIndex(level)) {
        add(
          "error",
          "grammar.too-advanced",
          where,
          `"${slug}" is a ${topic.levelCode} topic but the lesson is ${level}.`,
        );
      }
    }

    verifyLessonSpanish(lesson, add);

    // Exercises
    for (const exercise of lesson.exercises ?? []) {
      const exWhere = `${where}/exercise:${exercise.title}`;
      if (exercise.questions.length === 0) {
        add("error", "exercise.empty", exWhere, "Exercise has no questions.");
      }
      if (exercise.grammarSlug && !grammarBySlug.has(exercise.grammarSlug)) {
        add("error", "exercise.grammar", exWhere, `Unknown grammar slug "${exercise.grammarSlug}".`);
      }
      for (const question of exercise.questions) {
        verifyQuestion(question, exWhere, add);
      }
    }

    // Every lesson should have at least one way to check understanding.
    const hasTest = (lesson.exercises ?? []).some((e) => e.section === "test");
    const hasAnyExercise = (lesson.exercises ?? []).length > 0;
    if (!hasAnyExercise) {
      add("error", "lesson.no-practice", where, "Lesson has no exercises at all.");
    } else if (!hasTest) {
      add("warning", "lesson.no-test", where, "Lesson has practice but no test section.");
    }

    // Listening/reading attached to a lesson must match its level.
    for (const listening of lesson.listening ?? []) {
      if (levelIndex(listening.levelCode) > levelIndex(level)) {
        add("error", "listening.level", where, `Listening "${listening.slug}" is above the lesson level.`);
      }
      if (listening.segments.length === 0) {
        add("error", "listening.empty", where, `Listening "${listening.slug}" has no transcript segments.`);
      }
      for (const segment of listening.segments) {
        if (!segment.english.trim()) {
          add("error", "listening.untranslated", where, `A segment of "${listening.slug}" has no translation.`);
        }
      }
    }
    for (const reading of lesson.reading ?? []) {
      if (levelIndex(reading.levelCode) > levelIndex(level)) {
        add("error", "reading.level", where, `Reading "${reading.slug}" is above the lesson level.`);
      }
      if (reading.body.trim().length < 40) {
        add("warning", "reading.thin", where, `Reading "${reading.slug}" is very short.`);
      }
    }
  }

  // ─── Grammar topics ────────────────────────────────────────────────────────
  for (const topic of input.grammar) {
    const where = `grammar:${topic.slug}`;
    if (topic.examples.length < 2) {
      add("warning", "grammar.examples", where, "Fewer than two examples.");
    }
    if (topic.mistakes.length === 0) {
      add(
        "warning",
        "grammar.mistakes",
        where,
        "No common mistakes listed — a rule without its typical error is easy to misapply.",
      );
    }
    if (!topic.formula.trim()) {
      add("warning", "grammar.formula", where, "No pattern/formula given.");
    }
    for (const example of topic.examples) {
      verifySpanishText(example.spanish, `${where}/example`, add);
      if (!example.english.trim()) {
        add("error", "grammar.example.untranslated", where, `Example "${example.spanish}" has no translation.`);
      }
    }
    for (const mistake of topic.mistakes) {
      if (mistake.wrong.trim() === mistake.right.trim()) {
        add("error", "grammar.mistake.identical", where, "A 'common mistake' has identical wrong and right forms.");
      }
      if (!mistake.explanation.trim()) {
        add("error", "grammar.mistake.unexplained", where, `Mistake "${mistake.wrong}" has no explanation.`);
      }
    }
  }

  // ─── Contrasts ─────────────────────────────────────────────────────────────
  for (const contrast of input.contrasts) {
    const where = `contrast:${contrast.slug}`;
    for (const slug of [contrast.topicASlug, contrast.topicBSlug]) {
      if (!grammarBySlug.has(slug)) {
        add("error", "contrast.topic-missing", where, `References unknown grammar topic "${slug}".`);
      }
    }
    if (contrast.rows.length === 0) {
      add("error", "contrast.empty", where, "Contrast has no comparison rows.");
    }
    if (!contrast.summary.trim()) {
      add("error", "contrast.summary", where, "Contrast has no one-line rule of thumb.");
    }
  }

  // ─── Vocabulary ────────────────────────────────────────────────────────────
  for (const word of input.vocabulary) {
    const where = `word:${word.spanish}`;
    if (!word.exampleSentence.trim()) {
      add("error", "word.no-example", where, "Word has no example sentence.");
    } else {
      verifySpanishText(word.exampleSentence, where, add);
      // The example must actually contain the word it illustrates. Verbs are
      // exempt: a headword is an infinitive but an example sentence conjugates
      // it, and Spanish stem changes (ser → soy, tener → tengo) make textual
      // containment useless as a signal without a full morphological analyser.
      const inflects = word.partOfSpeech === "verb";
      if (!inflects && !exampleContainsWord(word.exampleSentence, word.spanish)) {
        add(
          "warning",
          "word.example-mismatch",
          where,
          `Example "${word.exampleSentence}" may not contain "${word.spanish}".`,
        );
      }
    }
    if (!word.exampleTranslation.trim()) {
      add("error", "word.no-translation", where, "Example sentence has no translation.");
    }
    if (!word.pronunciation.trim()) {
      add("warning", "word.no-pronunciation", where, "No pronunciation guide.");
    }
    if (word.partOfSpeech === "noun" && !word.gender) {
      add("error", "word.no-gender", where, "A noun must declare its grammatical gender.");
    }
    if (word.difficulty < 1 || word.difficulty > 5) {
      add("error", "word.difficulty", where, `Difficulty ${word.difficulty} is outside 1–5.`);
    }
    for (const related of [...(word.synonyms ?? []), ...(word.antonyms ?? [])]) {
      // Related words are allowed to be outside the list, but flag it so the
      // relationship can be added deliberately rather than dangling. Compare
      // without articles, since a headword is stored as "la madre" but is
      // naturally referenced as "madre".
      if (!bareWords.has(stripArticle(related))) {
        add("warning", "word.relation-dangling", where, `Related word "${related}" is not in the word list.`);
      }
    }
  }

  // ─── Placement bank ────────────────────────────────────────────────────────
  const placementLevels = new Map<string, number>();
  for (const question of input.placement) {
    const where = `placement:${question.prompt.slice(0, 40)}`;
    placementLevels.set(question.levelCode, (placementLevels.get(question.levelCode) ?? 0) + 1);

    if (question.options && question.options.length > 0) {
      if (!question.options.includes(question.correctAnswer)) {
        add(
          "error",
          "placement.answer-missing",
          where,
          `Correct answer "${question.correctAnswer}" is not among the options.`,
        );
      }
      if (question.options.length < 2) {
        add("error", "placement.options", where, "Multiple-choice item has fewer than two options.");
      }
      if (new Set(question.options).size !== question.options.length) {
        add("error", "placement.duplicate-options", where, "Duplicate options.");
      }
    }
    if (!question.explanation.trim()) {
      add("error", "placement.unexplained", where, "No explanation for the answer.");
    }
    if (question.section === "listening" && !question.audioText) {
      add("error", "placement.no-audio", where, "Listening item has no audio text to speak.");
    }
  }

  for (const level of CEFR_LEVELS) {
    const count = placementLevels.get(level) ?? 0;
    if (count === 0) {
      add(
        "error",
        "placement.level-uncovered",
        `placement:${level}`,
        `No placement items at ${level} — the estimator cannot discriminate at this level.`,
      );
    } else if (count < 2) {
      add(
        "warning",
        "placement.level-thin",
        `placement:${level}`,
        `Only ${count} placement item at ${level}; a single item makes the estimate luck-dependent.`,
      );
    }
  }

  // ─── Memory hooks ──────────────────────────────────────────────────────────
  for (const mnemonic of input.grammarMnemonics ?? []) {
    const where = `mnemonic:${mnemonic.grammarSlug}`;
    if (!grammarBySlug.has(mnemonic.grammarSlug)) {
      add("error", "mnemonic.topic-missing", where, `Hook references unknown grammar topic "${mnemonic.grammarSlug}".`);
    }
    if (mnemonic.hook.trim().length < 10) {
      add("error", "mnemonic.empty", where, "Hook is too short to be useful.");
    }
    // A hook you have to stop and read is not a memory aid.
    if (mnemonic.hook.length > 220) {
      add("warning", "mnemonic.too-long", where, "Hook is long enough that it cannot be recalled mid-sentence.");
    }
  }

  for (const mnemonic of input.wordMnemonics ?? []) {
    const where = `mnemonic:${mnemonic.spanish}`;
    if (!bareWords.has(stripArticle(mnemonic.spanish))) {
      add("error", "mnemonic.word-missing", where, `Hook references "${mnemonic.spanish}", which is not in the word list.`);
    }
    if (mnemonic.hook.trim().length < 10) {
      add("error", "mnemonic.empty", where, "Hook is too short to be useful.");
    }
    // The whole mechanism of a keyword mnemonic is the sound-alike. Without
    // imagery it is just a second word to memorise.
    if (mnemonic.kind === "keyword") {
      if (!mnemonic.keyword) {
        add("error", "mnemonic.no-keyword", where, "A keyword mnemonic must give the English sound-alike.");
      }
      if (!mnemonic.imagery) {
        add("error", "mnemonic.no-imagery", where, "A keyword mnemonic must give a scene to picture.");
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;

  return {
    findings,
    errors,
    warnings,
    ok: errors === 0,
    checked: {
      courses: input.courses.length,
      modules: input.courses.reduce((n, c) => n + c.modules.length, 0),
      lessons: lessons.length,
      exercises: lessons.reduce((n, l) => n + (l.exercises?.length ?? 0), 0),
      questions: lessons.reduce(
        (n, l) => n + (l.exercises ?? []).reduce((m, e) => m + e.questions.length, 0),
        0,
      ),
      words: input.vocabulary.length,
      grammarTopics: input.grammar.length,
      placementItems: input.placement.length,
      mnemonics: (input.grammarMnemonics?.length ?? 0) + (input.wordMnemonics?.length ?? 0),
    },
  };
}

// ─── Individual checks ───────────────────────────────────────────────────────

type Add = (severity: Severity, code: string, where: string, message: string) => void;

function checkUnique(values: string[], label: string, add: Add): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      add("error", "slug.duplicate", `${label}:${value}`, `Duplicate ${label} identifier "${value}".`);
    }
    seen.add(value);
  }
}

export function verifyQuestion(question: QuestionEntry, where: string, add: Add): void {
  if (!question.prompt.trim()) {
    add("error", "question.no-prompt", where, "Question has no prompt.");
  }
  if (!question.correctAnswer.trim()) {
    add("error", "question.no-answer", where, `"${question.prompt}" has no correct answer.`);
  }
  if (!question.explanation.trim()) {
    add(
      "error",
      "question.unexplained",
      where,
      `"${question.prompt}" has no explanation — learners must be told why, not just whether.`,
    );
  }

  if (question.kind === "multiple_choice" || question.kind === "true_false") {
    const options = question.options ?? [];
    if (options.length < 2) {
      add("error", "question.options", where, `"${question.prompt}" needs at least two options.`);
    } else {
      const texts = options.map((o) => o.text);
      if (!texts.includes(question.correctAnswer)) {
        add(
          "error",
          "question.answer-missing",
          where,
          `Correct answer "${question.correctAnswer}" is not among the options of "${question.prompt}".`,
        );
      }
      if (new Set(texts).size !== texts.length) {
        add("error", "question.duplicate-options", where, `"${question.prompt}" has duplicate options.`);
      }
      // Distractors should teach: an unexplained wrong option is a missed
      // opportunity, though not an outright error.
      const unexplained = options.filter((o) => o.text !== question.correctAnswer && !o.feedback);
      if (unexplained.length === options.length - 1 && options.length > 2) {
        add(
          "warning",
          "question.no-distractor-feedback",
          where,
          `No distractor in "${question.prompt}" explains why it is wrong.`,
        );
      }
    }
  }

  if (question.kind === "fill_blank" && !question.prompt.includes("_")) {
    add("error", "question.no-blank", where, `Fill-in-the-blank "${question.prompt}" contains no blank.`);
  }

  // The answer to a translation question should be Spanish, so it should not
  // be identical to an English prompt.
  if (question.kind === "translate" && question.correctAnswer.trim() === question.prompt.trim()) {
    add("error", "question.untranslated", where, `Translation answer is identical to the prompt.`);
  }

  verifySpanishText(question.correctAnswer, where, add);
}

function verifyLessonSpanish(lesson: LessonEntry, add: Add): void {
  const where = `lesson:${lesson.slug}`;
  for (const example of lesson.examples ?? []) {
    verifySpanishText(example.spanish, where, add);
    if (!example.english.trim()) {
      add("error", "example.untranslated", where, `Example "${example.spanish}" has no translation.`);
    }
  }
}

/**
 * Mechanically checkable Spanish orthography.
 *
 * Deliberately narrow: it only flags things that are unambiguously wrong, so
 * that a clean report means something. Anything requiring judgement is left to
 * human review rather than guessed at here.
 */
export function verifySpanishText(text: string, where: string, add: Add): void {
  if (!text.trim()) return;

  // A closing ? must have an opening ¿ somewhere before it.
  const questionMarks = (text.match(/\?/g) ?? []).length;
  const openQuestions = (text.match(/¿/g) ?? []).length;
  if (questionMarks > openQuestions) {
    add(
      "error",
      "spanish.unopened-question",
      where,
      `"${truncate(text)}" closes a question with ? but never opens it with ¿.`,
    );
  }

  const exclamations = (text.match(/!/g) ?? []).length;
  const openExclamations = (text.match(/¡/g) ?? []).length;
  if (exclamations > openExclamations) {
    add(
      "error",
      "spanish.unopened-exclamation",
      where,
      `"${truncate(text)}" closes with ! but never opens with ¡.`,
    );
  }

  // Question words carry an accent inside a real question.
  if (text.includes("¿")) {
    const unaccented = /¿\s*(que|donde|cuando|como|quien|cual|cuanto|cuantos)\b/i.exec(text);
    if (unaccented) {
      add(
        "error",
        "spanish.unaccented-interrogative",
        where,
        `"${truncate(text)}" uses "${unaccented[1]}" without its accent inside a question.`,
      );
    }
  }

  if (/\s{2,}/.test(text)) {
    add("warning", "spanish.double-space", where, `"${truncate(text)}" contains a double space.`);
  }
}

function exampleContainsWord(sentence: string, headword: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\p{L}\s]/gu, " ");

  const bare = normalize(headword).replace(/^(el|la|los|las)\s+/, "").trim();
  if (!bare) return true;
  const haystack = normalize(sentence);

  const tokens = bare.split(/\s+/).filter(Boolean);

  // Multi-word headwords: check the content words individually. A phrase is
  // almost never quoted verbatim — "echar de menos" surfaces as "echo de
  // menos" — so requiring the literal string produces nothing but noise.
  if (tokens.length > 1) {
    const content = tokens
      // Infinitives conjugate away entirely — "darse prisa" appears as "date
      // prisa", "no tener desperdicio" as "no tiene desperdicio" — so it is
      // the rest of the phrase that identifies it in a sentence.
      .filter((token) => !/(ar|er|ir)(se)?$/.test(token))
      .filter((token) => token.length >= 4);
    if (content.length === 0) return true;
    return content.every((token) => haystack.includes(stemOf(token)));
  }

  return haystack.includes(stemOf(bare));
}

/**
 * A crude inflectional stem — enough to survive Spanish agreement and apocope
 * without a morphological analyser. Trimming the final vowel is what lets
 * "mismo" match "misma", "bueno" match "buen" and "malo" match "mal"; three
 * characters is the floor, below which the match stops meaning anything.
 */
function stemOf(word: string): string {
  if (word.length > 5) return word.slice(0, word.length - 2);
  if (word.length >= 4 && /[aeo]$/.test(word)) return word.slice(0, word.length - 1);
  return word;
}

function stripArticle(word: string): string {
  return word.toLowerCase().trim().replace(/^(el|la|los|las|un|una)\s+/, "");
}

function truncate(text: string, length = 60): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
