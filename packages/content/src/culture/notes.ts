import type { CultureNoteEntry } from "../types.js";

/**
 * Culture (§14).
 *
 * Culture is taught alongside the language, not as a separate appendix, and
 * Spain and Latin America are given equal standing. Where usage differs, both
 * are presented as correct — because both are.
 */
export const CULTURE_NOTES: CultureNoteEntry[] = [
  {
    slug: "spain-vs-latin-america-vocabulary",
    title: "Spain or Latin America: the words that differ",
    levelCode: "A1",
    region: "both",
    topic: "language",
    body:
      "The same object often has two perfectly correct names.\n\n| Spain | Latin America |\n|---|---|\n| el coche | el carro / el auto |\n| el ordenador | la computadora |\n| el móvil | el celular |\n| la patata | la papa |\n| el zumo | el jugo |\n| vosotros habláis | ustedes hablan |\n\nNeither column is more correct. The one difference that genuinely matters in practice: **vosotros** is used only in Spain, and everywhere else **ustedes** covers both formal and informal plural 'you'. If you learn only *ustedes*, you will be understood everywhere including Spain.",
  },
  {
    slug: "the-two-surnames",
    title: "Why Spanish speakers have two surnames",
    levelCode: "A1",
    region: "both",
    topic: "daily_life",
    body:
      "Ana García López is Ana, daughter of a García and a López — father's surname first, mother's second. She keeps both when she marries; there is no taking a spouse's name.\n\nIn everyday use, only the **first** surname counts: she is Señora García, and she is filed under G. Foreigners routinely file her under 'López', which is the equivalent of filing 'John Smith Brown' under 'Brown'.",
  },
  {
    slug: "spanish-mealtimes",
    title: "Eating on Spanish time",
    levelCode: "A1",
    region: "spain",
    topic: "food",
    place: "España",
    body:
      "Spanish daily rhythm runs later than almost anywhere else in Europe. Breakfast is small — coffee and a *tostada*. **Lunch is the main meal**, eaten between 2 and 3pm, and often includes a *menú del día*: three courses plus bread and a drink for around €12–15, on weekdays.\n\nDinner is late and light, from 9pm, and 10pm is entirely normal in summer. Arriving at a restaurant at 7pm means eating alone.\n\nThe *siesta* as a nap is largely a myth for working adults; what is real is that many small shops close from roughly 2 to 5pm.",
  },
  {
    slug: "tapas-culture",
    title: "Tapas: the rules nobody tells you",
    levelCode: "A2",
    region: "spain",
    topic: "food",
    place: "España",
    body:
      "*Tapear* means moving between bars, one drink and one small plate at each — not sitting in one place all evening.\n\nIn **Granada and León**, a tapa comes free with every drink and you do not choose it. In most of the rest of Spain you order and pay for them. A *ración* is a full plate to share; a *media ración* is half.\n\nYou usually order at the bar rather than waiting to be served, and you pay when you leave. Tipping is not expected — leaving small change is generous.",
  },
  {
    slug: "day-of-the-dead",
    title: "El Día de Muertos",
    levelCode: "A2",
    region: "latin_america",
    topic: "tradition",
    place: "México",
    body:
      "On 1–2 November, Mexican families build *ofrendas* — altars with photographs, marigolds (*cempasúchil*), candles, and the food and drink the dead person liked. Families spend the night in cemeteries, cleaning graves and talking.\n\nIt is emphatically **not** a Mexican Halloween. The tone is affectionate and often funny — *calaveritas* are satirical verses written about people who are still alive. UNESCO lists it as intangible cultural heritage.",
  },
  {
    slug: "spanish-cinema",
    title: "Where to start with Spanish-language film",
    levelCode: "B1",
    region: "both",
    topic: "film",
    body:
      "For listening practice with real speech:\n\n**Spain** — *Todo sobre mi madre* and *Volver* (Almodóvar); *El laberinto del fauno* (del Toro, Spanish-Mexican); the series *La casa de papel* for fast colloquial Madrid Spanish.\n**Mexico** — *Roma* (Cuarón), quiet and slow, unusually good for learners; *Amores perros* for hard, fast street Spanish.\n**Argentina** — *El secreto de sus ojos*, and any of it for *voseo* in the wild.\n**Chile** — *Una mujer fantástica*.\n\nWatch with **Spanish** subtitles rather than English ones. English subtitles let you read instead of listen, and the gain drops to almost nothing.",
  },
  {
    slug: "usted-across-regions",
    title: "How formal is formal? Usted around the Spanish-speaking world",
    levelCode: "B1",
    region: "both",
    topic: "language",
    body:
      "The tú/usted line moves depending on where you are.\n\n**Spain** — informal by European standards. A shop assistant of your own age will use *tú* immediately, and *usted* can even sound distancing with someone under forty.\n**Colombia and Costa Rica** — *usted* is used widely, including between friends and sometimes within families.\n**Argentina, Uruguay, Paraguay** — *tú* is replaced by **vos**, with its own forms: *vos tenés*, *vos sos*, *vos querés*.\n**Mexico** — roughly in the middle; *usted* for older people and in service situations.\n\nThe safe strategy anywhere: start with *usted* with adult strangers and follow their lead.",
  },
  {
    slug: "spanish-slang-basics",
    title: "Slang you will actually hear",
    levelCode: "B1",
    region: "both",
    topic: "slang",
    body:
      "**Spain**: *vale* (OK), *tío/tía* (mate), *guay* (cool), *flipar* (to be amazed), *currar* (to work), *estar hasta las narices* (to be fed up).\n**Mexico**: *güey* (dude), *chido* (cool), *ahorita* (in a moment — or never), *¿mande?* (sorry, what?).\n**Argentina**: *che* (hey), *quilombo* (a mess), *laburar* (to work), *copado* (cool).\n\nThe one word to be careful with: **coger**. In Spain it neutrally means 'to take' — *coger el autobús*. In Mexico, Argentina and much of Latin America it is obscene. Use *tomar* or *agarrar* and you are safe everywhere.",
  },
  {
    slug: "latin-american-music",
    title: "Music as listening practice",
    levelCode: "A2",
    region: "latin_america",
    topic: "music",
    body:
      "Music is the least effortful listening practice there is, and different genres suit different stages.\n\n**Slow and clear**: Jorge Drexler (Uruguay), Silvio Rodríguez (Cuba), Natalia Lafourcade (Mexico) — sung slowly, clearly articulated, poetic but comprehensible.\n**Mid-tempo**: Juanes, Shakira's Spanish albums, Rosalía's earlier flamenco work.\n**Hard mode**: reggaetón and Spanish rap — heavy slang, fast delivery, and regional pronunciation that drops consonants.\n\nRead the lyrics once, listen without them twice, then check what you missed.",
  },
  {
    slug: "history-of-spanish",
    title: "Why Spanish sounds the way it does",
    levelCode: "B2",
    region: "both",
    topic: "history",
    body:
      "Spanish descends from the Latin of Roman soldiers, not from classical literary Latin — which is why it is closer to spoken Latin than to Cicero.\n\nEight centuries of Al-Andalus left around 4,000 words of Arabic origin, most beginning with *al-*: *almohada*, *azúcar*, *aceite*, *ojalá* (from *wa-šā' allāh*, 'God willing') — which is why *ojalá* takes the subjunctive to this day.\n\nThe 1492 unification and the voyage to the Americas happened in the same year, which is why American Spanish preserves features that later disappeared from Spain — including *ustedes* for all plural 'you' and the seseo pronunciation of c/z.",
  },
];
