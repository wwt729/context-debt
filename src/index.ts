export { loadConfig } from "./core/config.js";
export { fixRepository } from "./core/fix.js";
export { formatJsonReport, formatTextReport } from "./core/report.js";
export { JSON_SCHEMA_VERSION } from "./core/schema.js";
export {
  diagnoseRepository,
  getExitCode,
  scanRepository,
  summarizeIssues,
} from "./core/scanner.js";
export type {
  ConfidenceLabel,
  ContextDebtConfig,
  FixResult,
  Issue,
  PathCandidateKind,
  ScanContext,
  ScanResult,
  Severity,
} from "./core/types.js";
