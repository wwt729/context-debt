import type {
  NormalizedRegressionIssue,
  RegressionCoverageGap,
  RegressionIssueMatch,
  RegressionManifest,
  RegressionRepo,
  RegressionTriageBucket,
} from "./regression-schema.js";

export function findUntriagedRegressionIssues(
  repo: RegressionRepo,
  issues: NormalizedRegressionIssue[],
): NormalizedRegressionIssue[] {
  const triaged = [
    ...repo.triage.expectedTruePositives,
    ...repo.triage.allowedFalsePositives,
  ];

  return issues.filter(
    (issue) => !triaged.some((match) => matchesIssue(issue, match)),
  );
}

export function findForbiddenRegressionIssues(
  repo: RegressionRepo,
  issues: NormalizedRegressionIssue[],
): NormalizedRegressionIssue[] {
  return issues.filter((issue) =>
    repo.triage.mustNotAppear.some((match) => matchesIssue(issue, match)),
  );
}

export function collectRegressionRuleCoverage(
  manifest: RegressionManifest,
): Map<string, Set<RegressionTriageBucket>> {
  const coverage = new Map<string, Set<RegressionTriageBucket>>();

  for (const repo of manifest.repos) {
    collectCoverageForBucket(coverage, repo, "expectedTruePositives");
    collectCoverageForBucket(coverage, repo, "allowedFalsePositives");
    collectCoverageForBucket(coverage, repo, "mustNotAppear");
  }

  return coverage;
}

export function findRegressionCoverageGaps(
  manifest: RegressionManifest,
  supportedRuleIds: string[],
): string[] {
  const coveredRuleIds = new Set(
    collectRegressionRuleCoverage(manifest).keys(),
  );
  const acknowledgedGapIds = new Set(
    manifest.coverageGaps.map((entry) => entry.ruleId),
  );

  return supportedRuleIds.filter(
    (ruleId) => !coveredRuleIds.has(ruleId) && !acknowledgedGapIds.has(ruleId),
  );
}

export function findRedundantCoverageGapEntries(
  manifest: RegressionManifest,
  supportedRuleIds: string[],
): RegressionCoverageGap[] {
  const coveredRuleIds = new Set(
    collectRegressionRuleCoverage(manifest).keys(),
  );
  const supported = new Set(supportedRuleIds);

  return manifest.coverageGaps.filter(
    (entry) => !supported.has(entry.ruleId) || coveredRuleIds.has(entry.ruleId),
  );
}

function matchesIssue(
  issue: NormalizedRegressionIssue,
  match: RegressionIssueMatch,
): boolean {
  if (issue.ruleId !== match.ruleId || issue.file !== match.file) {
    return false;
  }

  return (
    compareOptional(issue.severity, match.severity) &&
    compareOptional(issue.line, match.line ?? null) &&
    compareOptional(issue.resolvedPath, match.resolvedPath ?? null) &&
    compareOptional(issue.serverName, match.serverName ?? null) &&
    compareOptional(issue.title, match.title ?? null)
  );
}

function compareOptional<T>(
  actual: T,
  expected: T | null | undefined,
): boolean {
  if (expected === null || expected === undefined) {
    return true;
  }

  return actual === expected;
}

function collectCoverageForBucket(
  coverage: Map<string, Set<RegressionTriageBucket>>,
  repo: RegressionRepo,
  bucket: RegressionTriageBucket,
): void {
  for (const entry of repo.triage[bucket]) {
    const existing = coverage.get(entry.ruleId) ?? new Set();
    existing.add(bucket);
    coverage.set(entry.ruleId, existing);
  }
}
