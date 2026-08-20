import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Tests run against the built output — the same artifact the API imports.
import {
  checkAnswer,
  initialReviewState,
  reviewWord,
  selectDue,
  scorePlacement,
  updateStreak,
  playerLevelFromXp,
  evaluateCondition,
  generateDailyPlan,
  completeSection,
  detectPattern,
  scoreQuiz,
  overallScore,
  emptySkillScores,
  updateSkillScore,
  shouldOfferMnemonic,
  rankMnemonics,
  assessKeywordMnemonic,
  alignPassage,
  analyseSong,
  arrangeOptions,
  detectElision,
  parseLrc,
  splitPassageLines,
  parseReminderHours,
  scheduleFor,
  dueReminder,
  composeNudge,
  shouldSend,
  localHour,
  type NudgeInput,
  type PlacementAnswer,
  type LearnerSnapshot,
  type Mnemonic,
} from "../dist/index.js";

describe("answer checking", () => {
  test("accepts an exact answer", () => {
    assert.equal(checkAnswer("el perro", "el perro").isCorrect, true);
  });

  test("accepts a missing accent but says so", () => {
    const result = checkAnswer("esta cansado", "está cansado");
    assert.equal(result.isCorrect, true);
    assert.match(result.note ?? "", /accent/i);
  });

  test("does not equate ñ with n — año and ano are different words", () => {
    assert.equal(checkAnswer("ano", "año").isCorrect, false);
  });

  test("forgives a missing article on a single word", () => {
    const result = checkAnswer("perro", "el perro");
    assert.equal(result.isCorrect, true);
    assert.match(result.note ?? "", /article/i);
  });

  test("rejects a genuinely different word", () => {
    assert.equal(checkAnswer("gato", "perro").isCorrect, false);
  });

  test("rejects an empty answer", () => {
    assert.equal(checkAnswer("", "perro").isCorrect, false);
  });

  test("is case and punctuation insensitive", () => {
    assert.equal(checkAnswer("¿Cómo estás?", "cómo estás").isCorrect, true);
  });
});

describe("spaced repetition", () => {
  const now = new Date("2026-01-01T10:00:00Z");

  test("a new word is due immediately", () => {
    const state = initialReviewState(2, now);
    assert.equal(state.status, "new");
    assert.equal(state.dueAt.getTime(), now.getTime());
  });

  test("correct answers lengthen the interval", () => {
    let state = initialReviewState(2, now);
    const first = reviewWord(state, "good", { now, fuzz: false });
    const second = reviewWord(first, "good", { now, fuzz: false });
    const third = reviewWord(second, "good", { now, fuzz: false });
    assert.ok(second.intervalDays > first.intervalDays);
    assert.ok(third.intervalDays > second.intervalDays);
  });

  test("a lapse shortens but does not reset a mature interval", () => {
    let state = initialReviewState(2, now);
    for (let i = 0; i < 6; i++) state = reviewWord(state, "good", { now, fuzz: false });
    const mature = state.intervalDays;
    const lapsed = reviewWord(state, "again", { now, fuzz: false });

    assert.ok(mature > 10, "precondition: the word should be mature");
    assert.ok(lapsed.intervalDays < mature, "a lapse must shorten the interval");
    assert.ok(lapsed.intervalDays >= 1, "a lapse must not reset to zero");
    assert.equal(lapsed.lapses, 1);
  });

  test("strength falls sharply on failure", () => {
    let state = initialReviewState(2, now);
    state = reviewWord(state, "good", { now, fuzz: false });
    state = reviewWord(state, "good", { now, fuzz: false });
    const before = state.strength;
    const after = reviewWord(state, "again", { now, fuzz: false });
    assert.ok(after.strength < before);
  });

  test("ease factor stays within SM-2 bounds under repeated failure", () => {
    let state = initialReviewState(5, now);
    for (let i = 0; i < 20; i++) state = reviewWord(state, "again", { now, fuzz: false });
    assert.ok(state.easeFactor >= 1.3, `ease fell to ${state.easeFactor}`);
  });

  test("selectDue puts overdue reviews before new words", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const items = [
      { id: "new", due: new Date("2026-01-09"), status: "new" as const },
      { id: "review", due: new Date("2026-01-01"), status: "review" as const },
      { id: "learning", due: new Date("2026-01-08"), status: "learning" as const },
      { id: "future", due: new Date("2026-02-01"), status: "review" as const },
    ];
    const due = selectDue({
      items,
      dueAt: (i) => i.due,
      status: (i) => i.status,
      now,
      limit: 10,
    });
    assert.deepEqual(due.map((i) => i.id), ["review", "learning", "new"]);
  });

  test("selectDue caps how many new words enter one sitting", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `w${i}`,
      due: new Date("2026-01-01"),
      status: "new" as const,
    }));
    const due = selectDue({
      items,
      dueAt: (i) => i.due,
      status: (i) => i.status,
      now,
      limit: 40,
      newLimit: 10,
    });
    assert.equal(due.length, 10);
  });
});

