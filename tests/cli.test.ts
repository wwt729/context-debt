import { existsSync, readFileSync } from "node:fs";
import { chdir } from "node:process";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { VERSION } from "../src/core/meta.js";
import {
  copyFixtureToTemp,
  createTempDir,
  fixturePath,
  projectRoot,
  runCliWithOutput,
} from "./helpers.js";

describe("runCli", () => {
  test("prints stable text output for missing-test-script", async () => {
    const result = await runCliWithOutput([
      "scan",
      fixturePath("missing-test-script"),
      "--no-color",
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(
      [
        "Context Debt Report",
        "",
        "HIGH (1)",
        "  missing-test-script - Referenced test command has no matching script",
        "    File: CLAUDE.md:3",
        '    Evidence: pnpm test was referenced, but package.json has no "test" script.',
        "    Recommendation: Add scripts.test to package.json or update the instruction to the correct test command.",
        "",
        "Summary: 1 HIGH, 0 MEDIUM, 0 LOW, 0 INFO",
        "",
      ].join("\n"),
    );
  });

  test("emits stable JSON output", async () => {
    const result = await runCliWithOutput([
      "scan",
      fixturePath("conflicting-package-manager"),
      "--json",
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      tool: "context-debt",
      version: VERSION,
      displayedIssues: 1,
      scannedPath: fixturePath("conflicting-package-manager"),
      summary: {
        HIGH: 1,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      },
      totalIssues: 1,
      issues: [
        {
          id: "conflicting-package-manager",
          ruleId: "conflicting-package-manager",
          title: "Conflicting package manager guidance detected",
          severity: "HIGH",
          file: ".",
          evidence: "npm (CLAUDE.md:3), pnpm (AGENTS.md:3)",
          explanation:
            "Different files or project metadata recommend different package managers for the same repository.",
          recommendation:
            "Choose one package manager and align AI instructions, lockfiles, and package.json packageManager.",
          sourceKind: "project-meta",
          confidence: 0.95,
        },
      ],
    });
  });

  test("does not use ANSI escapes with --no-color", async () => {
    const result = await runCliWithOutput([
      "scan",
      fixturePath("no-ai-context"),
      "--no-color",
    ]);

    expect(result.stdout.includes("\u001b[")).toBe(false);
    expect(result.code).toBe(0);
  });

  test("supports --max-issues with stable json metadata", async () => {
    const result = await runCliWithOutput([
      "scan",
      fixturePath("dangerous-mcp"),
      "--json",
      "--max-issues",
      "1",
    ]);

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      displayedIssues: 1,
      totalIssues: 3,
      summary: {
        HIGH: 3,
      },
    });
    expect(JSON.parse(result.stdout).issues).toHaveLength(1);
  });

  test("doctor reports discovery diagnostics", async () => {
    const result = await runCliWithOutput(["doctor", fixturePath("safe-mcp")]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("context-debt doctor");
    expect(result.stdout).toContain(".cursor/mcp.json");
    expect(result.stdout).toContain(".claude/mcp.json");
  });

  test("accepts repeated include and exclude flags", async () => {
    const result = await runCliWithOutput([
      "doctor",
      fixturePath("clean-repo"),
      "--include",
      "docs/**/*.md",
      "--include",
      ".cursor/**/*.mdc",
      "--exclude",
      "coverage",
      "--exclude",
      "tmp",
    ]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("context-debt doctor");
  });
});

describe("init command", () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    chdir(projectRoot);
  });

  afterEach(() => {
    chdir(originalCwd);
  });

  test("creates a default config file", async () => {
    const dir = createTempDir("context-debt-init-");
    chdir(dir);

    const result = await runCliWithOutput(["init"]);
    const configPath = `${dir}/context-debt.config.json`;

    expect(result.code).toBe(0);
    expect(existsSync(configPath)).toBe(true);
    expect(JSON.parse(readFileSync(configPath, "utf8"))).toEqual({
      ruleSettings: {},
      rules: {
        referencedFileMissing: {
          ignorePaths: [],
          ignoreGlobs: [],
          ignorePatterns: [],
        },
      },
      scan: {
        include: [],
        exclude: ["node_modules", "dist", "coverage"],
      },
      thresholds: {
        duplicateInstructionSimilarity: 0.6,
        oversizedContextChars: 12000,
        tokenWasteMinWords: 40,
      },
    });
  });
});

describe("fix command", () => {
  test("previews edits without writing files", async () => {
    const targetDir = copyFixtureToTemp("fix-target");
    const result = await runCliWithOutput(["fix", targetDir]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Context Debt Fix Preview");
    expect(existsSync(`${targetDir}/context-debt.compact.md`)).toBe(false);
    expect(readFileSync(`${targetDir}/AGENTS.md`, "utf8")).toContain(
      "docs/missing.md",
    );
  });

  test("applies edits with --write", async () => {
    const targetDir = copyFixtureToTemp("fix-target");
    const result = await runCliWithOutput(["fix", targetDir, "--write"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Context Debt Fix Applied");
    expect(existsSync(`${targetDir}/context-debt.compact.md`)).toBe(true);
    expect(readFileSync(`${targetDir}/AGENTS.md`, "utf8")).not.toContain(
      "docs/missing.md",
    );
    expect(readFileSync(`${targetDir}/CLAUDE.md`, "utf8")).not.toContain(
      "Use pnpm for all commands.",
    );
  });
});
