import type { CourseEntry } from "../types.js";

/** C2 — Mastery. Literature, irony, regional depth and stylistic control. */
export const C2_COURSE: CourseEntry = {
  slug: "spanish-c2",
  title: "Spanish C2 — Mastery",
  description:
    "Understand virtually everything you hear or read, and express yourself with precision, irony and fine shades of meaning.",
  levelCode: "C2",
  modules: [
    {
      slug: "c2-literature",
      title: "Literature",
      description: "Reading for style, not just for meaning.",
      theme: "Literature",
      icon: "BookMarked",
      lessons: [
        {
          slug: "c2-literary-reading",
          title: "Reading literary Spanish",
          objective: "Read literary prose and account for its stylistic choices.",
          estimatedMinutes: 30,
          explanation:
            "Literary Spanish uses tools that everyday Spanish leaves alone: the **future subjunctive** (*fuere*, surviving mainly in law and proverbs), long periodic sentences that suspend the verb, and word order marked for rhythm rather than emphasis.\n\nThe skill at C2 is not comprehension — you already have that — but **accounting for the choice**: why the imperfect rather than the preterite here, why this word rather than its synonym, what the register shift signals about the narrator.\n\nReadings at this level are drawn from public-domain literature, so you are working with real texts rather than adapted ones.",
          review: "Read for choices, not just content: tense, register and word order all carry meaning.",
          vocabulary: ["la sinrazón", "ladino", "a la sazón", "por antonomasia"],
          grammar: ["stylistic-devices"],
          examples: [
            { spanish: "En un lugar de la Mancha, de cuyo nombre no quiero acordarme…", english: "In a village of La Mancha, whose name I do not care to remember…", note: "Cervantes: the suspended, periodic opening that defines Spanish literary prose." },
            { spanish: "Eso no lo sabía yo.", english: "Now that I did not know.", note: "Fronting plus a redundant pronoun for emphasis." },
          ],
          exercises: [
            {
              title: "Stylistic analysis",
              kind: "multiple_choice",
              prompt: "Account for the choice.",
              section: "test",
              grammarSlug: "stylistic-devices",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "'Llega Colón en 1492 y todo cambia.' Why the present tense?",
                  correctAnswer: "Historical present, for immediacy",
                  explanation: "Narrating past events in the present pulls the reader into the moment.",
                  options: [
                    { text: "Historical present, for immediacy" },
                    { text: "A grammatical error", feedback: "It is a deliberate and standard narrative device." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "c2-irony",
      title: "Native-level Expression",
      description: "Irony, humour and implication.",
      theme: "Expression",
      icon: "Drama",
      lessons: [
        {
          slug: "c2-irony-implicature",
          title: "Irony and implication",
          objective: "Recognise and produce irony, understatement and implicature.",
          estimatedMinutes: 25,
          explanation:
            "Most of what a native speaker communicates is not stated. Spanish carries implication through specific structures:\n\n*Ni que fuera el rey.* — 'Anyone would think he were the king.' Ironic subjunctive.\n*Pues sí que empezamos bien.* — 'Well, this is a fine start.' Said when it is not.\n*No está mal.* — litotes; depending on tone, anything from lukewarm to high praise.\n*¡Anda ya!* — 'Come off it.'\n\nThe risk at C2 is not misunderstanding the words but **missing the stance** — taking a sarcastic remark at face value.",
          review: "Irony rides on structure and tone. Ni que + subjunctive, litotes, and set exclamations carry the stance.",
          prerequisites: ["c2-literary-reading"],
          grammar: ["stylistic-devices"],
          examples: [
            { spanish: "Ni que fuéramos millonarios.", english: "Anyone would think we were millionaires." },
            { spanish: "Pues sí que vamos bien.", english: "Well, we're doing splendidly.", note: "Said when things are going badly." },
          ],
          exercises: [
            {
              title: "Reading the stance",
              kind: "multiple_choice",
              prompt: "What is actually meant?",
              section: "practice",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "After a disaster, someone says 'Pues sí que empezamos bien.'",
                  correctAnswer: "Things have started badly — it is sarcasm",
                  explanation: "'Pues sí que' plus a positive is a standard sarcastic frame.",
                  options: [
                    { text: "Things have started badly — it is sarcasm" },
                    { text: "They are genuinely pleased", feedback: "Taken literally, yes — but the frame marks it as ironic." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "c2-regional",
      title: "Regional Differences & Cultural Context",
      description: "Placing a speaker by how they talk.",
      theme: "Variation",
      icon: "Globe",
      lessons: [
        {
          slug: "c2-regional-variation",
          title: "Regional variation in depth",
          objective: "Identify regional origin from phonology, grammar and lexis.",
          estimatedMinutes: 25,
          explanation:
            "By C2 you should be able to place a speaker within a country or two.\n\n**Phonology**: Caribbean speakers aspirate or drop final -s (*ehtoy* for *estoy*); Argentines pronounce *ll/y* as 'sh'; central Spain uses the *th* for c/z.\n**Grammar**: *voseo* (*vos tenés*) across the Río de la Plata and Central America; *ustedes* replacing *vosotros* everywhere outside Spain; Spain's *leísmo*.\n**Lexis**: *coger* is neutral in Spain and obscene across much of Latin America — the single most important word to know about.\n\nNo variety is more correct than another. The educated standard of each region is fully standard Spanish.",
          review:
            "Phonology, grammar and lexis each localise a speaker. All standards are equally valid — but coger is worth knowing about.",
          prerequisites: ["c2-irony-implicature"],
          grammar: ["stylistic-devices"],
          culturalNote:
            "Spain: coche, ordenador, móvil, patata, zumo, vosotros. Mexico: carro, computadora, celular, papa, jugo, ustedes. Argentina: auto, vos tenés, che. Being understood everywhere is a matter of choosing neutral vocabulary when you do not know your audience.",
          examples: [
            { spanish: "¿Vos qué querés?", english: "What do you want?", note: "Rioplatense voseo — Argentina and Uruguay." },
            { spanish: "Ahorita vengo.", english: "I'll be right back.", note: "In Mexico this can mean anything from 'now' to 'later'." },
          ],
          exercises: [
            {
              title: "Place the speaker",
              kind: "multiple_choice",
              prompt: "Where is this speaker most likely from?",
              section: "test",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "'¿Vos sabés dónde está el auto?'",
                  correctAnswer: "Argentina",
                  explanation: "Voseo plus 'auto' points to the Río de la Plata.",
                  options: [{ text: "Argentina" }, { text: "Spain", feedback: "Spain uses tú and 'coche'." }, { text: "Mexico", feedback: "Mexico uses tú and 'carro'." }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Which word should you avoid in Mexico and Argentina?",
                  correctAnswer: "coger",
                  explanation: "Neutral in Spain ('to take'), but obscene across much of Latin America. Use 'tomar' or 'agarrar'.",
                  options: [{ text: "coger" }, { text: "tomar" }, { text: "agarrar" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