describe("placement", () => {
  const answers = (spec: [string, boolean][]): PlacementAnswer[] =>
    spec.map(([level, isCorrect], i) => ({
      questionId: `q${i}`,
      section: "grammar",
      levelCode: level as PlacementAnswer["levelCode"],
      isCorrect,
    }));

  test("a learner who fails A1 is placed at A1", () => {
    const outcome = scorePlacement(
      answers([["A1", false], ["A1", false], ["A1", true], ["A2", false], ["A2", false]]),
    );
    assert.equal(outcome.estimatedLevel, "A1");
  });

  test("solid A1 and A2 but failing B1 places at A2", () => {
    const outcome = scorePlacement(
      answers([
        ["A1", true], ["A1", true], ["A1", true], ["A1", true],
        ["A2", true], ["A2", true], ["A2", true], ["A2", true],
        ["B1", false], ["B1", false], ["B1", false], ["B1", true],
      ]),
    );
    assert.equal(outcome.estimatedLevel, "A2");
  });

  test("a lucky guess far above level cannot pull the estimate up", () => {
    const outcome = scorePlacement(
      answers([
        ["A1", true], ["A1", true], ["A1", true], ["A1", true],
        ["A2", false], ["A2", false], ["A2", false], ["A2", false],
        ["C2", true], ["C2", true],
      ]),
    );
    assert.equal(outcome.estimatedLevel, "A1", "the walk must stop at the first gap");
  });

  test("perfect at a level with partial control above promotes one level", () => {
    const outcome = scorePlacement(
      answers([
        ["A1", true], ["A1", true], ["A1", true], ["A1", true],
        ["A2", true], ["A2", true], ["A2", true], ["A2", true],
        ["B1", true], ["B1", false], ["B1", true], ["B1", false],
      ]),
    );
    assert.equal(outcome.estimatedLevel, "B1");
  });

  test("weak sections are identified for the first study plan", () => {
    const outcome = scorePlacement([
      { questionId: "1", section: "grammar", levelCode: "A1", isCorrect: true },
      { questionId: "2", section: "grammar", levelCode: "A1", isCorrect: true },
      { questionId: "3", section: "listening", levelCode: "A1", isCorrect: false },
      { questionId: "4", section: "listening", levelCode: "A1", isCorrect: false },
    ]);
    assert.ok(outcome.weakSections.includes("listening"));
  });

  test("an empty test does not crash and places at A1", () => {
    const outcome = scorePlacement([]);
    assert.equal(outcome.estimatedLevel, "A1");
    assert.equal(outcome.questionCount, 0);
  });
});

