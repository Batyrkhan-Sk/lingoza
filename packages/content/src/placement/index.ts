import type { CefrLevel } from "@lingoza/engine";
import type { PlacementQuestionEntry } from "../types.js";

/**
 * The placement test bank (§2).
 *
 * Items are spread across all six levels and all six sections so the engine
 * gets an even signal to score against. Each item is written to discriminate
 * at exactly one level: a B1 item should be answerable by a solid B1 and
 * genuinely hard for an A2, otherwise it tells the estimator nothing.
 *
 * Distractors are real learner errors, never nonsense — a distractor nobody
 * would pick is a wasted option and inflates everyone's score.
 */
export const PLACEMENT_QUESTIONS: PlacementQuestionEntry[] = [
  // ─── A1 ────────────────────────────────────────────────────────────────────
  {
    section: "vocabulary",
    levelCode: "A1",
    prompt: "What does 'la casa' mean?",
    correctAnswer: "house",
    explanation: "la casa = house.",
    options: ["house", "car", "book", "street"],
  },
  {
    section: "grammar",
    levelCode: "A1",
    prompt: "Yo ___ estudiante.",
    correctAnswer: "soy",
    explanation: "A profession or role is identity, so it takes ser: soy estudiante.",
    options: ["soy", "estoy", "tengo", "es"],
  },
  {
    section: "grammar",
    levelCode: "A1",
    prompt: "Tengo veinte ___.",
    correctAnswer: "años",
    explanation: "Age is expressed with tener + años.",
    options: ["años", "año", "viejo", "edad"],
  },
  {
    section: "sentence_construction",
    levelCode: "A1",
    prompt: "Translate: I live in Madrid.",
    correctAnswer: "Vivo en Madrid",
    acceptedAnswers: ["Yo vivo en Madrid"],
    explanation: "vivir → vivo in the first person; the pronoun is optional.",
  },
  {
    section: "listening",
    levelCode: "A1",
    prompt: "What is being asked?",
    audioText: "¿Cómo te llamas?",
    correctAnswer: "What is your name?",
    explanation: "'¿Cómo te llamas?' — literally 'what do you call yourself?'",
    options: ["What is your name?", "How are you?", "Where do you live?", "How old are you?"],
  },
  {
    section: "reading",
    levelCode: "A1",
    prompt: "Where does Ana work?",
    context: "Ana es profesora. Trabaja en una escuela pequeña en Sevilla.",
    correctAnswer: "In a small school in Seville",
    explanation: "'Trabaja en una escuela pequeña en Sevilla.'",
    options: ["In a small school in Seville", "In a hospital", "At home", "In a shop in Madrid"],
  },

  // ─── A2 ────────────────────────────────────────────────────────────────────
  {
    section: "grammar",
    levelCode: "A2",
    prompt: "Ayer ___ (comer, yo) en un restaurante.",
    correctAnswer: "comí",
    explanation: "'Ayer' marks a completed event → preterite.",
    options: ["comí", "como", "comía", "he comido"],
  },
  {
    section: "grammar",
    levelCode: "A2",
    prompt: "Este regalo es ___ ti.",
    correctAnswer: "para",
    explanation: "A recipient takes para — the gift is heading to you.",
    options: ["para", "por", "de", "a"],
  },
  {
    section: "vocabulary",
    levelCode: "A2",
    prompt: "What does 'el equipaje' mean?",
    correctAnswer: "luggage",
    explanation: "el equipaje = luggage.",
    options: ["luggage", "team", "equipment", "ticket"],
  },
  {
    section: "sentence_construction",
    levelCode: "A2",
    prompt: "Translate: I have to work tomorrow.",
    correctAnswer: "Tengo que trabajar mañana",
    explanation: "tener que + infinitive expresses obligation.",
  },
  {
    section: "listening",
    levelCode: "A2",
    prompt: "What time does the train leave?",
    audioText: "El tren sale a las ocho y media de la mañana.",
    correctAnswer: "8:30",
    explanation: "'A las ocho y media' — half past eight.",
    options: ["8:30", "8:00", "9:30", "10:30"],
  },
  {
    section: "reading",
    levelCode: "A2",
    prompt: "Why couldn't Marta go?",
    context: "Marta quería ir a la fiesta, pero no pudo porque estaba enferma y tenía fiebre.",
    correctAnswer: "She was ill",
    explanation: "'No pudo porque estaba enferma y tenía fiebre.'",
    options: ["She was ill", "She was working", "She had no money", "She forgot"],
  },

  // ─── B1 ────────────────────────────────────────────────────────────────────
  {
    section: "grammar",
    levelCode: "B1",
    prompt: "Espero que ___ (venir, tú) mañana.",
    correctAnswer: "vengas",
    explanation: "A wish with two different subjects takes the subjunctive.",
    options: ["vengas", "vienes", "vendrás", "venías"],
  },
  {
    section: "grammar",
    levelCode: "B1",
    prompt: "Cuando ___ tiempo, te llamo.",
    correctAnswer: "tenga",
    explanation: "A 'when' clause about the future takes the subjunctive.",
    options: ["tenga", "tengo", "tendré", "tenía"],
  },
  {
    section: "vocabulary",
    levelCode: "B1",
    prompt: "What does 'merecer la pena' mean?",
    correctAnswer: "to be worth it",
    explanation: "merecer la pena = to be worth the trouble.",
    options: ["to be worth it", "to deserve punishment", "to feel sorry", "to be painful"],
  },
  {
    section: "sentence_construction",
    levelCode: "B1",
    prompt: "Translate: I've never been to Peru.",
    correctAnswer: "Nunca he estado en Perú",
    acceptedAnswers: ["No he estado nunca en Perú"],
    explanation: "Life experience takes the present perfect.",
  },
  {
    section: "listening",
    levelCode: "B1",
    prompt: "What is the speaker doing?",
    audioText: "Llevo dos años estudiando español y todavía me cuesta entender a la gente cuando habla rápido.",
    correctAnswer: "Explaining a difficulty they still have",
    explanation: "'Todavía me cuesta entender' — they still find it hard.",
    options: [
      "Explaining a difficulty they still have",
      "Saying they have given up",
      "Describing a holiday",
      "Asking for directions",
    ],
  },
  {
    section: "reading",
    levelCode: "B1",
    prompt: "What is the writer's attitude?",
    context:
      "Aunque el nuevo sistema funciona mejor que el anterior, sigue siendo demasiado complicado para la mayoría de los usuarios.",
    correctAnswer: "It has improved but is still too complex",
    explanation: "'Aunque… funciona mejor… sigue siendo demasiado complicado.'",
    options: [
      "It has improved but is still too complex",
      "It is worse than before",
      "It is perfect now",
      "Users have not tried it",
    ],
  },

  // ─── B2 ────────────────────────────────────────────────────────────────────
  {
    section: "grammar",
    levelCode: "B2",
    prompt: "Si ___ más dinero, viajaría por todo el mundo.",
    correctAnswer: "tuviera",
    explanation: "An unreal present condition: si + imperfect subjunctive → conditional.",
    options: ["tuviera", "tendría", "tengo", "tuve"],
  },
  {
    section: "grammar",
    levelCode: "B2",
    prompt: "Se ___ pisos en el centro.",
    correctAnswer: "venden",
    explanation: "In the passive se, the verb agrees with the thing being sold.",
    options: ["venden", "vende", "vendo", "vendió"],
  },
  {
    section: "vocabulary",
    levelCode: "B2",
    prompt: "What does 'dar por sentado' mean?",
    correctAnswer: "to take for granted",
    explanation: "dar por sentado = to assume without questioning.",
    options: ["to take for granted", "to sit down", "to give up", "to settle a debt"],
  },
  {
    section: "sentence_construction",
    levelCode: "B2",
    prompt: "Translate: If I had known, I would have come.",
    correctAnswer: "Si lo hubiera sabido, habría venido",
    acceptedAnswers: ["Si lo hubiese sabido, habría venido", "Si lo hubiera sabido, hubiera venido"],
    explanation: "Unreal past: si + pluperfect subjunctive → conditional perfect.",
  },
  {
    section: "listening",
    levelCode: "B2",
    prompt: "What does the speaker imply?",
    audioText:
      "No es que la propuesta no tenga sentido, es que llega en el peor momento posible.",
    correctAnswer: "The idea is reasonable but badly timed",
    explanation: "'No es que… no tenga sentido' concedes the idea; the objection is the timing.",
    options: [
      "The idea is reasonable but badly timed",
      "The idea makes no sense at all",
      "The timing is perfect",
      "They did not understand the proposal",
    ],
  },

  // ─── C1 ────────────────────────────────────────────────────────────────────
  {
    section: "grammar",
    levelCode: "C1",
    prompt: "Busco un traductor que ___ ruso. (any translator who speaks it)",
    correctAnswer: "hable",
    explanation: "An unspecified person meeting a description takes the subjunctive.",
    options: ["hable", "habla", "hablará", "hablaba"],
  },
  {
    section: "vocabulary",
    levelCode: "C1",
    prompt: "What does 'soslayar' mean?",
    correctAnswer: "to sidestep or avoid",
    explanation: "soslayar = to dodge or gloss over an issue.",
    options: ["to sidestep or avoid", "to solve", "to underline", "to delay"],
  },
  {
    section: "reading",
    levelCode: "C1",
    prompt: "'El ministro habría dimitido' means:",
    context: "Headline in a Spanish newspaper.",
    correctAnswer: "The minister has reportedly resigned",
    explanation:
      "The journalistic conditional marks a claim the paper is not confirming — not a hypothetical.",
    options: [
      "The minister has reportedly resigned",
      "The minister would resign if asked",
      "The minister refused to resign",
      "The minister will resign tomorrow",
    ],
  },
  {
    section: "sentence_construction",
    levelCode: "C1",
    prompt: "Translate formally: It should be noted that the data are incomplete.",
    correctAnswer: "Cabe señalar que los datos son incompletos",
    acceptedAnswers: ["Hay que señalar que los datos son incompletos"],
    explanation: "'Cabe señalar' is the standard formal frame in academic Spanish.",
  },

  // ─── C2 ────────────────────────────────────────────────────────────────────
  {
    section: "vocabulary",
    levelCode: "C2",
    prompt: "What does 'a la sazón' mean?",
    correctAnswer: "at that time",
    explanation: "A literary connector meaning 'at that time'.",
    options: ["at that time", "seasoned", "in short", "by chance"],
  },
  {
    section: "reading",
    levelCode: "C2",
    prompt: "'Ni que fuera el rey.' The speaker is:",
    correctAnswer: "Being sarcastic about someone's self-importance",
    explanation: "'Ni que + imperfect subjunctive' is a fixed ironic frame.",
    options: [
      "Being sarcastic about someone's self-importance",
      "Stating a fact about royalty",
      "Making a polite request",
      "Expressing a genuine wish",
    ],
  },
  {
    section: "grammar",
    levelCode: "C2",
    prompt: "Digan lo que ___, no cambiaré de opinión.",
    correctAnswer: "digan",
    explanation:
      "The reduplicated subjunctive (digan lo que digan) means 'whatever they may say'.",
    options: ["digan", "dicen", "dirán", "dijeron"],
  },
];

export function placementByLevel(level: CefrLevel): PlacementQuestionEntry[] {
  return PLACEMENT_QUESTIONS.filter((question) => question.levelCode === level);
}

/**
 * Build a balanced test: an even spread of levels, and every section
 * represented. Ordered easiest-first so a beginner is not immediately
 * confronted with C2 material and discouraged into abandoning the test.
 */
export function buildPlacementTest(limit = 24): PlacementQuestionEntry[] {
  const levels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const perLevel = Math.max(1, Math.floor(limit / levels.length));

  return levels.flatMap((level) => placementByLevel(level).slice(0, perLevel));
}
