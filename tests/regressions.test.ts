import { describe, expect, test } from "vitest";

import {
  collectRegressionRuleCoverage,
  findRedundantCoverageGapEntries,
  findRegressionCoverageGaps,
  type RegressionManifest,
} from "../src/index.js";

const manifest: RegressionManifest = {
  schemaVersion: 1,
  coverageGaps: [
    {
      ruleId: "stale-reference",
      reason: "No curated third-party fixture covers this rule yet.",
    },
  ],
  repos: [
    {
      id: "demo-001",
      category: "ai-heavy",
      source: {
        repo: "demo/repo",
        commit: "abc123",
        license: "MIT",
        url: "https://github.com/demo/repo",
      },
      fixturePath: "regressions/repos/demo-001",
      snapshotPath: "regressions/snapshots/demo-001.json",
      notes: "",
      triage: {
        expectedTruePositives: [
          {
            ruleId: "missing-test-script",
            file: "AGENTS.md",
            reason: "Expected true positive.",
          },
        ],
        allowedFalsePositives: [
          {
            ruleId: "missing-ai-context",
            file: ".",
            reason: "Intentional repo shape.",
          },
        ],
        mustNotAppear: [
          {
            ruleId: "referenced-file-missing",
            file: "README.md",
            reason: "Catalog examples should not trigger.",
          },
        ],
      },
    },
  ],
};

describe("regression coverage helpers", () => {
  test("collects rule coverage across triage buckets", () => {
    const coverage = collectRegressionRuleCoverage(manifest);

    expect([...(coverage.get("missing-test-script") ?? [])]).toEqual([
      "expectedTruePositives",
    ]);
    expect([...(coverage.get("missing-ai-context") ?? [])]).toEqual([
      "allowedFalsePositives",
    ]);
    expect([...(coverage.get("referenced-file-missing") ?? [])]).toEqual([
      "mustNotAppear",
    ]);
  });

  test("reports rules without coverage or acknowledged gaps", () => {
    expect(
      findRegressionCoverageGaps(manifest, [
        "missing-test-script",
        "missing-ai-context",
        "referenced-file-missing",
        "stale-reference",
        "contradictory-test-command",
      ]),
    ).toEqual(["contradictory-test-command"]);
  });

  test("flags stale coverage-gap entries once a rule is covered", () => {
    expect(
      findRedundantCoverageGapEntries(
        {
          ...manifest,
          coverageGaps: [
            ...manifest.coverageGaps,
            {
              ruleId: "missing-test-script",
              reason: "Outdated gap entry.",
            },
          ],
        },
        [
          "missing-test-script",
          "missing-ai-context",
          "referenced-file-missing",
          "stale-reference",
        ],
      ),
    ).toEqual([
      {
        ruleId: "missing-test-script",
        reason: "Outdated gap entry.",
      },
    ]);
  });
});