describe("streaks", () => {
  test("consecutive days extend the streak", () => {
    const result = updateStreak(
      { currentStreak: 4, longestStreak: 9, lastStudyDate: "2026-03-01" },
      "2026-03-02",
    );
    assert.equal(result.currentStreak, 5);
    assert.equal(result.extended, true);
  });

  test("studying twice in one day does not double-count", () => {
    const result = updateStreak(
      { currentStreak: 4, longestStreak: 9, lastStudyDate: "2026-03-02" },
      "2026-03-02",
    );
    assert.equal(result.currentStreak, 4);
    assert.equal(result.extended, false);
  });

  test("a missed day breaks the streak but keeps the record", () => {
    const result = updateStreak(
      { currentStreak: 12, longestStreak: 12, lastStudyDate: "2026-03-01" },
      "2026-03-05",
    );
    assert.equal(result.currentStreak, 1);
    assert.equal(result.longestStreak, 12);
    assert.equal(result.broken, true);
  });

  test("streaks cross month boundaries correctly", () => {
    const result = updateStreak(
      { currentStreak: 3, longestStreak: 3, lastStudyDate: "2026-01-31" },
      "2026-02-01",
    );
    assert.equal(result.currentStreak, 4);
  });
});

describe("gamification", () => {
  test("player level rises with xp and never goes below 1", () => {
    assert.equal(playerLevelFromXp(0), 1);
    assert.ok(playerLevelFromXp(5000) > playerLevelFromXp(500));
  });

  test("achievement conditions evaluate against facts", () => {
    assert.equal(evaluateCondition("current_streak>=7", { current_streak: 7 }), true);
    assert.equal(evaluateCondition("current_streak>=7", { current_streak: 6 }), false);
    assert.equal(evaluateCondition("words_learned>=100", {}), false);
    assert.equal(evaluateCondition("nonsense", { a: 1 }), false);
  });
});

describe("daily planning", () => {
  const snapshot: LearnerSnapshot = {
    userId: "u1",
    level: "A2",
    skills: { listening: 40, speaking: 35, reading: 70, writing: 60, grammar: 55, vocabulary: 65 },
    xp: 800,
    currentStreak: 5,
    wordsDue: 24,
    wordsLearning: 40,
    lessonsCompleted: 12,
    dailyTimeBudget: 20,
    mistakePatterns: [],
  };

  test("a plan fits roughly inside its time budget", () => {
    for (const budget of [10, 20, 30, 45, 60]) {
      const plan = generateDailyPlan({ snapshot, targetMinutes: budget });
      assert.ok(
        plan.totalMinutes <= budget * 1.35,
        `${budget}-minute plan came to ${plan.totalMinutes} minutes`,
      );
      assert.ok(plan.items.length > 0);
    }
  });

  test("reviews are scheduled first because they are time-critical", () => {
    const plan = generateDailyPlan({ snapshot, targetMinutes: 20 });
    assert.equal(plan.items[0]?.kind, "review");
  });

  test("a learner with no words due gets no review item", () => {
    const plan = generateDailyPlan({
      snapshot: { ...snapshot, wordsDue: 0 },
      targetMinutes: 20,
      wordsDue: 0,
    });
    assert.equal(plan.items.some((i) => i.kind === "review"), false);
  });

  test("the weakest skill is prioritised when time is short", () => {
    const plan = generateDailyPlan({
      snapshot: { ...snapshot, skills: { ...snapshot.skills, speaking: 10, listening: 90 } },
      targetMinutes: 10,
    });
    const skillItems = plan.items.filter((i) =>
      ["listening", "speaking", "conversation"].includes(i.kind),
    );
    if (skillItems.length > 0) {
      assert.equal(skillItems[0]?.kind, "speaking");
    }
  });
});

describe("lesson sections", () => {
  const allPresent = [
    "explanation", "examples", "vocabulary", "grammar", "listening",
    "practice", "speaking", "test", "review",
  ].map((section) => ({ section: section as never, present: true }));

  test("sections advance in order", () => {
    const state = completeSection(
      { currentSection: "explanation", completedSections: [], status: "in_progress" },
      "explanation",
      allPresent,
    );
    assert.equal(state.currentSection, "examples");
    assert.deepEqual(state.completedSections, ["explanation"]);
  });

  test("absent sections are skipped rather than shown empty", () => {
    const available = allPresent.map((a) =>
      a.section === "listening" ? { ...a, present: false } : a,
    );
    const state = completeSection(
      { currentSection: "grammar", completedSections: [], status: "in_progress" },
      "grammar",
      available,
    );
    assert.equal(state.currentSection, "practice");
  });

  test("finishing the last section completes the lesson", () => {
    const state = completeSection(
      { currentSection: "review", completedSections: [], status: "in_progress" },
      "review",
      allPresent,
    );
    assert.equal(state.status, "completed");
  });
});

