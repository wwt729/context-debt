import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { formatHtmlReport } from "../src/core/html-report.js";
import type { ScanResult } from "../src/core/types.js";
import { createTempDir, fixturePath, runCliWithOutput } from "./helpers.js";

describe("html report", () => {
  test("formats scan results as a static html document", async () => {
    const outputPath = join(createTempDir("context-debt-html-"), "report.html");
    const result = await runCliWithOutput([
      "scan",
      fixturePath("missing-test-script"),
      "--format",
      "html",
      "--output",
      outputPath,
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`Wrote ${outputPath}\n`);
    expect(existsSync(outputPath)).toBe(true);

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Context Debt Report");
    expect(html).toContain("missing-test-script");
    expect(html).toContain("Referenced test command has no matching script");
  });

  test("escapes issue content before writing html", () => {
    const html = formatHtmlReport(createEscapingResult());

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("docs/&lt;missing&gt;.md");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("docs/<missing>.md");
  });

  test("rejects unsupported report formats", async () => {
    const result = await runCliWithOutput([
      "scan",
      fixturePath("clean-repo"),
      "--format",
      "xml",
    ]);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Unsupported report format: xml");
  });
});

function createEscapingResult(): ScanResult {
  return {
    displayedIssues: 1,
    scannedPath: ".",
    strictFailureCount: 1,
    totalIssues: 1,
    summary: { HIGH: 1, MEDIUM: 0, LOW: 0, INFO: 0 },
    issues: [
      {
        id: "referenced-file-missing",
        ruleId: "referenced-file-missing",
        title: "Escaping check",
        severity: "HIGH",
        file: "AGENTS.md",
        line: 3,
        evidence: "<script>alert(1)</script>",
        explanation: "docs/<missing>.md is absent.",
        recommendation: "Update the reference.",
        sourceKind: "agents",
        confidence: 0.99,
        confidenceLabel: "high",
      },
    ],
  };
}
