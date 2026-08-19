import type { Correction, CorrectionCategory, MistakePatternSummary } from "../core/types.js";
import { normalize } from "../core/text.js";
import { clamp } from "./srs.js";

/**
 * Mistake tracking (§8, §12).
 *
 * Every correction — from writing, speaking or a tutor conversation — is
 * reduced to a stable pattern key. Keys are what let the system say "you have
 * confused ser and estar eleven times" instead of storing eleven unrelated
 * sentences, and what the daily planner reads to prescribe practice.
 */

export interface DetectedPattern {
  patternKey: string;
  label: string;
  category: CorrectionCategory;
  grammarSlug?: string;
}

/**
 * Ordered rules — first match wins, so specific patterns are tested before
 * generic ones. Matched against the *pair* of wrong and right forms, since the
 * mistake is only identifiable from the difference between them.
 */
const RULES: {
  key: string;
  label: string;
  category: CorrectionCategory;
  grammarSlug?: string;
  test: (wrong: string, right: string) => boolean;
}[] = [
  {
    key: "ser_vs_estar",
    label: "Confusing ser and estar",
    category: "grammar",
    grammarSlug: "ser-vs-estar",
    test: (w, r) =>
      (/\b(soy|eres|es|somos|sois|son|ser)\b/.test(w) && /\b(estoy|estás|está|estamos|estáis|están|estar)\b/.test(r)) ||
      (/\b(estoy|estás|está|estamos|estáis|están|estar)\b/.test(w) && /\b(soy|eres|es|somos|sois|son|ser)\b/.test(r)),
  },
  {
    key: "tener_for_age_state",
    label: "Using ser/estar where Spanish uses tener",
    category: "grammar",
    grammarSlug: "tener-expressions",
    test: (w, r) =>
      /\b(soy|estoy|es|está)\b/.test(w) && /\b(tengo|tienes|tiene|tenemos|tienen)\b/.test(r),
  },
  {
    key: "verb_not_conjugated",
    label: "Leaving the verb in the infinitive",
    category: "grammar",
    grammarSlug: "present-tense-regular",
    test: (w, r) => {
      const wrongHasInfinitive = /\b\w+(ar|er|ir)\b/.test(w);
      const rightIsConjugated = !/\b(yo|tú|él|ella)\s+\w+(ar|er|ir)\b/.test(r);
      return wrongHasInfinitive && rightIsConjugated && normalize(w) !== normalize(r);
    },
  },
  {
    key: "por_vs_para",
    label: "Confusing por and para",
    category: "grammar",
    grammarSlug: "por-vs-para",
    test: (w, r) => (/\bpor\b/.test(w) && /\bpara\b/.test(r)) || (/\bpara\b/.test(w) && /\bpor\b/.test(r)),
  },
  {
    key: "saber_vs_conocer",
    label: "Confusing saber and conocer",
    category: "grammar",
    grammarSlug: "saber-vs-conocer",
    test: (w, r) =>
      (/\b(sé|sabes|sabe|saber)\b/.test(w) && /\b(conozco|conoces|conoce|conocer)\b/.test(r)) ||
      (/\b(conozco|conoces|conoce|conocer)\b/.test(w) && /\b(sé|sabes|sabe|saber)\b/.test(r)),
  },
  {
    key: "preterite_vs_imperfect",
    label: "Choosing between preterite and imperfect",
    category: "grammar",
    grammarSlug: "preterite-vs-imperfect",
    test: (w, r) =>
      (/\w+(aba|ábamos|ían|ía)\b/.test(w) && /\w+(é|ó|aron|ieron|í|ió)\b/.test(r)) ||
      (/\w+(é|ó|aron|ieron|í|ió)\b/.test(w) && /\w+(aba|ábamos|ían|ía)\b/.test(r)),
  },
  {
    key: "subjunctive_missing",
    label: "Using the indicative where the subjunctive is required",
    category: "grammar",
    grammarSlug: "present-subjunctive",
    test: (_w, r) => /\b(que)\s+\w+(e|es|emos|éis|en|a|as|amos|áis|an)\b/.test(r) && /\bque\b/.test(_w),
  },
  {
    key: "gender_agreement",
    label: "Noun–adjective gender agreement",
    category: "grammar",
    grammarSlug: "gender-and-articles",
    test: (w, r) => {
      const wa = w.match(/\b(el|la|los|las|un|una|unos|unas)\b/g)?.join(" ") ?? "";
      const ra = r.match(/\b(el|la|los|las|un|una|unos|unas)\b/g)?.join(" ") ?? "";
      return wa !== "" && ra !== "" && wa !== ra;
    },
  },
  {
    key: "adjective_agreement",
    label: "Adjective endings not matching the noun",
    category: "grammar",
    grammarSlug: "adjective-agreement",
    test: (w, r) => {
      const stripEndings = (s: string) => s.replace(/(o|a|os|as)\b/g, "*");
      return normalize(w) !== normalize(r) && stripEndings(normalize(w)) === stripEndings(normalize(r));
    },
  },
  {
    key: "subject_pronoun_overuse",
    label: "Using subject pronouns where Spanish drops them",
    category: "structure",
    grammarSlug: "subject-pronouns",
    test: (w, r) => /\b(yo|tú|él|ella|nosotros|ellos)\b/.test(w) && !/\b(yo|tú|él|ella|nosotros|ellos)\b/.test(r),
  },
  {
    key: "false_friend",
    label: "False friend from English",
    category: "vocabulary",
    test: (w) => /\b(embarazada|realizar|actualmente|asistir|constipado|éxito|librería|sensible|molestar|carpeta)\b/.test(w),
  },
  {
    key: "accent_marks",
    label: "Missing or misplaced accents",
    category: "spelling",
    grammarSlug: "accents-and-stress",
    test: (w, r) => {
      const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      return normalize(w) !== normalize(r) && strip(normalize(w)) === strip(normalize(r));
    },
  },
  {
    key: "rr_pronunciation",
    label: "The Spanish rolled R",
    category: "pronunciation",
    test: (w, r) => /rr/.test(r) && !/rr/.test(w),
  },
  {
    key: "word_order",
    label: "Word order",
    category: "structure",
    test: (w, r) => {
      const sort = (s: string) => normalize(s).split(" ").sort().join(" ");
      return normalize(w) !== normalize(r) && sort(w) === sort(r);
    },
  },
];