describe("mistake detection", () => {
  test("recognises ser/estar confusion", () => {
    const pattern = detectPattern({
      original: "Soy cansado",
      corrected: "Estoy cansado",
      explanation: "",
      category: "grammar",
      severity: "important",
    });
    assert.equal(pattern?.patternKey, "ser_vs_estar");
  });

  test("recognises por/para confusion", () => {
    const pattern = detectPattern({
      original: "Este regalo es por ti",
      corrected: "Este regalo es para ti",
      explanation: "",
      category: "grammar",
      severity: "important",
    });
    assert.equal(pattern?.patternKey, "por_vs_para");
  });

  test("unmatched corrections still roll up by category", () => {
    const pattern = detectPattern({
      original: "xyz",
      corrected: "abc",
      explanation: "",
      category: "vocabulary",
      severity: "minor",
    });
    assert.equal(pattern?.patternKey, "general_vocabulary");
  });
});

describe("scoring", () => {
  test("a perfect quiz passes and awards a bonus", () => {
    const result = scoreQuiz({ results: [true, true, true, true], level: "A1" });
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
    assert.ok(result.xp > 32);
  });

  test("below 70% does not pass", () => {
    const result = scoreQuiz({ results: [true, true, false, false], level: "A1" });
    assert.equal(result.passed, false);
  });

  test("advanced levels award more xp for the same accuracy", () => {
    const a1 = scoreQuiz({ results: [true, true], level: "A1" });
    const c1 = scoreQuiz({ results: [true, true], level: "C1" });
    assert.ok(c1.xp > a1.xp);
  });

  test("an empty quiz does not divide by zero", () => {
    const result = scoreQuiz({ results: [] });
    assert.equal(result.score, 0);
    assert.equal(Number.isNaN(result.score), false);
  });

  test("skill scores move toward new results without jumping to them", () => {
    const first = updateSkillScore(0, 80);
    const second = updateSkillScore(first, 40);
    assert.ok(second < first, "a bad result must pull the score down");
    assert.ok(second > 40, "one result must not overwrite the history");
  });

  test("overall score ignores skills with no data", () => {
    const scores = { ...emptySkillScores(), reading: 80 };
    assert.equal(Math.round(overallScore(scores)), 80);
  });
});

describe("memory hooks", () => {
  test("no hook before a recall attempt — the attempt is the point", () => {
    const decision = shouldOfferMnemonic({ strength: 0.1, attempted: false, lapses: 0 });
    assert.equal(decision.show, false);
    assert.equal(decision.offer, false);
  });

  test("hook is shown while the word is still being learned", () => {
    assert.equal(shouldOfferMnemonic({ strength: 0.2, attempted: true, lapses: 0 }).show, true);
  });

  test("hook fades once the word is genuinely known", () => {
    const decision = shouldOfferMnemonic({ strength: 0.9, attempted: true, lapses: 0 });
    assert.equal(decision.show, false, "a known word should not route through a hook");
    assert.equal(decision.offer, true, "but it stays available on request");
  });

  test("repeated failures re-earn the hook even at high strength", () => {
    const decision = shouldOfferMnemonic({ strength: 0.95, attempted: true, lapses: 3 });
    assert.equal(decision.show, true);
  });

  test("an explicit request always wins", () => {
    const decision = shouldOfferMnemonic({ strength: 1, attempted: false, lapses: 0, requested: true });
    assert.equal(decision.show, true);
  });

  test("the learner's own hook outranks curated and community ones", () => {
    const base = { scope: "word", hook: "h", origin: "curated", helpfulCount: 0, unhelpfulCount: 0 } as const;
    const mnemonics: Mnemonic[] = [
      { ...base, id: "curated", kind: "keyword", userId: null, helpfulCount: 50 },
      { ...base, id: "mine", kind: "keyword", userId: "u1", origin: "ai" },
    ];
    assert.equal(rankMnemonics(mnemonics, "u1")[0]?.id, "mine");
  });

  test("a hook nobody finds helpful sinks", () => {
    const base = { scope: "word", hook: "h", origin: "curated", kind: "keyword", userId: null } as const;
    const mnemonics: Mnemonic[] = [
      { ...base, id: "bad", helpfulCount: 0, unhelpfulCount: 9 },
      { ...base, id: "ok", helpfulCount: 3, unhelpfulCount: 0 },
    ];
    assert.equal(rankMnemonics(mnemonics, "u1")[0]?.id, "ok");
  });

  test("rejects a keyword that does not sound like the word", () => {
    const quality = assessKeywordMnemonic({
      spanish: "caballo",
      english: "horse",
      keyword: "elephant",
      imagery: "An elephant standing next to a horse in a field",
    });
    assert.equal(quality.ok, false, "a keyword sharing no sounds cues nothing");
  });

  test("accepts a genuine sound-alike with concrete imagery", () => {
    const quality = assessKeywordMnemonic({
      spanish: "caballo",
      english: "horse",
      keyword: "cab",
      imagery: "A horse driving a yellow cab through the city",
    });
    assert.equal(quality.ok, true, quality.problems.join(" "));
  });

  test("rejects imagery that omits the meaning", () => {
    const quality = assessKeywordMnemonic({
      spanish: "mesa",
      english: "table",
      keyword: "mess",
      imagery: "A terrible mess everywhere you look",
    });
    assert.equal(quality.ok, false, "imagery must contain the meaning or it links to nothing");
  });
});


