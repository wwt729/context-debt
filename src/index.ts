export { loadConfig } from "./core/config.js";
export { fixRepository } from "./core/fix.js";
export { formatJsonReport, formatTextReport } from "./core/report.js";
export {
  diagnoseRepository,
  getExitCode,
  scanRepository,
  summarizeIssues,
} from "./core/scanner.js";
export type {
  ContextDebtConfig,
  FixResult,
  Issue,
  ScanContext,
  ScanResult,
  Severity,
} from "./core/types.js";
