import type { GrammarTopicEntry } from "../types.js";

/** A2 — the past, the near future, pronouns, and the confusable pairs. */
export const A2_TOPICS: GrammarTopicEntry[] = [
  {
    slug: "preterite",
    title: "The preterite: completed past",
    levelCode: "A2",
    category: "verbs",
    explanation:
      "The preterite reports an action as a finished event: it happened, it ended, and you are telling us about it as a single point on the timeline.\n\nRegular endings: **-ar** → é, aste, ó, amos, asteis, aron. **-er/-ir** → í, iste, ió, imos, isteis, ieron.",
    whenToUse: "For completed actions, sequences of events, and anything with a defined start or end.",
    formula: "hablé · comiste · vivió · hablamos · comisteis · vivieron",
    examples: [
      { spanish: "Ayer comí paella.", english: "Yesterday I ate paella.", note: "A finished event at a specific time." },
      { spanish: "Viví en Madrid tres años.", english: "I lived in Madrid for three years.", note: "Defined duration, so it is closed — preterite, not imperfect." },
      { spanish: "Fui al médico y me dio una receta.", english: "I went to the doctor and he gave me a prescription.", note: "A sequence of completed events." },
      { spanish: "¿Qué hiciste el fin de semana?", english: "What did you do at the weekend?", realWorld: true },
    ],
    mistakes: [
      { wrong: "Ayer comía paella (as a one-off)", right: "Ayer comí paella", explanation: "'Ayer' marks a closed event, so it takes the preterite." },
      { wrong: "Yo fue", right: "Yo fui", explanation: "ser and ir share the same preterite: fui, fuiste, fue." },
      { wrong: "hablé → hablo (no accent)", right: "hablé", explanation: "Without the accent it becomes the present tense: hablo = I speak, hablé = I spoke." },
    ],
  },
  {
    slug: "imperfect",
    title: "The imperfect: the past as a setting",
    levelCode: "A2",
    category: "verbs",
    explanation:
      "The imperfect describes the past rather than reporting it: what things were like, what used to happen, what was going on when something else interrupted.\n\nIt is remarkably regular — only three verbs are irregular in the entire language (ser, ir, ver).",
    whenToUse: "For habits in the past, descriptions, ongoing background action, age, time and weather in the past.",
    formula: "-ar → aba, abas, aba, ábamos, abais, aban · -er/-ir → ía, ías, ía, íamos, íais, ían",
    examples: [
      { spanish: "Cuando era niño, jugaba al fútbol.", english: "When I was a child, I used to play football.", note: "Both a description and a habit." },
      { spanish: "Llovía y hacía frío.", english: "It was raining and it was cold.", note: "Setting the scene." },
      { spanish: "Estudiaba cuando llamaste.", english: "I was studying when you called.", note: "Imperfect for the ongoing action, preterite for the interruption." },
      { spanish: "Eran las diez de la noche.", english: "It was ten at night.", note: "Time in the past is always imperfect." },
    ],
    mistakes: [
      { wrong: "Cuando era niño, jugué al fútbol todos los días", right: "jugaba al fútbol todos los días", explanation: "A repeated habit takes the imperfect." },
      { wrong: "Fue las diez", right: "Eran las diez", explanation: "Telling the time in the past always uses the imperfect." },
    ],
  },
  {
    slug: "reflexive-verbs",
    title: "Reflexive verbs",
    levelCode: "A2",
    category: "verbs",
    explanation:
      "Reflexive verbs carry a pronoun that points the action back at the subject: *lavar* is to wash something, *lavarse* is to wash oneself. Spanish uses them far more widely than English, including for daily routine and for changes of state.",
    whenToUse: "Daily routine, changes of state or mood, and reciprocal actions ('each other').",
    formula: "me/te/se/nos/os/se + conjugated verb",
    examples: [
      { spanish: "Me levanto a las siete.", english: "I get up at seven." },
      { spanish: "Se llama Carlos.", english: "His name is Carlos.", note: "Literally 'he calls himself'." },
      { spanish: "Nos vemos mañana.", english: "See you tomorrow.", note: "Reciprocal: 'we see each other'.", realWorld: true },
      { spanish: "Voy a ducharme. / Me voy a duchar.", english: "I'm going to shower.", note: "With an infinitive the pronoun can attach to the end or move in front — both are correct." },
    ],
    mistakes: [
      { wrong: "Yo levanto a las siete", right: "Me levanto a las siete", explanation: "Without 'me' you are lifting something else up." },
      { wrong: "Me gusta me duchar", right: "Me gusta ducharme", explanation: "The reflexive pronoun attaches to the infinitive." },
    ],
  },
  {
    slug: "direct-indirect-pronouns",
    title: "Object pronouns: lo, la, le",
    levelCode: "A2",
    category: "pronouns",
    explanation:
      "Direct object pronouns (**lo, la, los, las**) replace the thing being acted on. Indirect object pronouns (**le, les**) replace the person receiving it. English uses 'it' and 'him/her' for both, which is why this is a persistent trouble spot.\n\nWhen both appear together, indirect comes first — and **le/les becomes se** before lo/la/los/las.",
    whenToUse: "As soon as the thing you are talking about is already known, to avoid repeating it.",
    formula: "(indirect) me/te/le/nos/os/les + (direct) lo/la/los/las + verb",
    examples: [
      { spanish: "¿El libro? Lo tengo yo.", english: "The book? I've got it.", note: "lo replaces el libro, a masculine direct object." },
      { spanish: "¿La carta? La escribí ayer.", english: "The letter? I wrote it yesterday." },
      { spanish: "Le di el dinero a Juan.", english: "I gave the money to Juan.", note: "le = to Juan, the recipient." },
      { spanish: "Se lo di.", english: "I gave it to him.", note: "le + lo becomes se lo — 'le lo' is impossible in Spanish." },
    ],
    mistakes: [
      { wrong: "Le lo di", right: "Se lo di", explanation: "le/les always becomes se before lo/la/los/las." },
      { wrong: "Yo lo llamé a María", right: "La llamé a María", explanation: "María is feminine, so the direct object pronoun is la." },
      { wrong: "Tengo lo", right: "Lo tengo", explanation: "Object pronouns go before a conjugated verb, not after." },
    ],
  },
  {
    slug: "por-para",
    title: "Por and para",
    levelCode: "A2",
    category: "prepositions",
    explanation:
      "English 'for' splits into two Spanish prepositions. The clean way to hold them apart: **para** points forward to a destination, purpose or deadline; **por** points backward or through — cause, means, exchange, duration, movement through space.",
    whenToUse: "Constantly. This pair is worth deliberate practice rather than intuition.",
    formula: "para → destination, purpose, deadline, recipient · por → cause, exchange, duration, means, through",
    examples: [
      { spanish: "Este regalo es para ti.", english: "This present is for you.", note: "Recipient — it is heading to you." },
      { spanish: "Gracias por el regalo.", english: "Thanks for the present.", note: "Cause — the present is the reason for the thanks." },
      { spanish: "Salgo para Madrid.", english: "I'm leaving for Madrid.", note: "Destination." },
      { spanish: "Pasé por Madrid.", english: "I passed through Madrid.", note: "Movement through." },
      { spanish: "Lo compré por veinte euros.", english: "I bought it for twenty euros.", note: "Exchange." },
      { spanish: "Es para mañana.", english: "It's due tomorrow.", note: "Deadline." },
    ],
    mistakes: [
      { wrong: "Gracias para todo", right: "Gracias por todo", explanation: "Thanks are always 'por' — the thing is the cause of your gratitude." },
      { wrong: "Estudio para ser médico — or por?", right: "para ser médico", explanation: "Purpose looks forward, so it takes para." },
      { wrong: "Trabajo para una empresa por dos años", right: "Trabajo para una empresa desde hace dos años", explanation: "Duration up to now uses desde hace, not por." },
    ],
  },
  {
    slug: "saber-conocer",
    title: "Saber and conocer",
    levelCode: "A2",
    category: "verbs",
    explanation:
      "English 'know' covers two different things. **Saber** is knowing information or how to do something. **Conocer** is being acquainted with a person, place or work.",
    whenToUse: "Whenever you would say 'know' in English — stop and decide which one you mean.",
    formula: "saber + fact / + infinitive · conocer + person / place / work",
    examples: [
      { spanish: "Sé que vive en Madrid.", english: "I know he lives in Madrid.", note: "A fact." },
      { spanish: "Sé nadar.", english: "I know how to swim.", note: "saber + infinitive = to know how to. No word for 'how' is needed." },
      { spanish: "Conozco a su hermana.", english: "I know his sister.", note: "Acquaintance. Note the personal 'a' before a person." },
      { spanish: "No conozco Barcelona.", english: "I don't know Barcelona (have never been).", note: "Familiarity with a place." },
    ],
    mistakes: [
      { wrong: "Conozco que es tarde", right: "Sé que es tarde", explanation: "Facts take saber." },
      { wrong: "Sé a tu hermano", right: "Conozco a tu hermano", explanation: "People take conocer." },
      { wrong: "Sé cómo nadar", right: "Sé nadar", explanation: "saber alone already means 'know how to'." },
    ],
  },
  {
    slug: "bien-bueno",
    title: "Bien and bueno",
    levelCode: "A2",
    category: "adjectives",
    explanation:
      "**Bueno** is an adjective — it describes a noun and changes form to agree with it. **Bien** is an adverb — it describes how something is done and never changes. The same split applies to **malo** and **mal**.",
    whenToUse: "Whenever you want to say 'good' or 'well'.",
    formula: "bueno/a/os/as + noun · verb + bien",
    examples: [
      { spanish: "Es un buen libro.", english: "It's a good book.", note: "Describing a noun. bueno shortens to buen before a masculine singular noun." },
      { spanish: "Habla bien español.", english: "He speaks Spanish well.", note: "Describing how the action is done." },
      { spanish: "La comida está buena.", english: "The food tastes good.", note: "With estar, bueno describes how it tastes right now." },
      { spanish: "Estoy bien.", english: "I'm well / I'm fine.", note: "Never 'estoy bueno' — that means you are attractive." },
    ],
    mistakes: [
      { wrong: "Estoy bueno", right: "Estoy bien", explanation: "'Estoy bueno' colloquially means 'I'm good-looking'." },
      { wrong: "Habla bueno español", right: "Habla bien español", explanation: "Modifying a verb requires the adverb." },
      { wrong: "Es un bueno hombre", right: "Es un buen hombre", explanation: "bueno drops the -o before a masculine singular noun." },
    ],
  },
  {
    slug: "haber-tener",
    title: "Haber and tener",
    levelCode: "A2",
    category: "verbs",
    explanation:
      "Both can translate as 'have', but they do completely different jobs. **Tener** expresses possession. **Haber** is an auxiliary — it builds compound tenses (*he comido*) — and in its impersonal form **hay** it means 'there is / there are'.\n\n**hay** never changes for number: *hay un libro*, *hay tres libros*.",
    whenToUse: "tener for what you own; hay for what exists; he/has/ha + participle for the perfect.",
    formula: "tener + noun · hay + noun · haber + participle",
    examples: [
      { spanish: "Tengo un coche.", english: "I have a car.", note: "Possession." },
      { spanish: "Hay un coche en la calle.", english: "There's a car in the street.", note: "Existence." },
      { spanish: "Hay muchos coches.", english: "There are lots of cars.", note: "hay is invariable — never 'han'." },
      { spanish: "He comido ya.", english: "I've already eaten.", note: "Auxiliary use." },
    ],
    mistakes: [
      { wrong: "Han muchos coches", right: "Hay muchos coches", explanation: "The impersonal 'hay' is invariable regardless of what follows." },
      { wrong: "Tengo que hay tiempo", right: "Hay tiempo", explanation: "Existence takes hay on its own." },
      { wrong: "Tengo comido", right: "He comido", explanation: "Compound tenses are built with haber, never tener." },
    ],
  },
  {
    slug: "commands",
    title: "Commands (the imperative)",
    levelCode: "A2",
    category: "verbs",
    explanation:
      "Affirmative **tú** commands use the third-person present form (*habla*, *come*). Everything else — negative commands, and all usted/ustedes commands — uses the subjunctive.\n\nEight verbs have irregular affirmative tú commands: di, haz, ve, pon, sal, sé, ten, ven.",
    whenToUse: "Instructions, directions, recipes, and asking someone to do something.",
    formula: "tú: 3rd person present · negative & formal: subjunctive",
    examples: [
      { spanish: "Habla más despacio, por favor.", english: "Speak more slowly, please.", realWorld: true },
      { spanish: "No hables tan rápido.", english: "Don't speak so fast.", note: "Negative commands switch to the subjunctive." },
      { spanish: "Siga recto y gire a la derecha.", english: "Go straight on and turn right.", note: "Formal usted commands — how you will actually receive directions.", realWorld: true },
      { spanish: "Dime.", english: "Tell me.", note: "Irregular command with the pronoun attached." },
    ],
    mistakes: [
      { wrong: "No habla tan rápido", right: "No hables tan rápido", explanation: "Negative tú commands use the subjunctive form." },
      { wrong: "Me dime", right: "Dime", explanation: "Pronouns attach to the end of affirmative commands." },
    ],
  },
];
