export {
  formatThirdPartyFixtures,
  normalizeRegressionResult,
} from "./regression-format.js";
export {
  collectRegressionRuleCoverage,
  findForbiddenRegressionIssues,
  findRedundantCoverageGapEntries,
  findRegressionCoverageGaps,
  findUntriagedRegressionIssues,
} from "./regression-matching.js";
export type {
  NormalizedRegressionIssue,
  NormalizedRegressionSnapshot,
  RegressionCategory,
  RegressionCoverageGap,
  RegressionIssueMatch,
  RegressionManifest,
  RegressionRepo,
  RegressionTriage,
  RegressionTriageBucket,
} from "./regression-schema.js";
export {
  getRegressionManifestPath,
  loadRegressionManifest,
} from "./regression-schema.js";
