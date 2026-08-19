import type { GrammarTopicEntry } from "../types.js";

/** A1 — the foundations: sounds, gender, the present tense, ser and estar. */
export const A1_TOPICS: GrammarTopicEntry[] = [
  {
    slug: "alphabet-and-sounds",
    title: "The alphabet and Spanish sounds",
    levelCode: "A1",
    category: "pronunciation",
    explanation:
      "Spanish spelling is almost perfectly regular: each letter has one sound, and once you know the sounds you can pronounce any written word correctly, even one you have never seen. This is the single biggest advantage Spanish gives a beginner, and it is worth two hours of your time up front.\n\nThe five vowels are short, pure and never change: **a** as in *father*, **e** as in *bet*, **i** as in *machine*, **o** as in *or*, **u** as in *rule*. Unlike English, they never glide into a second sound.",
    whenToUse: "From the first day, and every time you meet a new written word.",
    formula: "one letter → one sound (with h silent, and c/g softening before e/i)",
    examples: [
      { spanish: "casa", english: "house", note: "c before a/o/u is a hard k sound." },
      { spanish: "cena", english: "dinner", note: "c before e/i is 'th' in Spain, 's' in Latin America." },
      { spanish: "hola", english: "hello", note: "h is always silent." },
      { spanish: "perro / pero", english: "dog / but", note: "rr is rolled; a single r is a quick tap. This pair changes meaning." },
      { spanish: "guitarra", english: "guitar", note: "gu before e/i gives a hard g; the u is silent." },
    ],
    mistakes: [
      { wrong: "Pronouncing the h in 'hola'", right: "'ola'", explanation: "h is silent in every Spanish word without exception." },
      { wrong: "Saying 'peh-ro' for perro", right: "'PE-rro' with a rolled r", explanation: "pero means 'but' and perro means 'dog' — the roll is the only difference." },
      { wrong: "Gliding vowels: 'noh-oo' for no", right: "'no'", explanation: "Spanish vowels are pure and never turn into diphthongs." },
    ],
  },
  {
    slug: "gender-and-articles",
    title: "Gender and the articles",
    levelCode: "A1",
    category: "nouns",
    explanation:
      "Every Spanish noun is either masculine or feminine — including objects, which have no logical gender at all. *Mesa* (table) is feminine; *libro* (book) is masculine. There is no reasoning to be done here; the gender is part of the word, and the practical move is to learn every noun with its article attached: not *mesa* but **la mesa**.\n\nMost nouns ending in **-o** are masculine and most ending in **-a** are feminine, which covers a large majority. Nouns in **-ción**, **-sión**, **-dad**, **-tad** and **-umbre** are feminine.",
    whenToUse: "Every time you use a noun — which is every sentence.",
    formula: "el/un + masculine · la/una + feminine · los/unos · las/unas",
    examples: [
      { spanish: "el libro / los libros", english: "the book / the books" },
      { spanish: "la mesa / las mesas", english: "the table / the tables" },
      { spanish: "la ciudad", english: "the city", note: "-dad is always feminine." },
      { spanish: "el problema", english: "the problem", note: "Greek-derived nouns in -ma are masculine despite the -a." },
      { spanish: "el agua fría", english: "the cold water", note: "Feminine, but takes 'el' because it starts with a stressed a- — the adjective still agrees as feminine." },
    ],
    mistakes: [
      { wrong: "la problema", right: "el problema", explanation: "Nouns from Greek in -ma are masculine: el problema, el tema, el sistema." },
      { wrong: "el mano", right: "la mano", explanation: "One of the few -o nouns that is feminine." },
      { wrong: "Learning nouns without the article", right: "Learning 'la mesa', not 'mesa'", explanation: "You will need the gender for every adjective and pronoun that follows." },
    ],
  },
  {
    slug: "subject-pronouns",
    title: "Subject pronouns (and why you usually drop them)",
    levelCode: "A1",
    category: "pronouns",
    explanation:
      "Spanish has subject pronouns — *yo, tú, él/ella/usted, nosotros, vosotros, ellos/ellas/ustedes* — but unlike English it usually leaves them out. The verb ending already tells you who is doing the action, so repeating it sounds heavy and unnatural.\n\nUse the pronoun only for contrast or emphasis: *Yo trabajo, él no* (I work, he doesn't).",
    whenToUse: "For contrast, emphasis, or to clear up genuine ambiguity — otherwise drop it.",
    formula: "yo · tú · él/ella/usted · nosotros/as · vosotros/as · ellos/ellas/ustedes",
    examples: [
      { spanish: "Hablo español.", english: "I speak Spanish.", note: "No 'yo' needed — the -o ending is already first person." },
      { spanish: "Yo hablo español, pero él no.", english: "I speak Spanish, but he doesn't.", note: "Here the pronoun earns its place: it marks a contrast." },
      { spanish: "¿Usted es el señor Ruiz?", english: "Are you Mr. Ruiz?", note: "Usted is kept far more often than tú, as a marker of formality." },
    ],
    mistakes: [
      { wrong: "Yo soy americano y yo vivo en Madrid y yo trabajo aquí.", right: "Soy americano, vivo en Madrid y trabajo aquí.", explanation: "Repeating 'yo' is the single clearest marker of an English speaker's Spanish." },
      { wrong: "Es lloviendo", right: "Está lloviendo / Llueve", explanation: "Weather verbs take no subject at all in Spanish." },
    ],
  },
  {
    slug: "ser",
    title: "Ser — identity and permanence",
    levelCode: "A1",
    category: "verbs",
    explanation:
      "**Ser** is one of Spanish's two verbs for 'to be'. It answers the question *what/who is this thing?* — identity, origin, profession, nationality, material, possession, and time.\n\nIt is irregular and worth memorising cold: **soy, eres, es, somos, sois, son**.",
    whenToUse: "For identity, origin, profession, nationality, material, possession, and telling the time.",
    formula: "soy · eres · es · somos · sois · son",
    examples: [
      { spanish: "Soy estudiante.", english: "I am a student.", note: "Profession — part of who you are. Note there is no 'un'." },
      { spanish: "Es de México.", english: "He is from Mexico.", note: "Origin." },
      { spanish: "La mesa es de madera.", english: "The table is made of wood.", note: "Material." },
      { spanish: "Son las tres.", english: "It's three o'clock.", note: "Time always uses ser." },
      { spanish: "El libro es de María.", english: "The book is María's.", note: "Possession." },
    ],
    mistakes: [
      { wrong: "Soy 20 años", right: "Tengo 20 años", explanation: "Age uses tener ('I have 20 years'), never ser." },
      { wrong: "Soy un estudiante", right: "Soy estudiante", explanation: "Spanish drops the article before an unmodified profession." },
      { wrong: "Soy cansado", right: "Estoy cansado", explanation: "'Soy cansado' means you are a tiresome person. A temporary state takes estar." },
    ],
  },
  {
    slug: "estar",
    title: "Estar — states and location",
    levelCode: "A1",
    category: "verbs",
    explanation:
      "**Estar** is the other 'to be'. It answers *how is this thing right now?* and *where is it?* — temporary states, moods, physical condition, and location.\n\nForms: **estoy, estás, está, estamos, estáis, están**.\n\nA useful memory hook: estar covers **PLACE** (position, location, action, condition, emotion).",
    whenToUse: "For location, temporary states, emotions, and with the -ando/-iendo progressive.",
    formula: "estoy · estás · está · estamos · estáis · están",
    examples: [
      { spanish: "Estoy cansado.", english: "I am tired.", note: "A state, not a permanent trait." },
      { spanish: "Madrid está en España.", english: "Madrid is in Spain.", note: "Location always takes estar — even though a city's location never changes." },
      { spanish: "¿Cómo estás?", english: "How are you?", note: "Asking about the current state." },
      { spanish: "Estamos estudiando.", english: "We are studying.", note: "The progressive is always built with estar." },
      { spanish: "La sopa está fría.", english: "The soup is cold.", note: "It was not always cold — a change of state." },
    ],
    mistakes: [
      { wrong: "Soy en casa", right: "Estoy en casa", explanation: "Location always takes estar." },
      { wrong: "Estoy profesor", right: "Soy profesor", explanation: "A profession is identity, so it takes ser." },
      { wrong: "Está muerto — is that permanent?", right: "Está muerto", explanation: "Death is permanent but still takes estar, because it is the result of a change. 'Permanent vs temporary' is a rough guide, not a law." },
    ],
  },
  {
    slug: "present-tense-regular",
    title: "The present tense: regular verbs",
    levelCode: "A1",
    category: "verbs",
    explanation:
      "Spanish verbs come in three families by their ending: **-ar**, **-er** and **-ir**. Remove that ending from the infinitive and add the endings for the person you mean.\n\nThe Spanish present covers what English splits into three: *hablo* means 'I speak', 'I am speaking' and 'I do speak'.",
    whenToUse: "For habits, general truths, current actions, and even near-future plans.",
    formula: "-ar: o/as/a/amos/áis/an · -er: o/es/e/emos/éis/en · -ir: o/es/e/imos/ís/en",
    examples: [
      { spanish: "Hablo con mi madre todos los domingos.", english: "I speak to my mother every Sunday.", note: "A habit." },
      { spanish: "¿Comes carne?", english: "Do you eat meat?", note: "English needs 'do'; Spanish does not." },
      { spanish: "Vivimos en Sevilla.", english: "We live in Seville." },
      { spanish: "Mañana trabajo desde casa.", english: "Tomorrow I'm working from home.", note: "The present covers scheduled near-future events, exactly as English does.", realWorld: true },
    ],
    mistakes: [
      { wrong: "Yo comer pizza", right: "Yo como pizza / Como pizza", explanation: "The infinitive can never be the main verb of a sentence." },
      { wrong: "Estoy hablar español", right: "Hablo español", explanation: "Do not build the English 'I am ...ing' literally — the simple present already covers it." },
      { wrong: "Nosotros vivimos → nosotros vivemos", right: "vivimos", explanation: "-ir verbs take -imos in the nosotros form, not -emos." },
    ],
  },
  {
    slug: "tener-expressions",
    title: "Tener and the expressions built on it",
    levelCode: "A1",
    category: "verbs",
    explanation:
      "**Tener** means 'to have', but Spanish also uses it for a set of states where English uses 'to be'. These are extremely common and must be learned as fixed phrases.\n\nForms: **tengo, tienes, tiene, tenemos, tenéis, tienen**.",
    whenToUse: "For possession, age, and the fixed states: hunger, thirst, cold, heat, fear, sleepiness, being right.",
    formula: "tener + noun (tener hambre, tener 20 años, tener razón)",
    examples: [
      { spanish: "Tengo dos hermanas.", english: "I have two sisters." },
      { spanish: "Tengo veinte años.", english: "I am twenty years old.", note: "Literally 'I have twenty years'." },
      { spanish: "Tengo hambre.", english: "I'm hungry.", note: "Literally 'I have hunger' — so it takes a noun, never 'muy'." },
      { spanish: "Tienes razón.", english: "You're right." },
      { spanish: "Tengo que estudiar.", english: "I have to study.", note: "tener que + infinitive expresses obligation." },
    ],
    mistakes: [
      { wrong: "Soy hambre", right: "Tengo hambre", explanation: "These states are 'had', not 'been', in Spanish." },
      { wrong: "Estoy muy hambre", right: "Tengo mucha hambre", explanation: "Hambre is a noun, so it takes 'mucha', not 'muy'." },
      { wrong: "Tengo que a estudiar", right: "Tengo que estudiar", explanation: "tener que is followed directly by the infinitive." },
    ],
  },
  {
    slug: "adjective-agreement",
    title: "Adjective agreement and position",
    levelCode: "A1",
    category: "adjectives",
    explanation:
      "Adjectives copy the gender and number of the noun they describe, and they normally come **after** it — the opposite of English.\n\nAdjectives ending in -o have four forms (alto, alta, altos, altas). Those ending in -e or a consonant change only for number (grande/grandes, fácil/fáciles).",
    whenToUse: "Every time you describe a noun.",
    formula: "noun + adjective, matched for gender and number",
    examples: [
      { spanish: "un coche rojo", english: "a red car" },
      { spanish: "una casa roja", english: "a red house" },
      { spanish: "unas casas rojas", english: "some red houses" },
      { spanish: "un hombre inteligente", english: "an intelligent man", note: "-e adjectives do not change for gender." },
      { spanish: "un gran hombre / un hombre grande", english: "a great man / a big man", note: "A few adjectives change meaning depending on position." },
    ],
    mistakes: [
      { wrong: "una roja casa", right: "una casa roja", explanation: "Descriptive adjectives follow the noun in Spanish." },
      { wrong: "las casas rojo", right: "las casas rojas", explanation: "The adjective must match both gender and number." },
      { wrong: "un persona alto", right: "una persona alta", explanation: "Persona is feminine regardless of who it refers to." },
    ],
  },
  {
    slug: "questions-and-negation",
    title: "Asking questions and saying no",
    levelCode: "A1",
    category: "syntax",
    explanation:
      "Spanish questions need no auxiliary verb — no 'do', no 'does'. You either raise your intonation or invert the subject and verb. In writing, questions open with **¿** as well as closing with **?**.\n\nNegation is simpler still: put **no** directly before the verb. And unlike English, Spanish uses double negatives as standard: *No tengo nada* — 'I don't have nothing' — is correct.",
    whenToUse: "Constantly, from your first conversation.",
    formula: "¿ + (question word) + verb + subject ? · no + verb",
    examples: [
      { spanish: "¿Hablas inglés?", english: "Do you speak English?", note: "No auxiliary — just intonation." },
      { spanish: "¿Dónde está el baño?", english: "Where is the bathroom?", note: "The single most useful question you will learn.", realWorld: true },
      { spanish: "No tengo dinero.", english: "I don't have any money." },
      { spanish: "No he visto nada.", english: "I haven't seen anything.", note: "Double negative — required, not an error." },
      { spanish: "¿Por qué no vienes?", english: "Why don't you come?", note: "por qué (two words) asks; porque (one word) answers." },
    ],
    mistakes: [
      { wrong: "¿Haces tú hablar español?", right: "¿Hablas español?", explanation: "There is no 'do' auxiliary in Spanish questions." },
      { wrong: "No tengo algo", right: "No tengo nada", explanation: "After a negative, Spanish requires the negative word." },
      { wrong: "Porque no vienes?", right: "¿Por qué no vienes?", explanation: "'Por qué' asks the question; 'porque' gives the reason." },
    ],
  },
  {
    slug: "near-future",
    title: "The near future: ir a + infinitive",
    levelCode: "A1",
    category: "verbs",
    explanation:
      "The most common way to talk about the future in everyday Spanish is not the future tense at all — it is **ir a + infinitive**, exactly parallel to English 'going to'.",
    whenToUse: "For plans and intentions, and anything you can see coming.",
    formula: "voy/vas/va/vamos/vais/van + a + infinitive",
    examples: [
      { spanish: "Voy a estudiar esta noche.", english: "I'm going to study tonight." },
      { spanish: "¿Qué vas a hacer mañana?", english: "What are you going to do tomorrow?", realWorld: true },
      { spanish: "Va a llover.", english: "It's going to rain." },
      { spanish: "Vamos a ver.", english: "Let's see.", note: "vamos a + infinitive also serves as 'let's'." },
    ],
    mistakes: [
      { wrong: "Voy estudiar", right: "Voy a estudiar", explanation: "The 'a' is obligatory." },
      { wrong: "Voy a a la playa", right: "Voy a la playa", explanation: "With a destination rather than a verb, you need only one 'a'." },
    ],
  },
];
