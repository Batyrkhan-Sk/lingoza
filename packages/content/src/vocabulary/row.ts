import type { CefrLevel } from "@lingoza/engine";
import type { VocabularyEntry } from "../types.js";

/**
 * The compact authoring format for vocabulary.
 *
 * Words are written as positional rows rather than full objects: a level file
 * of 100 words stays readable on one screen, and a missing field is visible at
 * a glance. `expand()` turns rows into full entries, deriving what can be
 * derived (plurals, frequency rank, difficulty) instead of making the author
 * repeat it.
 */
export type Row = [
  spanish: string,
  english: string,
  pronunciation: string,
  partOfSpeech: string,
  gender: "m" | "f" | "mf" | null,
  topic: string,
  example: string,
  exampleTranslation: string,
  extras?: Partial<VocabularyEntry>,
];

/**
 * Spanish plural formation. Covers the productive rules; anything that does
 * not follow them is given explicitly in a row's extras.
 */
export function pluralize(word: string, partOfSpeech: string): string | null {
  if (!["noun", "adjective"].includes(partOfSpeech)) return null;
  if (word.includes(" ")) return null;

  const last = word.slice(-1);
  const lastTwo = word.slice(-2);

  // -z → -ces (lápiz → lápices), dropping the accent when stress shifts.
  if (last === "z") return `${removeAccent(word.slice(0, -1))}ces`;

  // Unstressed vowel → +s
  if ("aeiou".includes(last)) return `${word}s`;

  // Stressed final í/ú take -es in careful usage (marroquí → marroquíes).
  if (lastTwo === "í" || lastTwo === "ú") return `${word}es`;

  // Consonant → +es, removing a final accent (canción → canciones).
  return `${removeAccent(word)}es`;
}

function removeAccent(word: string): string {
  // Only the final accented vowel loses its mark when a syllable is added.
  return word.replace(/([áéíóú])([^áéíóú]*)$/, (_, vowel: string, tail: string) => {
    const plain: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };
    return `${plain[vowel] ?? vowel}${tail}`;
  });
}

export function expand(rows: Row[], levelCode: CefrLevel, startRank: number): VocabularyEntry[] {
  return rows.map((row, index) => {
    const [spanish, english, pronunciation, partOfSpeech, gender, topic, example, translation, extras] = row;
    return {
      spanish,
      english,
      pronunciation,
      exampleSentence: example,
      exampleTranslation: translation,
      partOfSpeech,
      gender,
      topic,
      levelCode,
      difficulty: extras?.difficulty ?? defaultDifficulty(levelCode),
      pluralForm: extras?.pluralForm ?? pluralize(spanish, partOfSpeech),
      frequencyRank: startRank + index,
      region: extras?.region ?? null,
      regionalVariant: extras?.regionalVariant ?? null,
      synonyms: extras?.synonyms ?? [],
      antonyms: extras?.antonyms ?? [],
      related: extras?.related ?? [],
    };
  });
}

function defaultDifficulty(level: CefrLevel): number {
  return { A1: 1, A2: 2, B1: 3, B2: 3, C1: 4, C2: 5 }[level];
}
