import type { GrammarTopicEntry } from "../types.js";

/** B1 — the perfect, the conditional, and the first subjunctive. */
export const B1_TOPICS: GrammarTopicEntry[] = [
  {
    slug: "present-perfect",
    title: "The present perfect (pretérito perfecto)",
    levelCode: "B1",
    category: "verbs",
    explanation:
      "Built with **haber + past participle**, this tense links a past action to the present: today, this week, ever, already, not yet.\n\nIn Spain it is used heavily for anything within today. In much of Latin America the simple preterite is preferred in the same contexts — both are correct in their own region.",
    whenToUse: "For actions inside a time frame that has not closed, and for life experience.",
    formula: "he/has/ha/hemos/habéis/han + -ado/-ido",
    examples: [
      { spanish: "Hoy he trabajado mucho.", english: "I've worked a lot today.", note: "Today has not finished, so the perfect fits." },
      { spanish: "¿Has estado alguna vez en Perú?", english: "Have you ever been to Peru?", note: "Life experience." },
      { spanish: "Todavía no he terminado.", english: "I haven't finished yet." },
      { spanish: "He escrito tres cartas.", english: "I've written three letters.", note: "escrito, hecho, visto, dicho, puesto and vuelto are irregular participles." },
    ],
    mistakes: [
      { wrong: "He escribido", right: "He escrito", explanation: "escribir has an irregular participle." },
      { wrong: "Ayer he comido paella", right: "Ayer comí paella", explanation: "'Ayer' is a closed time frame, so the preterite is required." },
      { wrong: "He me duchado", right: "Me he duchado", explanation: "The reflexive pronoun goes before the whole compound verb." },
    ],
  },
  {
    slug: "conditional",
    title: "The conditional",
    levelCode: "B1",
    category: "verbs",
    explanation:
      "The conditional expresses what *would* happen, and it is also the standard way of being polite. It is formed from the full infinitive plus the imperfect -er endings, so there is almost nothing to memorise.",
    whenToUse: "Hypotheticals, polite requests, advice, and reported future ('he said he would come').",
    formula: "infinitive + ía, ías, ía, íamos, íais, ían",
    examples: [
      { spanish: "Me gustaría un café.", english: "I'd like a coffee.", note: "The polite way to order anything.", realWorld: true },
      { spanish: "Yo que tú, hablaría con él.", english: "If I were you, I'd talk to him.", note: "Advice." },
      { spanish: "¿Podrías ayudarme?", english: "Could you help me?" },
      { spanish: "Dijo que vendría.", english: "He said he would come." },
    ],
    mistakes: [
      { wrong: "Quiero un café (in a formal restaurant)", right: "Querría / Me gustaría un café", explanation: "'Quiero' is not wrong, but the conditional is markedly more polite." },
      { wrong: "Yo hablaría → yo habларía with the wrong stem", right: "hablaría", explanation: "The conditional keeps the whole infinitive: hablar + ía." },
    ],
  },
  {
    slug: "present-subjunctive",
    title: "The present subjunctive",
    levelCode: "B1",
    category: "verbs",
    explanation:
      "The subjunctive is not a tense but a mood: it marks that something is wanted, doubted, felt about or not yet real, rather than reported as fact. English has only traces of it ('I insist that he *be* here'), which is why it feels alien — but in Spanish it is unavoidable and everyday.\n\nForm it from the **yo** form of the present, drop the -o, and swap the vowel: -ar verbs take -e endings, -er/-ir verbs take -a endings.",
    whenToUse: "After expressions of wish, emotion, doubt, denial, recommendation, and after certain conjunctions.",
    formula: "yo form – o + opposite vowel (hable, coma, viva)",
    examples: [
      { spanish: "Quiero que vengas.", english: "I want you to come.", note: "Two different subjects plus a wish — the trigger for the subjunctive." },
      { spanish: "Espero que te guste.", english: "I hope you like it.", realWorld: true },
      { spanish: "No creo que sea verdad.", english: "I don't think it's true.", note: "Doubt. Note that 'creo que es verdad' takes the indicative — the negation is what triggers the mood." },
      { spanish: "Cuando llegues, llámame.", english: "When you arrive, call me.", note: "A future event that has not happened yet." },
      { spanish: "Es importante que estudies.", english: "It's important that you study." },
    ],
    mistakes: [
      { wrong: "Quiero que vienes", right: "Quiero que vengas", explanation: "'Querer que' with a different subject always takes the subjunctive." },
      { wrong: "Quiero que yo vaya", right: "Quiero ir", explanation: "With the same subject there is no 'que' — just the infinitive." },
      { wrong: "Cuando llego, te llamo (about the future)", right: "Cuando llegue, te llamo", explanation: "A future 'when' clause takes the subjunctive." },
    ],
  }
];
