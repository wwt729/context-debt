import { describe, expect, test } from "vitest";

import { getExitCode, scanRepository } from "../src/index.js";
import { fixturePath } from "./helpers.js";

describe("scanRepository", () => {
  test("reports missing-ai-context as LOW", async () => {
    const result = await scanRepository(fixturePath("no-ai-context"));
    expect(result.summary).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 1, INFO: 0 });
    expect(result.issues[0]?.id).toBe("missing-ai-context");
  });

  test("reports missing-test-script as HIGH", async () => {
    const result = await scanRepository(fixturePath("missing-test-script"));
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("missing-test-script");
  });

  test("reports missing-build-script as HIGH", async () => {
    const result = await scanRepository(fixturePath("missing-build-script"));
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("missing-build-script");
  });

  test("reports missing-lint-script as HIGH", async () => {
    const result = await scanRepository(fixturePath("missing-lint-script"));
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("missing-lint-script");
  });

  test("supports script variants for test/build rules", async () => {
    const result = await scanRepository(fixturePath("command-variants"));
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("missing-build-script");
    expect(result.issues[0]?.evidence).toContain('"build:prod"');
  });

  test("reports conflicting-package-manager as HIGH", async () => {
    const result = await scanRepository(
      fixturePath("conflicting-package-manager"),
    );
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("conflicting-package-manager");
  });

  test("reports dangerous-mcp-permission as HIGH", async () => {
    const result = await scanRepository(fixturePath("dangerous-mcp"));
    expect(result.summary.HIGH).toBe(3);
    expect(
      result.issues.every((issue) => issue.id === "dangerous-mcp-permission"),
    ).toBe(true);
  });

  test("does not report safe mcp configurations with descriptions and allowlists", async () => {
    const result = await scanRepository(fixturePath("safe-mcp"));
    expect(result.summary).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });
  });

  test("reports referenced-file-missing as HIGH", async () => {
    const result = await scanRepository(fixturePath("missing-reference"));
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("referenced-file-missing");
  });

  test("returns clean summary for a healthy repo", async () => {
    const result = await scanRepository(fixturePath("clean-repo"));
    expect(result.summary).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });
  });

  test("avoids common path false positives", async () => {
    const result = await scanRepository(fixturePath("path-heuristics"));
    expect(result.summary.HIGH).toBe(1);
    expect(result.issues[0]?.id).toBe("referenced-file-missing");
    expect(result.issues[0]?.evidence).toContain("docs/missing.md");
  });

  test("supports configured ignores for missing references", async () => {
    const result = await scanRepository(
      fixturePath("missing-reference-configured"),
    );
    expect(result.summary).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });
  });

  test("reports contradictory-test-command as MEDIUM", async () => {
    const result = await scanRepository(
      fixturePath("contradictory-test-command"),
    );
    expect(result.summary.MEDIUM).toBe(1);
    expect(result.issues[0]?.id).toBe("contradictory-test-command");
  });

  test("reports stale-reference as MEDIUM", async () => {
    const result = await scanRepository(fixturePath("stale-reference"));
    expect(result.summary.MEDIUM).toBe(1);
    expect(result.issues[0]?.id).toBe("stale-reference");
  });

  test("reports oversized-context-file as MEDIUM", async () => {
    const result = await scanRepository(fixturePath("oversized-context-file"));
    expect(result.summary.MEDIUM).toBe(1);
    expect(result.issues[0]?.id).toBe("oversized-context-file");
  });

  test("reports duplicate-instructions as MEDIUM", async () => {
    const result = await scanRepository(fixturePath("duplicate-instructions"));
    expect(result.summary.MEDIUM).toBe(1);
    expect(result.issues[0]?.id).toBe("duplicate-instructions");
  });

  test("reports token-waste as LOW", async () => {
    const result = await scanRepository(fixturePath("token-waste"));
    expect(result.summary.LOW).toBe(1);
    expect(result.issues.some((issue) => issue.id === "token-waste")).toBe(
      true,
    );
  });

  test("reports repeated-negative-rules as LOW", async () => {
    const result = await scanRepository(fixturePath("repeated-negative-rules"));
    expect(result.summary.LOW).toBe(1);
    expect(result.issues[0]?.id).toBe("repeated-negative-rules");
  });

  test("reports too-many-global-rules as MEDIUM", async () => {
    const result = await scanRepository(fixturePath("too-many-global-rules"));
    expect(result.summary.MEDIUM).toBe(1);
    expect(result.issues[0]?.id).toBe("too-many-global-rules");
  });

  test("supports rule disable and severity override from config", async () => {
    const result = await scanRepository(fixturePath("rule-settings"));
    expect(result.summary).toEqual({ HIGH: 0, MEDIUM: 1, LOW: 0, INFO: 0 });
    expect(result.issues[0]?.id).toBe("repeated-negative-rules");
    expect(result.issues[0]?.severity).toBe("MEDIUM");
  });

  test("keeps real-repo readme regressions focused on true missing references", async () => {
    const result = await scanRepository(
      fixturePath("real-repo-readme-regression"),
    );

    expect(result.summary).toEqual({ HIGH: 3, MEDIUM: 0, LOW: 0, INFO: 0 });
    expect(result.issues.map((issue) => issue.resolvedPath)).toEqual([
      "app/Http/Controllers/Evaluation",
      "docs/DataSyncModule.md",
      "api_response_examples.md",
    ]);
  });

  test("avoids false positives on monorepo-style real-repo docs", async () => {
    const result = await scanRepository(
      fixturePath("real-repo-monorepo-regression"),
    );

    expect(result.summary).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });
  });
});

describe("getExitCode", () => {
  test("returns 1 when HIGH issues exist", () => {
    expect(getExitCode({ HIGH: 1, MEDIUM: 0, LOW: 0, INFO: 0 }, false)).toBe(1);
  });

  test("returns 1 in strict mode when MEDIUM issues exist", () => {
    expect(getExitCode({ HIGH: 0, MEDIUM: 1, LOW: 0, INFO: 0 }, true)).toBe(1);
  });

  test("returns 0 for LOW-only issues", () => {
    expect(getExitCode({ HIGH: 0, MEDIUM: 0, LOW: 1, INFO: 0 }, false)).toBe(0);
  });
});
