import { htmlReportCss } from "./html-report-style.js";
import { TOOL_NAME, VERSION } from "./meta.js";
import { JSON_SCHEMA_VERSION } from "./schema.js";
import type { Issue, ScanResult, Severity } from "./types.js";

const severityOrder: Severity[] = ["HIGH", "MEDIUM", "LOW", "INFO"];

const severityLabels: Record<Severity, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Info",
};

export function formatHtmlReport(result: ScanResult): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    renderHead(),
    "<body>",
    '<main class="shell">',
    renderHeader(result),
    renderSummary(result),
    renderIssues(result),
    renderMetadata(result),
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function renderHead(): string {
  return [
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Context Debt Report</title>",
    `<style>${htmlReportCss}</style>`,
    "</head>",
  ].join("\n");
}

function renderHeader(result: ScanResult): string {
  return [
    '<section class="header">',
    "<div>",
    "<p>context-debt</p>",
    "<h1>Context Debt Report</h1>",
    `<span>Scanned ${escapeHtml(result.scannedPath)}</span>`,
    "</div>",
    `<strong>${result.totalIssues}</strong>`,
    "</section>",
  ].join("\n");
}

function renderSummary(result: ScanResult): string {
  const cards = severityOrder
    .map((severity) => {
      const count = result.summary[severity];
      return [
        `<article class="summary-card ${severity.toLowerCase()}">`,
        `<span>${severityLabels[severity]}</span>`,
        `<strong>${count}</strong>`,
        "</article>",
      ].join("\n");
    })
    .join("\n");

  return `<section class="summary-grid" aria-label="Issue summary">\n${cards}\n</section>`;
}

function renderIssues(result: ScanResult): string {
  if (result.issues.length === 0) {
    return '<section class="empty">No issues found.</section>';
  }

  const groups = severityOrder
    .map((severity) => renderIssueGroup(severity, result.issues))
    .filter((group) => group.length > 0)
    .join("\n");

  return `<section class="issues">\n${groups}\n</section>`;
}

function renderIssueGroup(severity: Severity, issues: Issue[]): string {
  const matching = issues.filter((issue) => issue.severity === severity);
  if (matching.length === 0) {
    return "";
  }

  return [
    `<section class="issue-group ${severity.toLowerCase()}">`,
    `<h2>${severity} (${matching.length})</h2>`,
    matching.map(renderIssue).join("\n"),
    "</section>",
  ].join("\n");
}

function renderIssue(issue: Issue): string {
  const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  const details = [
    renderDetail("File", location),
    issue.serverName ? renderDetail("Server", issue.serverName) : "",
    renderDetail("Confidence", formatConfidence(issue)),
    renderDetail("Evidence", issue.evidence),
    renderDetail("Explanation", issue.explanation),
    renderDetail("Recommendation", issue.recommendation),
    issue.resolvedPath ? renderDetail("Resolved path", issue.resolvedPath) : "",
    issue.relatedFiles?.length
      ? renderDetail("Related files", issue.relatedFiles.join(", "))
      : "",
    issue.autofixAvailable ? renderDetail("Autofix", "Available") : "",
  ].filter((entry) => entry.length > 0);

  return [
    '<article class="issue-card">',
    "<header>",
    `<span>${escapeHtml(issue.ruleId)}</span>`,
    `<h3>${escapeHtml(issue.title)}</h3>`,
    "</header>",
    details.join("\n"),
    "</article>",
  ].join("\n");
}

function renderDetail(label: string, value: string): string {
  return [
    '<div class="detail">',
    `<dt>${escapeHtml(label)}</dt>`,
    `<dd>${escapeHtml(value)}</dd>`,
    "</div>",
  ].join("\n");
}

function renderMetadata(result: ScanResult): string {
  const rows = [
    ["Tool", TOOL_NAME],
    ["Version", VERSION],
    ["Schema", JSON_SCHEMA_VERSION],
    ["Displayed issues", String(result.displayedIssues)],
    ["Total issues", String(result.totalIssues)],
    ["Strict failures", String(result.strictFailureCount)],
  ];

  return [
    '<section class="metadata">',
    "<h2>Scan Metadata</h2>",
    rows.map(([label, value]) => renderDetail(label, value)).join("\n"),
    "</section>",
  ].join("\n");
}

function formatConfidence(issue: Issue): string {
  const label = issue.confidenceLabel ?? "unknown";
  return `${label} (${issue.confidence.toFixed(2)})`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