/** Classify one correction into a pattern, or null when it is a one-off. */
export function detectPattern(correction: Correction): DetectedPattern | null {
  if (correction.patternKey) {
    return {
      patternKey: correction.patternKey,
      label: correction.patternKey.replace(/_/g, " "),
      category: correction.category,
    };
  }

  const wrong = normalize(correction.original);
  const right = normalize(correction.corrected);
  if (!wrong || !right) return null;

  for (const rule of RULES) {
    if (rule.test(wrong, right)) {
      return {
        patternKey: rule.key,
        label: rule.label,
        category: rule.category,
        grammarSlug: rule.grammarSlug,
      };
    }
  }

  // Unmatched corrections still roll up by category so nothing is lost.
  return {
    patternKey: `general_${correction.category}`,
    label: `General ${correction.category} accuracy`,
    category: correction.category,
  };
}

export function detectPatterns(corrections: Correction[]): DetectedPattern[] {
  const seen = new Map<string, DetectedPattern>();
  for (const correction of corrections) {
    const pattern = detectPattern(correction);
    if (pattern && !seen.has(pattern.patternKey)) seen.set(pattern.patternKey, pattern);
  }
  return [...seen.values()];
}

/**
 * Severity decay. A pattern the learner has stopped triggering should fade
 * rather than haunt their dashboard forever, so severity falls with time since
 * it was last seen and rises with repetition.
 */
export function updateSeverity(input: {
  currentSeverity: number;
  occurrences: number;
  daysSinceLastSeen: number;
  triggeredAgain: boolean;
}): number {
  const { currentSeverity, occurrences, daysSinceLastSeen, triggeredAgain } = input;
  if (triggeredAgain) {
    return clamp(currentSeverity + 0.25 + Math.min(occurrences, 10) * 0.02, 0, 2);
  }
  // Half-life of roughly two weeks of not making the mistake.
  return clamp(currentSeverity * Math.pow(0.5, daysSinceLastSeen / 14), 0, 2);
}

/** Patterns worth acting on now, strongest first. */
export function activePatterns(
  patterns: MistakePatternSummary[],
  limit = 5,
): MistakePatternSummary[] {
  return patterns
    .filter((p) => p.severity >= 0.3)
    .sort((a, b) => b.severity * b.occurrences - a.severity * a.occurrences)
    .slice(0, limit);
}
