import type { GrammarTopicEntry } from "../types.js";

/** C1/C2 — mood as meaning, discourse markers, and stylistic control. */
export const C1C2_TOPICS: GrammarTopicEntry[] = [
  {
    slug: "subjunctive-advanced",
    title: "Advanced subjunctive: nuance and register",
    levelCode: "C1",
    category: "verbs",
    explanation:
      "At C1 the subjunctive stops being a rule to apply and becomes a choice that carries meaning. The same sentence with either mood is grammatical — and says something different.\n\n*Busco a alguien que habla ruso* (a specific person I know speaks it) versus *Busco a alguien que hable ruso* (anyone who does). Mastering this is largely about hearing what the mood implies about the speaker's commitment to the truth of the clause.",
    whenToUse: "Wherever the mood is optional — which at this level is most places.",
    formula: "indicative = asserted as real · subjunctive = not asserted",
    examples: [
      { spanish: "Aunque es difícil, lo haré.", english: "Although it is difficult, I'll do it.", note: "Indicative: I concede the difficulty as a fact." },
      { spanish: "Aunque sea difícil, lo haré.", english: "Even if it should be difficult, I'll do it.", note: "Subjunctive: I am not committing to whether it is." },
      { spanish: "El hecho de que lo dijera me sorprendió.", english: "The fact that he said it surprised me.", note: "'El hecho de que' takes the subjunctive even though the fact is real." },
      { spanish: "Que yo sepa, no ha llegado.", english: "As far as I know, he hasn't arrived.", note: "A fixed expression worth learning whole.", realWorld: true },
    ],
    mistakes: [
      { wrong: "Treating the choice as a rule", right: "Treating it as meaning", explanation: "At C1, both moods are often grammatical; picking one asserts something about your commitment to the claim." },
    ],
  },
  {
    slug: "discourse-markers",
    title: "Discourse markers and register",
    levelCode: "C1",
    category: "syntax",
    explanation:
      "What separates fluent from advanced-but-foreign is rarely grammar — it is the connective tissue. Native speakers scaffold their speech with markers that signal where an argument is going: *o sea*, *es decir*, *ahora bien*, *dicho esto*, *por cierto*, *en fin*.\n\nEach also carries a register. *O sea* is conversational; *es decir* is neutral; *a saber* is formal and written.",
    whenToUse: "In any extended speech or writing — debate, presentations, essays.",
    formula: "marker + clause, chosen for register",
    examples: [
      { spanish: "No me convence; ahora bien, entiendo tu postura.", english: "It doesn't convince me; that said, I understand your position." },
      { spanish: "Es decir, no hay presupuesto.", english: "That is to say, there is no budget." },
      { spanish: "Por cierto, ¿has visto a Marta?", english: "By the way, have you seen Marta?", realWorld: true },
      { spanish: "En fin, ya veremos.", english: "Anyway, we'll see.", realWorld: true },
    ],
    mistakes: [
      { wrong: "Using 'o sea' in an academic essay", right: "es decir / esto es", explanation: "'O sea' is conversational and reads as careless in formal writing." },
    ],
  },
  {
    slug: "stylistic-devices",
    title: "Literary and rhetorical devices",
    levelCode: "C2",
    category: "style",
    explanation:
      "At C2 the goal is control of effect: fronting an element for emphasis (*Eso no lo sabía yo*), the historical present in narration, deliberate register clash for irony, and the leísmo/laísmo variation that marks regional and social origin.\n\nThese are choices a native makes without thinking and a C2 speaker makes on purpose.",
    whenToUse: "Literature, journalism, oratory, and any writing meant to persuade.",
    formula: "marked word order · tense shift · register contrast",
    examples: [
      { spanish: "Eso no lo sabía yo.", english: "Now that, I did not know.", note: "Fronting plus a redundant pronoun for emphasis." },
      { spanish: "Llega Colón en 1492 y todo cambia.", english: "Columbus arrives in 1492 and everything changes.", note: "Historical present for immediacy." },
      { spanish: "Ni que fuera el rey.", english: "Anyone would think he was the king.", note: "Ironic subjunctive." },
    ],
    mistakes: [
      { wrong: "Using literary word order in casual speech", right: "Matching register to context", explanation: "Marked constructions in a bar sound affected rather than sophisticated." },
    ],
  },
  {
    slug: "caribbean-phonology",
    title: "Caribbean Spanish: why you cannot hear the words",
    levelCode: "B2",
    category: "pronunciation",
    explanation:
      "A learner who has studied only textbook Spanish can know every word in a Puerto Rican, Cuban or Dominican sentence and still hear an unbroken stream. The vocabulary is not the problem — the *endings* are missing.\n\nCaribbean Spanish systematically erodes consonants that peninsular Spanish keeps. Four changes account for most of it:\n\n**1. Final -s becomes an h, or vanishes.** *Estoy* → *ehtoy*. *Los amigos* → *loh amigo*. This is the big one, because -s is what marks plurals and the *tú* form of every verb.\n\n**2. Intervocalic -d- disappears.** *Todo* → *to'*. *Para* → *pa'*. *Cansado* → *cansao*. *Nada* → *na'*.\n\n**3. -r becomes -l at the end of a syllable.** *Puerto* → *puelto*. *Verdad* → *veldá*.\n\n**4. Final -n becomes nasal, and consonants at the end of words drop.** *Usted* → *usté*.\n\nNone of this is sloppy or uneducated speech — it is the regular phonology of tens of millions of speakers, including on the news. It is only unintelligible if you were taught that Spanish is pronounced the way it is spelled.",
    whenToUse:
      "Any time you listen to Caribbean speakers: Puerto Rico, Cuba, the Dominican Republic, coastal Venezuela and Colombia, and much of Andalusia — plus most reggaetón and salsa.",
    formula: "-s → h/∅ · -d- → ∅ · -r → -l · final consonants weaken",
    examples: [
      { spanish: "¿Cómo estás? → ¿Cómo etá?", english: "How are you?", note: "Both -s sounds gone. The question is only recognisable from intonation." },
      { spanish: "Para → pa'", english: "for / to", note: "So common it is often written this way deliberately.", realWorld: true },
      { spanish: "Todo bien → To' bien", english: "All good", realWorld: true },
      { spanish: "Estoy cansado → Ehtoy cansao", english: "I'm tired", note: "Two different changes in one short phrase." },
      { spanish: "Vamos a la playa → Vamo' a la playa", english: "Let's go to the beach", note: "Losing the -s of vamos does not change the meaning — context carries it." },
      { spanish: "Verdad → veldá", english: "truth", note: "-r → -l, then the final -d drops.", realWorld: true },
    ],
    mistakes: [
      { wrong: "Assuming 'pa' is a different word", right: "pa' = para", explanation: "The apostrophe marks what was removed. Reading it back as the full word makes the sentence parse instantly." },
      { wrong: "Hearing 'tú tiene' as a grammar error", right: "tú tienes, with the -s aspirated", explanation: "The -s is still grammatically there; it just is not pronounced. Speakers are not dropping agreement." },
      { wrong: "Trying to imitate the dropped consonants too early", right: "Understand it first, produce standard Spanish", explanation: "Comprehension and production are separate skills here. Learn to hear it; keep speaking clearly until the dialect is genuinely yours." },
    ],
  },
];
