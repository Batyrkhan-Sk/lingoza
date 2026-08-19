import type { GrammarTopicEntry } from "../types.js";

/** B2 — the past subjunctive, conditionals, and the passive. */
export const B2_TOPICS: GrammarTopicEntry[] = [
  {
    slug: "imperfect-subjunctive",
    title: "The imperfect subjunctive",
    levelCode: "B2",
    category: "verbs",
    explanation:
      "Formed from the third-person plural preterite: drop **-ron** and add **-ra** endings (both -ra and -se forms exist and are interchangeable; -ra is far more common in speech).\n\nIt handles past-tense subjunctive contexts and, crucially, unreal conditions.",
    whenToUse: "After a past-tense trigger, in 'si' clauses about unreal situations, and for extra-polite requests.",
    formula: "3rd person plural preterite – ron + ra, ras, ra, ramos, rais, ran",
    examples: [
      { spanish: "Quería que vinieras.", english: "I wanted you to come.", note: "Past trigger, so the subjunctive shifts to the past too." },
      { spanish: "Si tuviera dinero, viajaría más.", english: "If I had money, I'd travel more.", note: "An unreal present condition: imperfect subjunctive + conditional." },
      { spanish: "Como si fuera fácil.", english: "As if it were easy.", note: "'como si' always takes the imperfect subjunctive." },
      { spanish: "Quisiera hacer una reclamación.", english: "I'd like to make a complaint.", note: "The most formal register of politeness.", realWorld: true },
    ],
    mistakes: [
      { wrong: "Si tendría dinero, viajaría", right: "Si tuviera dinero, viajaría", explanation: "The conditional never appears in the 'si' clause — the subjunctive does." },
      { wrong: "Quería que venías", right: "Quería que vinieras", explanation: "A past-tense trigger requires the imperfect subjunctive." },
    ],
  },
  {
    slug: "si-clauses",
    title: "Conditional sentences (si clauses)",
    levelCode: "B2",
    category: "syntax",
    explanation:
      "Three patterns cover nearly everything:\n\n1. **Real**: si + present → present/future. *Si llueve, no salgo.*\n2. **Unreal present**: si + imperfect subjunctive → conditional. *Si tuviera tiempo, iría.*\n3. **Unreal past**: si + pluperfect subjunctive → conditional perfect. *Si hubiera sabido, habría venido.*",
    whenToUse: "Any time you speculate, regret, or set a condition.",
    formula: "si + present → present · si + imp. subj. → conditional · si + pluperf. subj. → cond. perfect",
    examples: [
      { spanish: "Si llueve, no salgo.", english: "If it rains, I'm not going out.", note: "A real, possible condition." },
      { spanish: "Si tuviera tiempo, aprendería a tocar el piano.", english: "If I had time, I'd learn the piano.", note: "Unreal now." },
      { spanish: "Si hubiera estudiado, habría aprobado.", english: "If I had studied, I would have passed.", note: "Regret about the past." },
    ],
    mistakes: [
      { wrong: "Si tendría tiempo", right: "Si tuviera tiempo", explanation: "'Si' is never followed by the conditional in standard Spanish." },
      { wrong: "Si hubiera estudiado, hubiera aprobado", right: "…habría aprobado", explanation: "Widely heard in speech and increasingly accepted, but the careful written form is habría." },
    ],
  },
  {
    slug: "passive-and-se",
    title: "The passive and impersonal se",
    levelCode: "B2",
    category: "syntax",
    explanation:
      "Spanish avoids the English-style passive ('was built by'). It prefers **se** constructions, which leave the agent out entirely, or simply an active third-person plural.",
    whenToUse: "Notices, instructions, journalism, and any time the agent is unknown or irrelevant.",
    formula: "se + 3rd person verb (agreeing with the thing) · or 3rd person plural active",
    examples: [
      { spanish: "Se habla español.", english: "Spanish is spoken here.", realWorld: true },
      { spanish: "Se venden pisos.", english: "Flats for sale.", note: "The verb agrees with 'pisos', so it is plural.", realWorld: true },
      { spanish: "Me robaron la cartera.", english: "My wallet was stolen.", note: "Literally 'they stole my wallet' — far more natural than a passive." },
      { spanish: "La casa fue construida en 1920.", english: "The house was built in 1920.", note: "The true passive exists but sounds formal and written." },
    ],
    mistakes: [
      { wrong: "Se vende pisos", right: "Se venden pisos", explanation: "In the passive se, the verb agrees with the thing being sold." },
      { wrong: "Fui dado un regalo", right: "Me dieron un regalo", explanation: "Spanish cannot make the indirect object the subject of a passive." },
    ],
  }
];