describe("reminder scheduling", () => {
  test("falls back to three sensible slots when the setting is junk", () => {
    assert.deepEqual(parseReminderHours("banana"), [9, 13, 20]);
    assert.deepEqual(parseReminderHours(""), [9, 13, 20]);
    assert.deepEqual(parseReminderHours("25,-3"), [9, 13, 20]);
  });

  test("sorts, de-duplicates and caps the hours", () => {
    assert.deepEqual(parseReminderHours("20, 9, 13, 9"), [9, 13, 20]);
    assert.equal(parseReminderHours("1,2,3,4,5,6,7,8").length, 6);
  });

  test("assigns first/last their role regardless of the clock", () => {
    // A night learner's day opens at 22:00 and closes at 07:00.
    assert.deepEqual(scheduleFor("22,1,7").slots, ["kickoff", "micro", "closeout"]);
    assert.deepEqual(scheduleFor("9").slots, ["kickoff"]);
    assert.deepEqual(scheduleFor("21").slots, ["closeout"]);
  });

  test("reads the hour in the learner's timezone, not the server's", () => {
    const noonUtc = new Date("2026-08-19T12:00:00Z");
    assert.equal(localHour(noonUtc, "UTC"), 12);
    assert.equal(localHour(noonUtc, "America/New_York"), 8);
    assert.equal(localHour(noonUtc, "Asia/Tokyo"), 21);
    assert.equal(localHour(new Date("2026-08-19T00:30:00Z"), "UTC"), 0);
  });

  test("fires inside the grace window and not before the hour", () => {
    const hours = "9,13,20";
    const at = (iso: string) => dueReminder({ now: new Date(iso), timezone: "UTC", reminderHours: hours });

    assert.equal(at("2026-08-19T09:00:00Z")?.slot, "kickoff");
    assert.equal(at("2026-08-19T09:25:00Z")?.slot, "kickoff");
    assert.equal(at("2026-08-19T09:45:00Z"), null, "past the grace window");
    assert.equal(at("2026-08-19T08:59:00Z"), null, "an hour must not fire early");
    assert.equal(at("2026-08-19T13:05:00Z")?.slot, "micro");
    assert.equal(at("2026-08-19T20:05:00Z")?.slot, "closeout");
  });

  test("a missed slot is not delivered late alongside the current one", () => {
    // Server was down all morning and comes back at 20:10: the learner gets
    // the evening nudge only, not a pile of stale ones.
    const due = dueReminder({
      now: new Date("2026-08-19T20:10:00Z"),
      timezone: "UTC",
      reminderHours: "9,13,20",
    });
    assert.equal(due?.hour, 20);
  });

  test("the dedupe key is stable per learner, per day, per slot", () => {
    const due = dueReminder({
      now: new Date("2026-08-19T13:02:00Z"),
      timezone: "UTC",
      reminderHours: "9,13,20",
    })!;
    assert.equal(due.dedupeKey("u1", "2026-08-19"), "reminder:u1:2026-08-19:13");
    assert.notEqual(due.dedupeKey("u1", "2026-08-19"), due.dedupeKey("u1", "2026-08-20"));
  });
});

