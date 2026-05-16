import type {
  NormalizedRegressionIssue,
  NormalizedRegressionSnapshot,
  RegressionManifest,
} from "./regression-schema.js";
import type { ScanResult, Severity } from "./types.js";

const severityOrder: Severity[] = ["HIGH", "MEDIUM", "LOW", "INFO"];

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
