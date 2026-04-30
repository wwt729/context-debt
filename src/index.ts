export { loadConfig } from "./core/config.js";
export { discoveryPatterns } from "./core/discovery.js";
export { fixRepository } from "./core/fix.js";
export type {
  NormalizedRegressionIssue,
  NormalizedRegressionSnapshot,
  RegressionCategory,
  RegressionIssueMatch,
  RegressionManifest,
  RegressionRepo,
} from "./core/regressions.js";
export {
  collectRegressionRuleCoverage,
  findForbiddenRegressionIssues,
  findRedundantCoverageGapEntries,
  findRegressionCoverageGaps,
  findUntriagedRegressionIssues,
  formatThirdPartyFixtures,
  getRegressionManifestPath,
  loadRegressionManifest,
  normalizeRegressionResult,
} from "./core/regressions.js";
export { formatJsonReport, formatTextReport } from "./core/report.js";
export {
  diagnoseRepository,
  getExitCode,
  scanRepository,
  summarizeIssues,
} from "./core/scanner.js";
export { JSON_SCHEMA_VERSION } from "./core/schema.js";
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
export { ruleIds } from "./rules/index.js";
