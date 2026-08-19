/**
 * Content verification CLI.
 *
 *   npm run verify --workspace @lingoza/content
 *
 * Exits non-zero when there are errors, so it can gate CI and the seed script.
 */
import { verifyCurriculum, formatReport } from "./index.js";

const report = verifyCurriculum();
console.log(formatReport(report));
process.exit(report.ok ? 0 : 1);
