import pc from "picocolors";

import { TOOL_NAME, VERSION } from "./meta.js";
import { JSON_SCHEMA_VERSION } from "./schema.js";
import type {
  DoctorResult,
  FixResult,
  Issue,
  ReportOptions,
  ScanResult,
  Severity,
} from "./types.js";

const severityOrder: Severity[] = ["HIGH", "MEDIUM", "LOW", "INFO"];

export function formatTextReport(
  result: ScanResult,
  options: ReportOptions,
): string {
  const lines = ["Context Debt Report", ""];

  for (const severity of severityOrder) {
    const issues = result.issues.filter((issue) => issue.severity === severity);
    if (issues.length === 0) {
      continue;
    }

    lines.push(`${formatSeverity(severity, options.color)} (${issues.length})`);
    for (const issue of issues) {
      lines.push(...formatIssue(issue));
    }
    lines.push("");
  }

  lines.push(
    `Summary: ${result.summary.HIGH} HIGH, ${result.summary.MEDIUM} MEDIUM, ${result.summary.LOW} LOW, ${result.summary.INFO} INFO`,
  );
  if (result.displayedIssues < result.totalIssues) {
    lines.push(
      `Showing ${result.displayedIssues} of ${result.totalIssues} issues`,
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function formatJsonReport(result: ScanResult): string {
  return `${JSON.stringify(
    {
      schemaVersion: JSON_SCHEMA_VERSION,
      tool: TOOL_NAME,
      version: VERSION,
      displayedIssues: result.displayedIssues,
      scannedPath: result.scannedPath,
      summary: result.summary,
      strictFailureCount: result.strictFailureCount,
      totalIssues: result.totalIssues,
      issues: result.issues,
    },
    null,
    2,
  )}\n`;
}

export function formatErrorReport(error: unknown, asJson: boolean): string {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (asJson) {
    return `${JSON.stringify(
      {
        schemaVersion: JSON_SCHEMA_VERSION,
        tool: TOOL_NAME,
        version: VERSION,
        error: {
          message,
        },
      },
      null,
      2,
    )}\n`;
  }

  return `context-debt failed: ${message}\n`;
}

function formatSeverity(severity: Severity, color: boolean): string {
  if (!color) {
    return severity;
  }

  if (severity === "HIGH") {
    return pc.red(severity);
  }

  if (severity === "MEDIUM") {
    return pc.yellow(severity);
  }

  if (severity === "LOW") {
    return pc.blue(severity);
  }

  return pc.gray(severity);
}

function formatIssue(issue: Issue): string[] {
  const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  const lines = [
    `  ${issue.id} - ${issue.title}`,
    `    File: ${location}`,
    `    Evidence: ${issue.evidence}`,
    `    Recommendation: ${issue.recommendation}`,
  ];

  if (issue.serverName) {
    lines.splice(2, 0, `    Server: ${issue.serverName}`);
  }

  return lines;
}

export function formatDoctorReport(result: DoctorResult): string {
  const ruleOverrides =
    result.ruleOverrides.length > 0
      ? result.ruleOverrides
          .map((entry) => entry.label ?? entry.ruleId)
          .join(", ")
      : "none";
  const lines = [
    "context-debt doctor",
    `Path: ${result.path}`,
    `Config path: ${result.configPath}`,
    `Config: ${result.configStatus}`,
    `Include globs: ${result.scanInclude.length > 0 ? result.scanInclude.join(", ") : "none"}`,
    `Exclude globs: ${result.scanExclude.length > 0 ? result.scanExclude.join(", ") : "none"}`,
    `Rule overrides: ${ruleOverrides}`,
    `Package.json: ${result.packageJsonPresent ? "present" : "missing"}`,
    `Primary context files: ${
      result.primaryContextFiles.length > 0
        ? result.primaryContextFiles.join(", ")
        : "none"
    }`,
    `MCP files: ${result.mcpFiles.length > 0 ? result.mcpFiles.join(", ") : "none"}`,
    `Discovered files: ${result.discoveredCount}`,
    `Discovered paths: ${result.discoveredFiles.length > 0 ? result.discoveredFiles.join(", ") : "none"}`,
    `Kinds: ${
      Object.entries(result.kindCounts)
        .filter(([, count]) => count > 0)
        .map(([kind, count]) => `${kind}=${count}`)
        .join(", ") || "none"
    }`,
  ];

  return `${lines.join("\n")}\n`;
}

export function formatFixReport(result: FixResult, write: boolean): string {
  const lines = [
    write ? "Context Debt Fix Applied" : "Context Debt Fix Preview",
    `Scanned: ${result.scannedPath}`,
    `Issues at scan time: ${result.issueSummary.HIGH} HIGH, ${result.issueSummary.MEDIUM} MEDIUM, ${result.issueSummary.LOW} LOW, ${result.issueSummary.INFO} INFO`,
    `Edits: ${result.edits.length}`,
  ];

  for (const edit of result.edits) {
    lines.push(`- ${edit.action.toUpperCase()} ${edit.path} (${edit.reason})`);
  }

  lines.push(`Compact suggestion: ${result.generatedCompactPath}`);
  return `${lines.join("\n")}\n`;
}
