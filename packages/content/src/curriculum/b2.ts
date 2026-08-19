import type { CourseEntry } from "../types.js";

/** B2 — Upper Intermediate. Past subjunctive, conditionals, passive, register. */
export const B2_COURSE: CourseEntry = {
  slug: "spanish-b2",
  title: "Spanish B2 — Upper Intermediate",
  description:
    "Argue a case, follow news and debate, handle professional Spanish, and speak with fluency and spontaneity.",
  levelCode: "B2",
  modules: [
    {
      slug: "b2-past-subjunctive",
      title: "Past Subjunctive & Conditionals",
      description: "Unreal situations and regrets.",
      theme: "Subjunctive",
      icon: "Shuffle",
      lessons: [
        {
          slug: "b2-imperfect-subjunctive",
          title: "El imperfecto de subjuntivo",
          objective: "Form and use the imperfect subjunctive in unreal conditions.",
          estimatedMinutes: 20,
          explanation:
            "Take the **third person plural preterite**, drop *-ron*, add *-ra, -ras, -ra, -ramos, -rais, -ran*.\n\n*hablaron → hablara* · *comieron → comiera* · *tuvieron → tuviera* · *fueron → fuera*\n\nBecause it is built from the preterite, every preterite irregularity carries over automatically — learn one, get the other free.\n\nThree main uses:\n1. A past-tense trigger: *Quería que **vinieras***.\n2. Unreal conditions: *Si **tuviera** dinero, viajaría*.\n3. Maximum politeness: *Quisiera hacer una reclamación*.\n\nThe **-se** forms (*hablase, comiese*) are fully equivalent and more common in writing.",
          review: "3rd person plural preterite − ron + ra. Past triggers, unreal conditions, high politeness.",
          grammar: ["imperfect-subjunctive", "si-clauses"],
          examples: [
            { spanish: "Si tuviera más tiempo, aprendería ruso.", english: "If I had more time, I'd learn Russian." },
            { spanish: "Me pidió que le ayudara.", english: "He asked me to help him." },
            { spanish: "Quisiera hablar con el responsable.", english: "I'd like to speak to the manager.", realWorld: true },
          ],
          exercises: [
            {
              title: "Unreal conditions",
              kind: "fill_blank",
              prompt: "Complete the conditional sentence.",
              section: "test",
              grammarSlug: "si-clauses",
              questions: [
                { kind: "fill_blank", prompt: "Si yo ___ (tener) dinero, viajaría más.", correctAnswer: "tuviera", acceptedAnswers: ["tuviese"], explanation: "Unreal present: si + imperfect subjunctive → conditional." },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "Si pudiera, iría.",
                  explanation: "'Si' is never followed by the conditional in standard Spanish.",
                  options: [
                    { text: "Si pudiera, iría." },
                    { text: "Si podría, iría.", feedback: "The conditional cannot appear in the si clause." },
                  ],
                },
                { kind: "fill_blank", prompt: "Si ___ (yo, saber) eso antes, habría actuado distinto.", correctAnswer: "hubiera sabido", acceptedAnswers: ["hubiese sabido"], explanation: "Unreal past: si + pluperfect subjunctive → conditional perfect." },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "b2-passive",
      title: "Passive & Impersonal",
      description: "How Spanish avoids the English passive.",
      theme: "Syntax",
      icon: "RefreshCcw",
      lessons: [
        {
          slug: "b2-se-constructions",
          title: "Se constructions",
          objective: "Use passive and impersonal se instead of English-style passives.",
          estimatedMinutes: 16,
          explanation:
            "Spanish strongly prefers **se** over the true passive.\n\n*Se habla español.* — Spanish is spoken.\n*Se venden pisos.* — Flats for sale. (Agrees with *pisos*.)\n*Se dice que…* — It is said that…\n\nWhen an agent is involved but unimportant, a plain third-person plural does the job: *Me robaron la cartera* — 'they stole my wallet', far more natural than any passive.\n\nThere is also the **accidental se**, which shifts blame away from the speaker: *Se me cayó el vaso* — 'the glass fell on me', not 'I dropped it'. This is genuinely how Spanish speakers describe accidents.",
          review: "se + verb agreeing with the thing · 3rd person plural for unknown agents · se me cayó for accidents.",
          prerequisites: ["b2-imperfect-subjunctive"],
          grammar: ["passive-and-se"],
          examples: [
            { spanish: "Se buscan camareros.", english: "Waiters wanted.", realWorld: true },
            { spanish: "Se me olvidó el nombre.", english: "I forgot the name.", note: "Literally 'the name forgot itself to me'." },
            { spanish: "Aquí no se puede fumar.", english: "You can't smoke here.", realWorld: true },
          ],
          exercises: [
            {
              title: "Se constructions",
              kind: "multiple_choice",
              prompt: "Choose the natural Spanish.",
              section: "practice",
              grammarSlug: "passive-and-se",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "'Flats for sale' on a sign:",
                  correctAnswer: "Se venden pisos",
                  explanation: "The verb agrees with 'pisos', so it is plural.",
                  options: [{ text: "Se venden pisos" }, { text: "Se vende pisos", feedback: "The verb must agree with the plural noun." }],
                },
                {
                  kind: "translate",
                  prompt: "My wallet was stolen.",
                  correctAnswer: "Me robaron la cartera",
                  acceptedAnswers: ["Me han robado la cartera"],
                  explanation: "Spanish prefers an active third-person plural to a passive here.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "b2-debate",
      title: "News, Debate & Professional Spanish",
      description: "Follow the media and hold your own in an argument.",
      theme: "Debate",
      icon: "Newspaper",
      lessons: [
        {
          slug: "b2-debating",
          title: "Debating a position",
          objective: "Concede, rebut and qualify an argument.",
          estimatedMinutes: 18,
          explanation:
            "Debate in Spanish runs on a set of moves, each with its own frame.\n\n**Concede**: *Estoy de acuerdo en parte…*, *Es cierto que…*\n**Rebut**: *Sin embargo…*, *No obstante…*, *Ahora bien…*\n**Qualify**: *Depende de…*, *Habría que matizar que…*\n**Insist**: *Lo que quiero decir es que…*, *Insisto en que…*\n\nA grammatical trap worth naming: *Aunque **es** difícil* concedes it as a fact; *Aunque **sea** difícil* means 'even if it should be'. Choosing the mood changes your commitment to the claim.",
          review: "Concede, rebut, qualify, insist. Aunque + indicative concedes a fact; + subjunctive supposes one.",
          prerequisites: ["b2-se-constructions"],
          vocabulary: ["cuestionar", "matizar", "el enfoque", "no obstante", "por consiguiente", "poner en duda"],
          grammar: ["present-subjunctive", "imperfect-subjunctive"],
          writing: [
            {
              slug: "b2-write-social-media",
              title: "Opinion: social media",
              levelCode: "B2",
              instruction: "Give your opinion on social media: its benefits, its harms, and your overall position. Use at least two concessive structures.",
              minWords: 180,
              maxWords: 300,
              targetStructures: ["aunque + subjunctive", "sin embargo", "por lo tanto"],
            },
          ],
          examples: [
            { spanish: "Es cierto que ayuda, pero no obstante genera dependencia.", english: "It's true it helps, but nevertheless it creates dependency." },
            { spanish: "Habría que matizar esa afirmación.", english: "That claim would need qualifying." },
          ],
          exercises: [
            {
              title: "Debate moves",
              kind: "multiple_choice",
              prompt: "Choose the right connector.",
              section: "test",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Es caro. ___, la calidad es excelente.",
                  correctAnswer: "No obstante",
                  explanation: "A contrast is needed here.",
                  options: [{ text: "No obstante" }, { text: "Por consiguiente", feedback: "That introduces a consequence, not a contrast." }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Aunque ___ difícil, lo intentaré. (even if it should be)",
                  correctAnswer: "sea",
                  explanation: "The subjunctive marks a supposed rather than conceded difficulty.",
                  options: [{ text: "sea" }, { text: "es", feedback: "The indicative would concede it as an established fact." }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
