import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

import type {
  ConfidenceLabel,
  ScanResult,
  ScanSummary,
  Severity,
} from "./types.js";

const regressionCategorySchema = z.enum([
  "monorepo",
  "docs-heavy",
  "ai-heavy",
  "mcp-heavy",
]);

const issueMatchSchema = z.object({
  ruleId: z.string().min(1),
  file: z.string().min(1),
  severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  line: z.number().int().positive().optional(),
  resolvedPath: z.string().min(1).optional(),
  serverName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

const triageSchema = z.object({
  expectedTruePositives: z.array(issueMatchSchema).default([]),
  allowedFalsePositives: z.array(issueMatchSchema).default([]),
  mustNotAppear: z.array(issueMatchSchema).default([]),
});

const coverageGapSchema = z.object({
  ruleId: z.string().min(1),
  reason: z.string().min(1),
});

const regressionRepoSchema = z.object({
  id: z.string().min(1),
  category: regressionCategorySchema,
  source: z.object({
    repo: z.string().min(1),
    commit: z.string().min(1),
    license: z.string().min(1),
    url: z.string().url(),
  }),
  fixturePath: z.string().min(1),
  snapshotPath: z.string().min(1),
  notes: z.string().default(""),
  triage: triageSchema.default({
    expectedTruePositives: [],
    allowedFalsePositives: [],
    mustNotAppear: [],
  }),
});

const regressionManifestSchema = z.object({
  schemaVersion: z.literal(1),
  coverageGaps: z.array(coverageGapSchema).default([]),
  repos: z.array(regressionRepoSchema).default([]),
});

export type RegressionCategory = z.infer<typeof regressionCategorySchema>;
export type RegressionIssueMatch = z.infer<typeof issueMatchSchema>;
export type RegressionTriage = z.infer<typeof triageSchema>;
export type RegressionRepo = z.infer<typeof regressionRepoSchema>;
export type RegressionManifest = z.infer<typeof regressionManifestSchema>;
export type RegressionCoverageGap = z.infer<typeof coverageGapSchema>;
export type RegressionTriageBucket = keyof RegressionTriage;

export type NormalizedRegressionIssue = {
  confidenceLabel: ConfidenceLabel | null;
  file: string;
  line: number | null;
  relatedFiles: string[];
  resolvedPath: string | null;
  ruleId: string;
  serverName: string | null;
  severity: Severity;
  title: string;
};

export type NormalizedRegressionSnapshot = {
  id: string;
  issues: NormalizedRegressionIssue[];
  schemaVersion: 1;
  strictFailureCount: number;
  summary: ScanSummary;
};

const severityOrder: Severity[] = ["HIGH", "MEDIUM", "LOW", "INFO"];

export function getRegressionManifestPath(rootDir: string): string {
  return resolve(rootDir, "regressions/manifest.json");
}

export function loadRegressionManifest(rootDir: string): RegressionManifest {
  const raw = readFileSync(getRegressionManifestPath(rootDir), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return regressionManifestSchema.parse(parsed);
}

export function normalizeRegressionResult(
  id: string,
  result: Pick<ScanResult, "issues" | "strictFailureCount" | "summary">,
): NormalizedRegressionSnapshot {
  return {
    schemaVersion: 1,
    id,
    summary: result.summary,
    strictFailureCount: result.strictFailureCount,
    issues: result.issues
      .map((issue) => ({
        ruleId: issue.ruleId,
        severity: issue.severity,
        file: issue.file,
        line: issue.line ?? null,
        title: issue.title,
        confidenceLabel: issue.confidenceLabel ?? null,
        resolvedPath: issue.resolvedPath ?? null,
        relatedFiles: [...(issue.relatedFiles ?? [])].sort((left, right) =>
          left.localeCompare(right),
        ),
        serverName: issue.serverName ?? null,
      }))
      .sort(compareNormalizedIssues),
  };
}

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

export function formatThirdPartyFixtures(manifest: RegressionManifest): string {
  const lines = [
    "# Third-Party Regression Fixtures",
    "",
    "Real repository fixtures distilled for regression testing.",
    "",
    "| ID | Category | Source | Commit | License |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const repo of [...manifest.repos].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    lines.push(
      `| ${repo.id} | ${repo.category} | [${repo.source.repo}](${repo.source.url}) | \`${repo.source.commit.slice(0, 12)}\` | ${repo.source.license} |`,
    );
  }

  return `${lines.join("\n")}\n`;
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

function compareNormalizedIssues(
  left: NormalizedRegressionIssue,
  right: NormalizedRegressionIssue,
): number {
  const severityDiff =
    severityOrder.indexOf(left.severity) -
    severityOrder.indexOf(right.severity);

  if (severityDiff !== 0) {
    return severityDiff;
  }

  const fileDiff = left.file.localeCompare(right.file);
  if (fileDiff !== 0) {
    return fileDiff;
  }

  const lineDiff = compareLine(left.line, right.line);
  if (lineDiff !== 0) {
    return lineDiff;
  }

  const ruleDiff = left.ruleId.localeCompare(right.ruleId);
  if (ruleDiff !== 0) {
    return ruleDiff;
  }

  const pathDiff = (left.resolvedPath ?? "").localeCompare(
    right.resolvedPath ?? "",
  );
  if (pathDiff !== 0) {
    return pathDiff;
  }

  return (left.serverName ?? "").localeCompare(right.serverName ?? "");
}

function compareLine(left: number | null, right: number | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  return left - right;
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