describe("reminder wording", () => {
  const base: NudgeInput = {
    slot: "kickoff",
    displayName: "Ana Ruiz",
    level: "B1",
    streak: 4,
    studiedToday: false,
    wordsDue: 12,
    itemsRemaining: 5,
    totalItems: 5,
    targetMinutes: 20,
  };

  test("the morning nudge leads with the plan and offers to start it", () => {
    const nudge = composeNudge(base);
    assert.equal(nudge.action, "daily");
    assert.match(nudge.body, /Ana/);
    assert.match(nudge.body, /20 minutes/);
    assert.match(nudge.body, /12 words due/);
  });

  test("the midday nudge is the exercise, not an advert for it", () => {
    const nudge = composeNudge({
      ...base,
      slot: "micro",
      drillWord: { spanish: "el fregadero", pronunciation: "el fre-ga-DE-ro" },
    });
    assert.equal(nudge.action, "drill");
    assert.match(nudge.body, /fregadero/);
    assert.equal(nudge.preformatted, true, "its markdown must survive to Telegram");
  });

  test("the phrase of the day keeps its formatting too", () => {
    const nudge = composeNudge({
      ...base,
      slot: "micro",
      phraseOfDay: { spanish: "¿Qué tal?", english: "How's it going?" },
    });
    assert.equal(nudge.preformatted, true);
    assert.match(nudge.body, /¿Qué tal\?/);
  });

  test("nudges carrying learner text are left for the caller to escape", () => {
    const nudge = composeNudge({ ...base, continueLesson: "Ser_vs_estar" });
    assert.notEqual(nudge.preformatted, true);
  });

  test("an empty evening warns about the streak specifically", () => {
    const nudge = composeNudge({ ...base, slot: "closeout" });
    assert.equal(nudge.kind, "streak");
    assert.match(nudge.body, /4-day streak/);
  });

  test("a finished day is congratulated, never nagged", () => {
    const nudge = composeNudge({
      ...base,
      slot: "closeout",
      studiedToday: true,
      itemsRemaining: 0,
    });
    assert.equal(nudge.kind, "report");
    assert.equal(nudge.action, "progress");
    assert.doesNotMatch(nudge.body, /still time|don't forget/i);
  });

  test("nothing is sent in the evening when there is nothing to say", () => {
    const done = { ...base, slot: "closeout" as const, studiedToday: true, itemsRemaining: 0 };
    assert.equal(shouldSend({ ...done, streak: 0 }), false);
    assert.equal(shouldSend(done), true, "a live streak is worth a word");
    assert.equal(shouldSend({ ...done, studiedToday: false }), true);
    assert.equal(shouldSend({ ...base, slot: "micro" }), true, "the drill always has value");
  });
});


describe("song analysis", () => {
  // Invented lines throughout: the analyser only ever sees lines at runtime and
  // never stores them, so the tests keep real lyrics out of the repository too.
  const lines = [
    "Yo canto una cancion muy bonita",
    "Yo canto una cancion muy bonita",
    "Ella baila toda la noche conmigo",
  ];

  test("coverage counts running words, not distinct ones", () => {
    // "yo/canto/una/cancion/muy/bonita" appear twice each; a learner knowing
    // them should score far above the distinct-word share.
    const analysis = analyseSong({
      lines,
      knownWords: new Set(["yo", "canto", "una", "cancion", "muy", "bonita"]),
    });
    assert.ok(analysis.coverage > 0.7, `expected >0.7, got ${analysis.coverage}`);
    assert.equal(analysis.totalWords, 18);
  });

  test("a repeated line is reported as repetition", () => {
    const analysis = analyseSong({ lines, knownWords: new Set() });
    assert.ok(Math.abs(analysis.repetition - 1 / 3) < 0.01);
  });

  test("unknown words come back most frequent first", () => {
    // A clear winner rather than a tie: ties break alphabetically, which is an
    // incidental detail and not the ordering this test is about.
    const analysis = analyseSong({
      lines: ["canto canto canto", "bailo bailo", "salto"],
      knownWords: new Set(),
    });
    assert.deepEqual(
      analysis.newWords.map((w) => w.word),
      ["canto", "bailo", "salto"],
    );
    assert.equal(analysis.newWords[0]!.occurrences, 3);
  });

  test("pace is measured across the sung span, not the track length", () => {
    // Two lines a second apart in a track padded to five minutes: the outro is
    // silence and must not drag the pace down.
    const analysis = analyseSong({
      lines: ["uno dos tres", "cuatro cinco seis"],
      timings: [10, 11],
      durationSeconds: 300,
      knownWords: new Set(),
    });
    assert.ok(analysis.pace! > 2, `expected >2 w/s, got ${analysis.pace}`);
  });

  test("pace is null without synced timings", () => {
    assert.equal(analyseSong({ lines, knownWords: new Set() }).pace, null);
  });
});

describe("elision detection", () => {
  test("known contractions expand to their real form, not their stem", () => {
    // The dropped-s rule would give "pas" here, which is why the table wins.
    assert.equal(detectElision("pa'"), "para");
    assert.equal(detectElision("to'"), "todo");
    assert.equal(detectElision("na'"), "nada");
  });

  test("a trailing apostrophe otherwise restores a dropped final -s", () => {
    assert.equal(detectElision("vamo'"), "vamos");
    assert.equal(detectElision("tenemo'"), "tenemos");
  });

  test("a leading apostrophe restores the eaten es- syllable", () => {
    assert.equal(detectElision("'toy"), "estoy");
  });

  test("typographic apostrophes are recognised, not just ASCII ones", () => {
    // Sourced lyrics use U+2019 far more often than U+0027, and the difference
    // is invisible on screen but total to a regex.
    assert.equal(detectElision("vamo\u2019"), "vamos");
  });

  test("-ao and -ido contractions are recovered", () => {
    assert.equal(detectElision("cansao"), "cansado");
    assert.equal(detectElision("enamorao"), "enamorado");
  });

  test("ordinary words that merely look elided are never flagged", () => {
    // The damaging failure: a flagged word is pulled out of both the coverage
    // count and the study list, so a false positive silently stops a real word
    // from ever being taught.
    for (const word of ["frío", "mío", "río", "tío", "confío", "envío", "bacalao", "cacao"]) {
      assert.equal(detectElision(word), null, `${word} should not be treated as elided`);
    }
  });

  test("an elided form the learner knows still counts as covered", () => {
    const analysis = analyseSong({
      lines: ["vamo' a cantar"],
      knownWords: new Set(["vamos", "cantar"]),
    });
    assert.ok(analysis.coverage > 0.6, `expected >0.6, got ${analysis.coverage}`);
  });
});

describe("LRC parsing", () => {
  test("a line repeated by several tags becomes several entries", () => {
    // Choruses are stored once with one tag per repetition; counting the line
    // only once would undercount the most-repeated words in the song.
    const { lines, timings } = parseLrc("[00:10.00][01:20.50]el coro\n[00:15.00]un verso");
    assert.deepEqual(lines, ["el coro", "un verso", "el coro"]);
    assert.deepEqual(timings, [10, 15, 80.5]);
  });

  test("metadata-only lines are skipped", () => {
    assert.deepEqual(parseLrc("[ar:Alguien]\n[00:05.00]la letra").lines, ["la letra"]);
  });
});


describe("song exercise options", () => {
  const options = ["cantar", "bailar", "saltar"];

  test("the answer moves off the position the model gave it", () => {
    // Models put the correct option first far more often than chance; a
    // learner spots that within three questions and stops reading them.
    const first = arrangeOptions(options, "cantar", 0)!;
    const second = arrangeOptions(options, "cantar", 1)!;
    assert.notEqual(first.correctIndex, second.correctIndex);
  });

  test("the marked index always points at the answer", () => {
    for (let rotation = 0; rotation < 7; rotation += 1) {
      const arranged = arrangeOptions(options, "bailar", rotation)!;
      assert.equal(arranged.options[arranged.correctIndex], "bailar");
      assert.equal(arranged.options.length, 3);
    }
  });

  test("a question whose answer is not among its options is dropped", () => {
    // Silently keeping it would mark every learner wrong on that question.
    assert.equal(arrangeOptions(options, "correr", 0), null);
  });

  test("the answer is matched case-insensitively and untrimmed", () => {
    assert.ok(arrangeOptions(options, " Cantar ", 0));
  });
});


describe("passage splitting", () => {
  test("section markers and blank lines are dropped, content is kept", () => {
    const lines = splitPassageLines(
      "[Verso 1]\n\nYo canto\n\n[Estribillo: alguien]\nElla baila\n(Instrumental)\n",
    );
    assert.deepEqual(lines, ["Yo canto", "Ella baila"]);
  });

  test("a bracketed aside inside a line survives — only whole-line brackets go", () => {
    const lines = splitPassageLines("Yo canto (y tú bailas)\nElla [se] va");
    assert.equal(lines.length, 2);
  });

  test("LRC timestamps are stripped from pasted synced lyrics", () => {
    assert.deepEqual(splitPassageLines("[00:12.34]Yo canto"), ["Yo canto"]);
  });

  test("the line cap bounds what one paste can cost", () => {
    const long = Array.from({ length: 500 }, (_, i) => `Línea ${i}`).join("\n");
    assert.equal(splitPassageLines(long, 200).length, 200);
  });
});

describe("passage alignment", () => {
  const lines = ["uno", "dos", "tres"];

  test("explanations land on the line they are numbered for", () => {
    const aligned = alignPassage(lines, [
      { index: 2, translation: "three" },
      { index: 0, translation: "one" },
    ]);
    assert.equal(aligned[0]!.translation, "one");
    assert.equal(aligned[2]!.translation, "three");
  });

  test("a line the model skipped is shown untranslated, not shifted", () => {
    // The failure this prevents: every line confidently explained as its
    // neighbour, which reads as correct and teaches the wrong thing.
    const aligned = alignPassage(lines, [
      { index: 0, translation: "one" },
      { index: 2, translation: "three" },
    ]);
    assert.equal(aligned[1]!.translation, "");
    assert.equal(aligned[1]!.original, "dos");
  });

  test("unnumbered entries fill the gaps in order", () => {
    const aligned = alignPassage(lines, [{ translation: "one" }, { translation: "two" }]);
    assert.equal(aligned[0]!.translation, "one");
    assert.equal(aligned[1]!.translation, "two");
  });

  test("an out-of-range index does not throw away the explanation", () => {
    const aligned = alignPassage(lines, [{ index: 99, translation: "one" }]);
    assert.equal(aligned[0]!.translation, "one");
  });

  test("every line comes back, in order, whatever the model returned", () => {
    const aligned = alignPassage(lines, []);
    assert.deepEqual(aligned.map((line) => line.original), lines);
  });

  test("grammar and dialect stay separate, and half-written points are dropped", () => {
    // A point with no explanation renders as a bare label with nothing taught,
    // which reads as a bug rather than as brevity.
    const aligned = alignPassage(lines, [
      {
        index: 0,
        translation: "one",
        grammar: [
          { point: "Subjunctive after ojalá", explanation: "Ojalá always takes it." },
          { point: "Missing its explanation" },
        ],
        dialect: "Final -s dropped: quiere' = quieres",
      },
    ]);

    assert.equal(aligned[0]!.grammar.length, 1);
    assert.equal(aligned[0]!.grammar[0]!.point, "Subjunctive after ojalá");
    assert.match(aligned[0]!.dialect!, /quieres/);
    assert.deepEqual(aligned[1]!.grammar, [], "a line with no entry has no grammar, not undefined");
  });
});
