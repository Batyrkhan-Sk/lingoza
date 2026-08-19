import type { GrammarMnemonicEntry } from "../types.js";

/**
 * Curated grammar memory hooks.
 *
 * These are the ones worth authoring rather than generating: they are the
 * classic teaching acronyms that thousands of learners have already been drilled
 * on, they are stable, and they cover exactly the distinctions that produce most
 * errors. Generated hooks fill in around them for individual weak points.
 *
 * Each is deliberately short enough to run through mid-sentence while speaking —
 * a memory aid you have to stop and read is not a memory aid.
 */
export const GRAMMAR_MNEMONICS: GrammarMnemonicEntry[] = [
  {
    grammarSlug: "ser",
    kind: "acronym",
    hook: "**DOCTOR** — Description · Occupation · Characteristic · Time · Origin · Relationship",
    explanation:
      "If what you are saying falls under one of those six, it takes **ser**. 'Soy médico' is Occupation; 'Son las tres' is Time; 'Es mi hermana' is Relationship.",
  },
  {
    grammarSlug: "estar",
    kind: "acronym",
    hook: "**PLACE** — Position · Location · Action · Condition · Emotion",
    explanation:
      "All five are things that can change, and all five take **estar**. 'Estoy en casa' is Location; 'Está lloviendo' is Action; 'Estoy cansado' is Condition.",
  },
  {
    grammarSlug: "ser",
    kind: "contrast",
    hook: "Ser says **what it is**. Estar says **how it is**.",
    explanation:
      "Faster than DOCTOR/PLACE once it clicks. 'What is she?' → a teacher → *es profesora*. 'How is she?' → tired → *está cansada*. The 'permanent vs temporary' version breaks on *está muerto*; this one does not.",
  },
  {
    grammarSlug: "present-subjunctive",
    kind: "acronym",
    hook: "**WEIRDO** — Wishes · Emotions · Impersonal expressions · Recommendations · Doubt & Denial · Ojalá",
    explanation:
      "Every one of these is a case where you are *not* asserting something as fact, which is what the subjunctive marks. If the main clause is a WEIRDO and the subject changes after *que*, use the subjunctive.",
  },
  {
    grammarSlug: "present-subjunctive",
    kind: "contrast",
    hook: "Two subjects + *que* + not-a-fact → subjunctive. Same subject → just the infinitive.",
    explanation:
      "This catches the most common error in one step: *Quiero que vengas* (two people) versus *Quiero ir* (one person). If you find yourself writing 'quiero que yo…', you want the infinitive.",
  },
  {
    grammarSlug: "por-para",
    kind: "contrast",
    hook: "Draw an arrow. **para** is the arrowhead — where it's going. **por** is the shaft — what it went through.",
    explanation:
      "Destination, purpose, deadline and recipient are all the arrowhead: *para ti*, *para mañana*. Cause, route, duration and exchange are all the shaft: *por ti* (because of you), *por Madrid* (through), *por 20 euros* (in exchange).",
  },
  {
    grammarSlug: "por-para",
    kind: "acronym",
    hook: "**PORDUE** — por is for: Period of time · Origin/cause · Route · Duration · Unit price · Exchange",
    explanation:
      "A backstop when the arrow image does not settle it. Anything left over is usually *para*.",
  },
  {
    grammarSlug: "preterite",
    kind: "contrast",
    hook: "Preterite = **photograph**. Imperfect = **video**.",
    explanation:
      "A photo is a finished, framed moment: *ayer comí paella*. A video is ongoing, with no edges in view: *comía paella todos los domingos*. When one interrupts the other, the video was running and the photo was taken: *dormía cuando sonó el teléfono*.",
  },
  {
    grammarSlug: "imperfect",
    kind: "contrast",
    hook: "If English could say 'used to' or 'was ...-ing', Spanish says **imperfect**.",
    explanation:
      "A fast test that gets the majority of cases right. 'I used to live there' → *vivía*. 'I lived there for two years' → closed period → *viví*.",
  },
  {
    grammarSlug: "saber-conocer",
    kind: "contrast",
    hook: "**Saber** a fact. **Conocer** a face.",
    explanation:
      "Facts, information and how-to are *saber*: *sé nadar*, *sé que viene*. People, places and works you are acquainted with are *conocer*: *conozco a tu hermano*, *no conozco Madrid*.",
  },
  {
    grammarSlug: "bien-bueno",
    kind: "contrast",
    hook: "**Bueno** describes a **noun**. **Bien** describes a **verb**. Both start with the letter of what they modify: b-**ueno**/noun-ish, b-**ien**/action.",
    explanation:
      "*Es un buen libro* (describes the book) versus *escribe bien* (describes the writing). And remember *estoy bien* = I'm fine, while *estoy bueno* = I'm good-looking.",
  },
  {
    grammarSlug: "haber-tener",
    kind: "contrast",
    hook: "**Tener** = I have it. **Hay** = there is/are — and *hay* never changes.",
    explanation:
      "One car or fifty, it is always *hay*: *hay un coche*, *hay muchos coches*. 'Han muchos coches' is never correct.",
  },
  {
    grammarSlug: "gender-and-articles",
    kind: "gender",
    hook: "**LONERS** are masculine — words ending in **L, O, N, E, R, S**. **D-IÓN-Z-A** are feminine — **-d, -ión, -z, -a**.",
    explanation:
      "Covers the large majority of Spanish nouns. *el papel, el libro, el pan, el coche, el amor, el mes* · *la ciudad, la canción, la luz, la mesa*. The famous exceptions are worth learning as a short list: *el día, la mano, el problema, el mapa*.",
  },
  {
    grammarSlug: "gender-and-articles",
    kind: "story",
    hook: "Store every noun with its article, in a colour: masculine things **blue**, feminine things **red**.",
    explanation:
      "Learning *mesa* alone means learning the word twice — once for the word, once for the gender. Learning *la mesa* as a single item, pictured in red, means learning it once.",
  },
  {
    grammarSlug: "direct-indirect-pronouns",
    kind: "contrast",
    hook: "**Lo/la** answer *what?* · **le** answers *to whom?* And *le + lo* is impossible — it becomes **se lo**.",
    explanation:
      "'I gave the book to him': the book is *what* (lo), him is *to whom* (le) → *le di el libro* → both as pronouns → *se lo di*. Spanish will not say 'le lo'.",
  },
  {
    grammarSlug: "tener-expressions",
    kind: "story",
    hook: "In Spanish you don't *be* hungry, cold or twenty — you **have** them.",
    explanation:
      "*Tengo hambre*, *tengo frío*, *tengo veinte años*, *tengo razón*. Because they are nouns, they take *mucha* rather than *muy*: *tengo mucha hambre*, never 'muy hambre'.",
  },
  {
    grammarSlug: "si-clauses",
    kind: "contrast",
    hook: "**Never put -ría after *si*.** *Si tuviera…, viajaría* — the -ría goes in the other half.",
    explanation:
      "'Si tendría dinero' is one of the most recognisable learner errors. The *si* clause takes the subjunctive; the conditional lives in the result clause.",
  },
  {
    grammarSlug: "alphabet-and-sounds",
    kind: "story",
    hook: "Five vowels, five sounds, no exceptions: **a-e-i-o-u** = *ah, eh, ee, oh, oo*.",
    explanation:
      "English has around twenty vowel sounds spelled unpredictably; Spanish has five, always the same. Once you trust that, you can pronounce any written Spanish word you have never seen.",
  },
  {
    grammarSlug: "questions-and-negation",
    kind: "contrast",
    hook: "**¿Por qué?** asks (two words, accent). **Porque** answers (one word, none).",
    explanation:
      "The accent marks a question word throughout Spanish: *qué/que*, *dónde/donde*, *cómo/como*. If it is asking, it has a hat on.",
  },
  {
    grammarSlug: "present-perfect",
    kind: "story",
    hook: "Irregular participles worth learning as one line: **escrito, hecho, visto, dicho, puesto, vuelto, abierto, roto, muerto**.",
    explanation:
      "Say them in that order a few times and they stop being exceptions. Everything else is regular *-ado/-ido*.",
  },
];
