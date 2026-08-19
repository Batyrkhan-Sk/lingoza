import type { GrammarContrastEntry } from "../types.js";

/**
 * The explicit contrasts (§5).
 *
 * These are the pairs where English maps one word onto two Spanish ones, which
 * is where nearly all persistent learner errors live. Each is modelled as a
 * real comparison table rather than prose, so the UI can render it side by side
 * and the daily planner can prescribe one dimension at a time.
 */
export const GRAMMAR_CONTRASTS: GrammarContrastEntry[] = [
  {
    slug: "ser-vs-estar",
    title: "ser vs estar",
    summary: "Ser tells you what something IS; estar tells you how or where it IS RIGHT NOW.",
    detail:
      "The usual shorthand — permanent versus temporary — gets you most of the way but breaks on the edges. 'Está muerto' (he is dead) is permanent and still takes estar, because death is the *result of a change*. The more reliable test: ser defines the thing itself; estar describes its current condition or position.\n\nSome adjectives take both and change meaning entirely: es aburrido (he is boring) / está aburrido (he is bored); es listo (he is clever) / está listo (he is ready).",
    topicASlug: "ser",
    labelA: "ser",
    topicBSlug: "estar",
    labelB: "estar",
    rows: [
      { dimension: "Identity vs state", sideA: "What something fundamentally is", sideB: "What condition it is in now", exampleA: "Soy profesor.", exampleB: "Estoy cansado." },
      { dimension: "Origin vs location", sideA: "Where someone is from", sideB: "Where something is", exampleA: "Soy de Perú.", exampleB: "Estoy en Perú." },
      { dimension: "Description", sideA: "Inherent characteristic", sideB: "Result of a change", exampleA: "La manzana es verde. (a green variety)", exampleB: "La manzana está verde. (not yet ripe)" },
      { dimension: "Time", sideA: "Always ser", sideB: "Never estar", exampleA: "Son las tres.", exampleB: "—" },
      { dimension: "Progressive", sideA: "Never ser", sideB: "Always estar", exampleA: "—", exampleB: "Estoy comiendo." },
      { dimension: "Meaning shift", sideA: "es aburrido = he is boring", sideB: "está aburrido = he is bored", exampleA: "El libro es aburrido.", exampleB: "Estoy aburrido." },
    ],
  },
  {
    slug: "por-vs-para",
    title: "por vs para",
    summary: "Para points forward to a goal; por points back to a cause or through a means.",
    detail:
      "Draw an arrow. **Para** is the arrowhead — where this is heading: the recipient, the purpose, the deadline, the destination. **Por** is the shaft — what it passed through to get here: the reason, the exchange, the route, the duration, the agent.",
    topicASlug: "por-para",
    labelA: "para",
    topicBSlug: "por-para",
    labelB: "por",
    rows: [
      { dimension: "Purpose vs cause", sideA: "In order to (goal)", sideB: "Because of (reason)", exampleA: "Estudio para aprobar.", exampleB: "Lo hice por ti." },
      { dimension: "Recipient vs thanks", sideA: "Destined for someone", sideB: "In return / in exchange", exampleA: "Es para ti.", exampleB: "Gracias por el regalo." },
      { dimension: "Destination vs route", sideA: "Heading to", sideB: "Passing through", exampleA: "Salgo para Madrid.", exampleB: "Paso por Madrid." },
      { dimension: "Deadline vs duration", sideA: "By a time", sideB: "For a stretch of time", exampleA: "Es para el lunes.", exampleB: "Estudié por tres horas." },
      { dimension: "Opinion vs exchange", sideA: "In someone's view", sideB: "Price paid", exampleA: "Para mí, es un error.", exampleB: "Lo compré por 20 euros." },
    ],
  },
  {
    slug: "saber-vs-conocer",
    title: "saber vs conocer",
    summary: "Saber = know a fact or how to do something. Conocer = be acquainted with a person, place or work.",
    detail:
      "If you could follow 'know' with 'that…' or 'how to…', it is saber. If you could follow it with 'personally' or 'been there', it is conocer.\n\nIn the preterite both shift meaning: *supe* = I found out; *conocí* = I met (for the first time).",
    topicASlug: "saber-conocer",
    labelA: "saber",
    topicBSlug: "saber-conocer",
    labelB: "conocer",
    rows: [
      { dimension: "Object", sideA: "Facts, information", sideB: "People, places, works", exampleA: "Sé su número.", exampleB: "Conozco a su hermano." },
      { dimension: "With a verb", sideA: "saber + infinitive = know how to", sideB: "not used this way", exampleA: "Sé conducir.", exampleB: "—" },
      { dimension: "In the preterite", sideA: "supe = I found out", sideB: "conocí = I met", exampleA: "Supe la verdad ayer.", exampleB: "La conocí en 2019." },
    ],
  },
  {
    slug: "bien-vs-bueno",
    title: "bien vs bueno",
    summary: "Bueno describes a noun and agrees with it; bien describes a verb and never changes.",
    detail:
      "The same split governs mal/malo. If you can replace the word with 'good' before a noun, use bueno; if you mean 'well' after a verb, use bien.\n\nWatch the trap: *estoy bien* means I'm fine, while *estoy bueno* means I'm good-looking.",
    topicASlug: "bien-bueno",
    labelA: "bueno (adjective)",
    topicBSlug: "bien-bueno",
    labelB: "bien (adverb)",
    rows: [
      { dimension: "What it modifies", sideA: "A noun", sideB: "A verb", exampleA: "Es un buen libro.", exampleB: "Escribe bien." },
      { dimension: "Agreement", sideA: "Changes: bueno/a/os/as", sideB: "Never changes", exampleA: "Son buenas ideas.", exampleB: "Cantan bien." },
      { dimension: "With estar", sideA: "está bueno = tastes good / is attractive", sideB: "está bien = is fine", exampleA: "La paella está buena.", exampleB: "Todo está bien." },
    ],
  },
  {
    slug: "preterite-vs-imperfect",
    title: "preterite vs imperfect",
    summary: "The preterite reports what happened; the imperfect describes what was going on.",
    detail:
      "Think of a film. The **imperfect** is the set, the weather, the costumes, and anything that was already in motion when the camera started. The **preterite** is the plot: the events that advance the story.\n\nThis is why an interrupted action pairs them: *Estudiaba* (background, imperfect) *cuando llamaste* (event, preterite).",
    topicASlug: "preterite",
    labelA: "preterite",
    topicBSlug: "imperfect",
    labelB: "imperfect",
    rows: [
      { dimension: "Role", sideA: "Events that move the story", sideB: "Background and description", exampleA: "Se levantó y salió.", exampleB: "Hacía frío y llovía." },
      { dimension: "Repetition", sideA: "A counted number of times", sideB: "Habitual, uncounted", exampleA: "Fui tres veces.", exampleB: "Iba todos los veranos." },
      { dimension: "Boundaries", sideA: "Defined start or end", sideB: "No boundaries in view", exampleA: "Viví allí dos años.", exampleB: "Vivía allí cuando era joven." },
      { dimension: "Together", sideA: "The interruption", sideB: "What was interrupted", exampleA: "…cuando sonó el teléfono.", exampleB: "Dormía…" },
      { dimension: "Meaning shift", sideA: "supe = found out · quise = tried", sideB: "sabía = knew · quería = wanted", exampleA: "Quise abrirlo. (I tried)", exampleB: "Quería abrirlo. (I wanted to)" },
    ],
  },
  {
    slug: "indicative-vs-subjunctive",
    title: "indicative vs subjunctive",
    summary: "The indicative asserts something as real; the subjunctive declines to assert it.",
    detail:
      "Every subjunctive rule you will be taught is a special case of this. Wishes, doubts, emotions and unrealised events all share one property: the speaker is not putting the clause forward as fact.\n\nThe clearest proof is the minimal pair with 'creer': *creo que es verdad* (I assert it) versus *no creo que sea verdad* (I decline to).",
    topicASlug: "present-tense-regular",
    labelA: "indicative",
    topicBSlug: "present-subjunctive",
    labelB: "subjunctive",
    rows: [
      { dimension: "Speaker's stance", sideA: "Asserted as real", sideB: "Not asserted", exampleA: "Sé que viene.", exampleB: "Espero que venga." },
      { dimension: "After creer", sideA: "Affirmative → indicative", sideB: "Negative → subjunctive", exampleA: "Creo que es verdad.", exampleB: "No creo que sea verdad." },
      { dimension: "Time clauses", sideA: "Habitual or past → indicative", sideB: "Future → subjunctive", exampleA: "Cuando llego, como.", exampleB: "Cuando llegue, comeré." },
      { dimension: "Known vs sought", sideA: "A specific known thing", sideB: "Anything meeting a description", exampleA: "Busco al hombre que habla ruso.", exampleB: "Busco un hombre que hable ruso." },
    ],
  },
  {
    slug: "lo-la-le",
    title: "lo vs la vs le",
    summary: "lo/la replace the thing acted on; le replaces the person it is done to or for.",
    detail:
      "Test it in English: if the noun answers 'what?' after the verb, it is direct (lo/la). If it answers 'to whom?' or 'for whom?', it is indirect (le).\n\n*Le di el libro* — the book is direct, the person is indirect. When both become pronouns: *Se lo di*, because le+lo is impossible.\n\nIn much of Spain, **le** is also used for a masculine person as a direct object (*le vi* rather than *lo vi*). This is 'leísmo' — accepted by the Real Academia for masculine people only, and standard in Madrid.",
    topicASlug: "direct-indirect-pronouns",
    labelA: "lo / la (direct)",
    topicBSlug: "direct-indirect-pronouns",
    labelB: "le (indirect)",
    rows: [
      { dimension: "Question answered", sideA: "What? Whom?", sideB: "To/for whom?", exampleA: "Lo compré. (the book)", exampleB: "Le compré un libro. (for him)" },
      { dimension: "Gender", sideA: "Marks gender: lo/la", sideB: "No gender: le for both", exampleA: "La vi. (her)", exampleB: "Le hablé. (to him or her)" },
      { dimension: "Together", sideA: "goes second", sideB: "goes first, becoming se", exampleA: "Se lo di.", exampleB: "Se lo di." },
      { dimension: "Regional", sideA: "lo vi (Latin America, standard)", sideB: "le vi (Spain, leísmo)", exampleA: "Lo vi ayer.", exampleB: "Le vi ayer." },
    ],
  },
  {
    slug: "haber-vs-tener",
    title: "haber vs tener",
    summary: "Tener is to possess; haber builds compound tenses and, as 'hay', means 'there is/are'.",
    detail:
      "They translate the same English word but never overlap in use. The one thing to drill: **hay is invariable**. There is no plural form, so 'there are many cars' is *hay muchos coches*, never 'han'.",
    topicASlug: "haber-tener",
    labelA: "tener",
    topicBSlug: "haber-tener",
    labelB: "haber",
    rows: [
      { dimension: "Core meaning", sideA: "To possess", sideB: "Auxiliary / existence", exampleA: "Tengo un coche.", exampleB: "Hay un coche." },
      { dimension: "Compound tenses", sideA: "Never", sideB: "Always", exampleA: "—", exampleB: "He comido." },
      { dimension: "Agreement", sideA: "Agrees with subject", sideB: "hay never changes", exampleA: "Tenemos tiempo.", exampleB: "Hay muchos problemas." },
      { dimension: "Obligation", sideA: "tener que + inf (personal)", sideB: "hay que + inf (impersonal)", exampleA: "Tengo que ir.", exampleB: "Hay que ir." },
    ],
  },
];
