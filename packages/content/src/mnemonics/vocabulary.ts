import type { WordMnemonicEntry } from "../types.js";

/**
 * Curated keyword mnemonics for words that resist ordinary learning.
 *
 * Deliberately not exhaustive. Most vocabulary does not need a hook — cognates
 * and high-frequency function words are learned faster by simply meeting them
 * repeatedly, and attaching an image to *hola* would be busywork.
 *
 * What is here are the words that genuinely trip English speakers up:
 * false friends, arbitrary gender, and words with no phonetic handle at all.
 * Anything else, the learner can generate a personal hook for on demand — and
 * a self-generated image beats a borrowed one anyway.
 */
export const WORD_MNEMONICS: WordMnemonicEntry[] = [
  // ─── Words with no obvious handle ──────────────────────────────────────────
  {
    spanish: "el perro",
    kind: "keyword",
    keyword: "PAIR-oh",
    imagery: "A **pair** of identical dogs rolling their Rs at each other.",
    hook: "A **pair** of dogs — *perro* has the rolled rr, *pero* (but) does not.",
    explanation:
      "This one earns a hook because the rolled R is the only thing separating 'dog' from 'but'. Getting it wrong changes the sentence.",
  },
  {
    spanish: "la mesa",
    kind: "keyword",
    keyword: "mess-a",
    imagery: "A table covered in such a **mess** you cannot see the wood.",
    hook: "A **mess** on the *mesa*.",
  },
  {
    spanish: "el queso",
    kind: "keyword",
    keyword: "K-so",
    imagery: "A giant letter **K** made entirely of cheese, wearing a **sombrero**.",
    hook: "**K**-so — the cheesy letter K.",
  },
  {
    spanish: "la cabeza",
    kind: "keyword",
    keyword: "cab-eza",
    imagery: "You hail a **cab** and the driver has an enormous **head** filling the windscreen.",
    hook: "The **cab** driver's giant **head**.",
  },
  {
    spanish: "el caballo",
    kind: "keyword",
    keyword: "cab-eye-oh",
    imagery: "A **horse** driving a yellow **cab**, winking one enormous **eye**.",
    hook: "A **cab**-driving horse.",
  },
  {
    spanish: "la llave",
    kind: "keyword",
    keyword: "YA-veh",
    imagery: "You unlock a door and shout **'ya!'** as a wave of water pours out.",
    hook: "**Ya!** — the key that opens the wave. (ll sounds like 'y'.)",
    explanation: "Doubles as a reminder that **ll** is pronounced 'y' in most of the Spanish-speaking world.",
  },
  {
    spanish: "el pan",
    kind: "keyword",
    keyword: "pan",
    imagery: "A frying **pan** with a whole loaf of **bread** sizzling in it.",
    hook: "**Bread** in a **pan**.",
  },
  {
    spanish: "la leche",
    kind: "keyword",
    keyword: "LETCH-eh",
    imagery: "A cow drinking **milk** through a **letterbox**.",
    hook: "**Letch**-e — milk through the letterbox.",
  },
  {
    spanish: "el reloj",
    kind: "keyword",
    keyword: "re-LOH",
    imagery: "You **re-load** your watch like a rifle every hour.",
    hook: "**Re-lo**ad the watch.",
    explanation: "The final -j is barely pronounced in Spain — closer to 'reló'.",
  },
  {
    spanish: "el zapato",
    kind: "keyword",
    keyword: "zap-ato",
    imagery: "A **shoe** that **zaps** you with electricity when you put it on.",
    hook: "The shoe that **zaps**.",
  },

  // ─── False friends — where a hook prevents a real mistake ──────────────────
  {
    spanish: "embarazada",
    kind: "contrast",
    hook: "*Embarazada* means **pregnant**, not embarrassed.",
    imagery: "Someone announcing a pregnancy and everyone in the room going red instead of them.",
    explanation:
      "The genuinely embarrassing false friend. Embarrassed is *avergonzado*. 'Estoy embarazada' from a man is a memorable mistake.",
  },
  {
    spanish: "la librería",
    kind: "contrast",
    hook: "*Librería* is a **bookshop** — you pay. A library is *la biblioteca* — you don't.",
    imagery: "A shop assistant refusing to let you leave with a book until you pay.",
  },
  {
    spanish: "actualmente",
    kind: "contrast",
    hook: "*Actualmente* = **currently**, not 'actually'.",
    imagery: "A clock face where the hands spell the word NOW.",
    explanation: "'Actually' is *en realidad* or *de hecho*.",
  },
  {
    spanish: "asistir",
    kind: "contrast",
    hook: "*Asistir* = to **attend**, not to assist.",
    imagery: "Sitting in the audience of a lecture — you *assist* by simply being **seated** there.",
    explanation: "To assist is *ayudar*.",
  },
  {
    spanish: "el éxito",
    kind: "contrast",
    hook: "*Éxito* = **success**, not exit.",
    imagery: "Walking through an **exit** door onto a stage to thunderous applause.",
    explanation: "An exit is *la salida* — which you will see on every Spanish motorway.",
  },
  {
    spanish: "sensible",
    kind: "contrast",
    hook: "*Sensible* = **sensitive**, not sensible.",
    imagery: "Someone bursting into tears at a sensible spreadsheet.",
    explanation: "Sensible (level-headed) is *sensato*.",
  },
  {
    spanish: "molestar",
    kind: "contrast",
    hook: "*Molestar* just means to **bother**.",
    imagery: "A fly bothering someone at a picnic — irritating, nothing worse.",
    explanation: "'No te molestes' means 'don't trouble yourself', and is entirely innocent.",
  },
  {
    spanish: "la carpeta",
    kind: "contrast",
    hook: "*Carpeta* = **folder**, not carpet.",
    imagery: "A folder lying where the carpet should be, and everyone wiping their feet on it.",
    explanation: "A carpet is *la alfombra*.",
  },
  {
    spanish: "constipado",
    kind: "contrast",
    hook: "*Estoy constipado* = I have a **cold**.",
    imagery: "Someone sneezing into a tissue, blocked up at the *nose*, not anywhere else.",
    explanation: "A genuinely useful one to know before visiting a Spanish pharmacy.",
  },

  // ─── Gender hooks for the classic exceptions ──────────────────────────────
  {
    spanish: "el día",
    kind: "gender",
    hook: "*El día* is masculine despite the -a.",
    imagery: "The sun — a big masculine ball of fire — sitting on top of the letter A.",
    explanation: "One of the small set of -a nouns that are masculine, alongside *el mapa*, *el problema*, *el sofá*.",
  },
  {
    spanish: "la mano",
    kind: "gender",
    hook: "*La mano* is feminine despite the -o.",
    imagery: "A hand wearing a delicate red glove, reaching out of the letter O.",
    explanation: "The most common -o noun that is feminine. *La foto* and *la moto* follow, because they are shortenings of *fotografía* and *motocicleta*.",
  },
  {
    spanish: "el agua",
    kind: "gender",
    hook: "*El agua* takes 'el' but is feminine — *el agua fría*.",
    imagery: "Cold water in a glass labelled with a masculine 'el' sticker peeling off to show 'la' underneath.",
    explanation:
      "Feminine nouns starting with a stressed *a-* take *el* to avoid two a-sounds colliding. The adjective still agrees as feminine: *el agua clara*, *el águila blanca*.",
  },
  {
    spanish: "el problema",
    kind: "gender",
    hook: "Greek -ma words are masculine: *el problema*, *el tema*, *el sistema*, *el idioma*.",
    imagery: "A row of Greek columns, each with a masculine statue holding a sign ending in -MA.",
  },

  // ─── Verbs that resist ────────────────────────────────────────────────────
  {
    spanish: "gustar",
    kind: "story",
    hook: "*Gustar* works backwards: the thing is the subject. *Me gusta el café* = 'coffee is pleasing to me'.",
    imagery: "Coffee reaching up and shaking your hand, introducing itself as pleasant.",
    explanation:
      "Once you hear it as 'is pleasing to me', the plural stops being confusing: *me gustan los churros* — churros (plural) are pleasing.",
  },
  {
    spanish: "doler",
    kind: "story",
    hook: "*Doler* works like *gustar*: *me duele la cabeza* = 'the head hurts to me'.",
    imagery: "Your head detaching itself and hitting you, apologetically.",
    explanation:
      "So the body part decides the ending: *me duele la cabeza*, *me duelen los pies*. And use the article, not a possessive.",
  },
  {
    spanish: "hacer",
    kind: "keyword",
    keyword: "ah-SER",
    imagery: "A magician says **'ah, sir!'** and *makes* a rabbit appear.",
    hook: "**Ah, sir!** — and it's made.",
  },
];
