import { COURSES } from "../curriculum/index.js";
import { VOCABULARY } from "../vocabulary/index.js";
import { GRAMMAR_TOPICS, GRAMMAR_CONTRASTS } from "../grammar/index.js";
import { PLACEMENT_QUESTIONS } from "../placement/index.js";
import { GRAMMAR_MNEMONICS, WORD_MNEMONICS } from "../mnemonics/index.js";
import { verifyContent, type VerificationReport } from "./rules.js";

export * from "./rules.js";

/** Verify the whole shipped curriculum. */
export function verifyCurriculum(): VerificationReport {
  return verifyContent({
    courses: COURSES,
    vocabulary: VOCABULARY,
    grammar: GRAMMAR_TOPICS,
    contrasts: GRAMMAR_CONTRASTS,
    placement: PLACEMENT_QUESTIONS,
    grammarMnemonics: GRAMMAR_MNEMONICS,
    wordMnemonics: WORD_MNEMONICS,
  });
}

/** Render a report for a terminal. */
export function formatReport(report: VerificationReport): string {
  const lines: string[] = [];
  const { checked } = report;

  lines.push("Lingoza content verification");
  lines.push("─".repeat(60));
  lines.push(
    `Checked: ${checked.courses} courses · ${checked.modules} modules · ${checked.lessons} lessons`,
  );
  lines.push(
    `         ${checked.exercises} exercises · ${checked.questions} questions · ${checked.words} words`,
  );
  lines.push(
    `         ${checked.grammarTopics} grammar topics · ${checked.placementItems} placement items · ${checked.mnemonics} memory hooks`,
  );
  lines.push("");

  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");

  if (errors.length > 0) {
    lines.push(`ERRORS (${errors.length}) — these block the seed:`);
    for (const finding of errors) {
      lines.push(`  ✗ [${finding.code}] ${finding.where}`);
      lines.push(`      ${finding.message}`);
    }
    lines.push("");
  }

  if (warnings.length > 0) {
    lines.push(`WARNINGS (${warnings.length}) — review, but not blocking:`);
    for (const finding of warnings.slice(0, 40)) {
      lines.push(`  ! [${finding.code}] ${finding.where}`);
      lines.push(`      ${finding.message}`);
    }
    if (warnings.length > 40) lines.push(`  … and ${warnings.length - 40} more`);
    lines.push("");
  }

  lines.push("─".repeat(60));
  lines.push(
    report.ok
      ? `PASS — no errors${report.warnings > 0 ? `, ${report.warnings} warnings` : ""}.`
      : `FAIL — ${report.errors} error${report.errors === 1 ? "" : "s"}, ${report.warnings} warnings.`,
  );

  return lines.join("\n");
}
