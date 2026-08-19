import type { CourseEntry } from "../types.js";

/** C1 — Advanced. Mood as meaning, register, academic and professional Spanish. */
export const C1_COURSE: CourseEntry = {
  slug: "spanish-c1",
  title: "Spanish C1 — Advanced",
  description:
    "Understand demanding texts, catch implicit meaning, and use Spanish flexibly for academic and professional purposes.",
  levelCode: "C1",
  modules: [
    {
      slug: "c1-mood-nuance",
      title: "Advanced Grammar",
      description: "Where both moods are grammatical and the choice carries meaning.",
      theme: "Nuance",
      icon: "Scale",
      lessons: [
        {
          slug: "c1-mood-as-meaning",
          title: "Mood as meaning",
          objective: "Choose between indicative and subjunctive for effect, not by rule.",
          estimatedMinutes: 22,
          explanation:
            "At this level the subjunctive stops being a rule you apply and becomes a choice you make. In most advanced contexts both moods are grammatical, and the one you pick tells your listener how committed you are to the claim.\n\n> *Busco a alguien que **habla** ruso.* — a specific person, who I know speaks Russian.\n> *Busco a alguien que **hable** ruso.* — anyone at all, provided they speak it.\n\n> *Aunque **llueve**, salgo.* — it is raining, and I am going out anyway.\n> *Aunque **llueva**, salgo.* — rain or not, I am going out.\n\nAlso master the fixed frames that resist analysis and must be learned whole: *que yo sepa*, *no es que sea…*, *el hecho de que…*, *por mucho que…*, *digan lo que digan*.",
          review: "Indicative asserts; subjunctive declines to. At C1 both are usually legal — the choice is the message.",
          grammar: ["subjunctive-advanced"],
          examples: [
            { spanish: "Que yo sepa, no ha dimitido.", english: "As far as I know, he hasn't resigned.", realWorld: true },
            { spanish: "No es que no me guste, es que no tengo tiempo.", english: "It's not that I don't like it, it's that I have no time." },
            { spanish: "Digan lo que digan, seguiré adelante.", english: "Whatever they say, I'll carry on." },
          ],
          exercises: [
            {
              title: "Mood and meaning",
              kind: "multiple_choice",
              prompt: "Which conveys the stated meaning?",
              section: "test",
              grammarSlug: "subjunctive-advanced",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "You want ANY translator who speaks Russian:",
                  correctAnswer: "Busco a alguien que hable ruso.",
                  explanation: "An unspecified person meeting a description takes the subjunctive.",
                  options: [
                    { text: "Busco a alguien que hable ruso." },
                    { text: "Busco a alguien que habla ruso.", feedback: "That implies a specific person you already have in mind." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "It IS raining, and you are going out anyway:",
                  correctAnswer: "Aunque llueve, salgo.",
                  explanation: "The indicative concedes the rain as an established fact.",
                  options: [
                    { text: "Aunque llueve, salgo." },
                    { text: "Aunque llueva, salgo.", feedback: "That means 'even if it should rain' — you are not confirming that it is." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "c1-register",
      title: "Register & Discourse",
      description: "Sounding right in the room you are in.",
      theme: "Register",
      icon: "SlidersHorizontal",
      lessons: [
        {
          slug: "c1-discourse-markers",
          title: "Discourse markers and register",
          objective: "Structure extended speech and match register to context.",
          estimatedMinutes: 20,
          explanation:
            "What separates advanced-but-foreign from genuinely fluent is rarely grammar — it is the connective tissue, and its register.\n\n**Conversational**: *o sea, vamos, en plan, total que, bueno*\n**Neutral**: *es decir, de hecho, en cambio, por cierto*\n**Formal/written**: *esto es, a saber, cabe señalar, en aras de*\n\nUsing *o sea* in an academic essay reads as careless; using *cabe señalar* in a bar reads as pompous. Command of register means holding all three sets and choosing deliberately.",
          review: "Three registers of connector. The mistake is never the marker itself — it is the mismatch with context.",
          prerequisites: ["c1-mood-as-meaning"],
          vocabulary: ["el ámbito", "subyacente", "en aras de", "a todas luces", "huelga decir"],
          grammar: ["discourse-markers"],
          writing: [
            {
              slug: "c1-write-ai-essay",
              title: "Argumentative essay: artificial intelligence",
              levelCode: "C1",
              instruction:
                "Write an argumentative essay on artificial intelligence: state a thesis, present the strongest counter-argument fairly, rebut it, and conclude. Formal register throughout.",
              minWords: 300,
              maxWords: 500,
              targetStructures: ["formal discourse markers", "subjunctive after concessives", "impersonal se"],
            },
          ],
          examples: [
            { spanish: "Cabe señalar que los datos son parciales.", english: "It should be noted that the data are partial.", note: "Formal written register." },
            { spanish: "Total, que al final no fuimos.", english: "So anyway, in the end we didn't go.", note: "Strongly colloquial." },
          ],
          exercises: [
            {
              title: "Register",
              kind: "multiple_choice",
              prompt: "Choose the appropriate register.",
              section: "practice",
              grammarSlug: "discourse-markers",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "In an academic paper, 'that is to say':",
                  correctAnswer: "esto es",
                  explanation: "'Esto es' and 'es decir' suit formal writing; 'o sea' does not.",
                  options: [{ text: "esto es" }, { text: "o sea", feedback: "Conversational — it reads as careless in academic prose." }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "c1-media",
      title: "Journalism & Long-form Listening",
      description: "Real news, interviews and podcasts at native speed.",
      theme: "Media",
      icon: "Radio",
      lessons: [
        {
          slug: "c1-journalism",
          title: "Reading the press",
          objective: "Read Spanish journalism and identify stance and implication.",
          estimatedMinutes: 25,
          explanation:
            "Spanish journalism has its own conventions: heavy nominalisation (*la subida de precios* rather than 'prices rose'), the conditional for unconfirmed claims (*el ministro habría dimitido* — 'the minister has reportedly resigned'), and the passive-se everywhere.\n\nThat conditional is a genuine comprehension trap. *Habría* here does not mean 'would have' — it flags information the paper is not vouching for.\n\nThis lesson's reading is pulled live from the Spanish press, so it is whatever is being published today.",
          review:
            "Nominalisation, passive-se, and the reportorial conditional for unconfirmed claims.",
          prerequisites: ["c1-discourse-markers"],
          vocabulary: ["el revuelo", "esgrimir", "soslayar", "paliar"],
          grammar: ["passive-and-se", "discourse-markers"],
          examples: [
            { spanish: "El acuerdo se habría firmado ayer.", english: "The agreement was reportedly signed yesterday.", note: "The conditional marks it as unverified — not as a hypothetical." },
            { spanish: "Se prevé una caída del consumo.", english: "A drop in consumption is forecast." },
          ],
          exercises: [
            {
              title: "Press conventions",
              kind: "multiple_choice",
              prompt: "What does the sentence imply?",
              section: "test",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "'El ministro habría mentido' means:",
                  correctAnswer: "The minister allegedly lied — unconfirmed",
                  explanation: "The journalistic conditional marks a claim the paper is not confirming.",
                  options: [
                    { text: "The minister allegedly lied — unconfirmed" },
                    { text: "The minister would have lied if…", feedback: "That is the hypothetical use; in a news headline it signals an unverified report." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
