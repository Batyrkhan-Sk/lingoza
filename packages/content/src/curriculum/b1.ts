import type { CourseEntry } from "../types.js";

/** B1 — Intermediate. The perfect, the conditional, and the first subjunctive. */
export const B1_COURSE: CourseEntry = {
  slug: "spanish-b1",
  title: "Spanish B1 — Intermediate",
  description:
    "Handle most situations that come up in a Spanish-speaking country, give opinions with reasons, and meet the subjunctive.",
  levelCode: "B1",
  modules: [
    {
      slug: "b1-perfect-tenses",
      title: "Complex Past Tenses",
      description: "The present perfect and the pluperfect.",
      theme: "Past tenses",
      icon: "Layers",
      lessons: [
        {
          slug: "b1-present-perfect",
          title: "El pretérito perfecto",
          objective: "Use haber + participle for experience and unfinished time frames.",
          estimatedMinutes: 18,
          explanation:
            "Built with **haber + past participle**: *he hablado, has comido, ha vivido*.\n\nIt links the past to now — anything inside a time frame that has not closed (*hoy, esta semana, este año*), life experience (*¿has estado alguna vez…?*), and results that still matter (*he perdido las llaves*).\n\nIrregular participles must be memorised: *escrito, hecho, visto, dicho, puesto, vuelto, abierto, roto, muerto*.\n\nRegional note: in Spain this tense is used constantly for today's events. Much of Latin America prefers the simple preterite in exactly those contexts — *hoy comí* rather than *hoy he comido*. Both are correct in their own region.",
          review: "haber + participle. Unfinished time, life experience, present relevance. Irregular participles matter.",
          grammar: ["present-perfect"],
          examples: [
            { spanish: "Hoy he trabajado doce horas.", english: "I've worked twelve hours today." },
            { spanish: "¿Has estado alguna vez en Argentina?", english: "Have you ever been to Argentina?", realWorld: true },
            { spanish: "He perdido el móvil.", english: "I've lost my phone.", note: "The result still matters now." },
          ],
          exercises: [
            {
              title: "Present perfect",
              kind: "fill_blank",
              prompt: "Complete with the present perfect.",
              section: "test",
              grammarSlug: "present-perfect",
              questions: [
                { kind: "fill_blank", prompt: "Hoy ___ (yo, hacer) mucho ejercicio.", correctAnswer: "he hecho", explanation: "hacer has the irregular participle 'hecho'." },
                { kind: "fill_blank", prompt: "Ella ___ (escribir) tres correos.", correctAnswer: "ha escrito", explanation: "escribir → escrito, not 'escribido'." },
                {
                  kind: "multiple_choice",
                  prompt: "Ayer ___ paella.",
                  correctAnswer: "comí",
                  explanation: "'Ayer' is a closed time frame, so the preterite is required.",
                  options: [{ text: "comí" }, { text: "he comido", feedback: "The perfect needs an open time frame such as 'hoy'." }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "b1-conditional",
      title: "The Conditional",
      description: "Politeness, hypotheticals and advice.",
      theme: "Conditional",
      icon: "GitBranch",
      lessons: [
        {
          slug: "b1-conditional-forms",
          title: "El condicional",
          objective: "Make polite requests and talk about what would happen.",
          estimatedMinutes: 15,
          explanation:
            "Add *-ía, -ías, -ía, -íamos, -íais, -ían* to the **whole infinitive**: *hablaría, comería, viviría*. The same irregular stems as the future apply: *tendría, haría, podría, diría*.\n\nBeyond hypotheticals, its most useful everyday job is **politeness**. *Quiero un café* is fine; *Querría un café* or *Me gustaría un café* is what an adult says. *¿Podrías…?* softens any request.",
          review: "infinitive + ía endings. Hypotheticals, advice, reported future — and politeness above all.",
          prerequisites: ["b1-present-perfect"],
          grammar: ["conditional"],
          examples: [
            { spanish: "Me gustaría reservar una mesa.", english: "I'd like to book a table.", realWorld: true },
            { spanish: "Yo que tú, hablaría con ella.", english: "If I were you, I'd talk to her." },
            { spanish: "Dijo que llegaría tarde.", english: "He said he'd be late." },
          ],
          exercises: [
            {
              title: "Conditional",
              kind: "fill_blank",
              prompt: "Complete in the conditional.",
              section: "practice",
              grammarSlug: "conditional",
              questions: [
                { kind: "fill_blank", prompt: "¿___ (poder, tú) ayudarme?", correctAnswer: "Podrías", acceptedAnswers: ["podrías"], explanation: "poder → podr- + ía endings." },
                { kind: "fill_blank", prompt: "Con más tiempo, ___ (yo, viajar) más.", correctAnswer: "viajaría", explanation: "Regular: the full infinitive plus -ía." },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "b1-subjunctive",
      title: "The Subjunctive",
      description: "The mood of wishes, doubt and the unreal.",
      theme: "Subjunctive",
      icon: "Sparkle",
      lessons: [
        {
          slug: "b1-present-subjunctive",
          title: "El presente de subjuntivo",
          objective: "Form the present subjunctive and use it after wishes, doubt and emotion.",
          estimatedMinutes: 22,
          explanation:
            "The subjunctive is a **mood**, not a tense. It marks that you are not asserting something as fact — you are wishing it, doubting it, reacting to it, or waiting for it.\n\nForm: take the **yo** form of the present, drop the -o, and flip the vowel. *hablo → hable*, *como → coma*, *tengo → tenga*. Verbs irregular in the yo form stay irregular here, which is why this rule is worth more than a table.\n\nThe classic triggers, all requiring **two different subjects joined by que**:\n- wish: *Quiero que **vengas***\n- emotion: *Me alegro de que **estés** aquí*\n- doubt/denial: *No creo que **sea** verdad*\n- recommendation: *Es importante que **estudies***\n- future time clauses: *Cuando **llegues**, llámame*\n\nSame subject? No *que*, just the infinitive: *Quiero ir*, not *Quiero que yo vaya*.",
          review:
            "yo form − o + opposite vowel. Two subjects + que + a non-assertion. Same subject → infinitive.",
          prerequisites: ["b1-conditional-forms"],
          grammar: ["present-subjunctive"],
          examples: [
            { spanish: "Espero que te guste.", english: "I hope you like it.", realWorld: true },
            { spanish: "No creo que sea buena idea.", english: "I don't think it's a good idea.", note: "Negating 'creer' triggers the subjunctive." },
            { spanish: "Cuando tenga tiempo, te llamo.", english: "When I have time, I'll call you.", note: "A future 'when' takes the subjunctive." },
            { spanish: "Quiero que me digas la verdad.", english: "I want you to tell me the truth." },
          ],
          exercises: [
            {
              title: "Subjunctive triggers",
              kind: "multiple_choice",
              prompt: "Indicative or subjunctive?",
              section: "test",
              grammarSlug: "present-subjunctive",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Quiero que ___ conmigo.",
                  correctAnswer: "vengas",
                  explanation: "'Querer que' with a different subject always takes the subjunctive.",
                  options: [{ text: "vengas" }, { text: "vienes", feedback: "This is the indicative — but a wish about someone else is not an assertion." }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Creo que ___ verdad.",
                  correctAnswer: "es",
                  explanation: "Affirmative 'creer' asserts, so it takes the indicative.",
                  options: [{ text: "es" }, { text: "sea", feedback: "Only the negative 'no creo que' takes the subjunctive." }],
                },
                {
                  kind: "fill_blank",
                  prompt: "Es importante que ___ (tú, estudiar).",
                  correctAnswer: "estudies",
                  explanation: "Impersonal expressions of importance take the subjunctive.",
                },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "Quiero ir.",
                  explanation: "One subject means no 'que' and no subjunctive — just the infinitive.",
                  options: [
                    { text: "Quiero ir." },
                    { text: "Quiero que yo vaya.", feedback: "With the same subject, Spanish uses the infinitive." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "b1-opinions",
      title: "Opinions & Idioms",
      description: "Argue a point and use everyday idiomatic expressions.",
      theme: "Expression",
      icon: "Quote",
      lessons: [
        {
          slug: "b1-giving-opinions",
          title: "Giving and defending an opinion",
          objective: "Express and support an opinion with connectors.",
          estimatedMinutes: 16,
          explanation:
            "Opinion frames split by mood, and the split is entirely logical: an **affirmative** frame asserts, so it takes the indicative; a **negative** frame withholds assertion, so it takes the subjunctive.\n\n*Creo que **es** importante* / *No creo que **sea** importante*\n*Me parece que **tiene** razón* / *No me parece que **tenga** razón*\n\nBuild an argument with: *en mi opinión, por un lado… por otro lado, sin embargo, además, por lo tanto, a pesar de*.",
          review: "Affirmative frame → indicative. Negative frame → subjunctive. Connect with sin embargo, además, por lo tanto.",
          prerequisites: ["b1-present-subjunctive"],
          vocabulary: ["sin embargo", "por lo tanto", "a pesar de", "en cuanto a", "merecer la pena", "dar igual"],
          grammar: ["present-subjunctive"],
          writing: [
            {
              slug: "b1-write-vacation",
              title: "Your last holiday",
              levelCode: "B1",
              instruction: "Write about your last holiday: where you went, what you did, and what you thought of it.",
              minWords: 100,
              maxWords: 180,
              targetStructures: ["preterite", "imperfect", "opinion connectors"],
            },
          ],
          examples: [
            { spanish: "En mi opinión, merece la pena.", english: "In my view, it's worth it." },
            { spanish: "No creo que sea tan sencillo.", english: "I don't think it's that simple." },
            { spanish: "Por un lado es caro; por otro, dura años.", english: "On one hand it's expensive; on the other, it lasts years." },
          ],
          exercises: [
            {
              title: "Opinion frames",
              kind: "fill_blank",
              prompt: "Indicative or subjunctive?",
              section: "practice",
              grammarSlug: "present-subjunctive",
              questions: [
                { kind: "fill_blank", prompt: "Creo que ___ (ser) una buena idea.", correctAnswer: "es", explanation: "Affirmative 'creo que' asserts → indicative." },
                { kind: "fill_blank", prompt: "No creo que ___ (ser) una buena idea.", correctAnswer: "sea", explanation: "The negation withholds assertion → subjunctive." },
              ],
            },
          ],
        },
      ],
    },
  ],
};
