import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { getDefaultConfig, loadConfig } from "../src/core/config.js";
import { createTempDir } from "./helpers.js";

describe("config", () => {
  test("returns defaults when config file is absent", () => {
    const dir = createTempDir("context-debt-config-");
    const config = loadConfig(dir);

    expect(config).toEqual(getDefaultConfig());
  });

  test("loads a custom config file", () => {
    const dir = createTempDir("context-debt-config-");
    const configPath = join(dir, "custom.json");

    writeFileSync(
      configPath,
      JSON.stringify({
        scan: {
          include: ["docs/**/*.md"],
          exclude: ["node_modules", "tmp"],
        },
        thresholds: {
          oversizedContextChars: 5000,
        },
      }),
    );

    const config = loadConfig(dir, "custom.json");
    expect(config.scan.include).toEqual(["docs/**/*.md"]);
    expect(config.scan.exclude).toEqual(["node_modules", "tmp"]);
    expect(config.thresholds.oversizedContextChars).toBe(5000);
    expect(config.thresholds.duplicateInstructionSimilarity).toBe(0.6);
    expect(config.thresholds.tokenWasteMinWords).toBe(40);
    expect(config.ruleSettings).toEqual({});
    expect(config.rules.referencedFileMissing).toEqual({
      ignoreGlobs: [],
      ignorePaths: [],
      ignorePatterns: [],
    });
  });

  test("loads referenced-file-missing ignore configuration", () => {
    const dir = createTempDir("context-debt-config-");
    const configPath = join(dir, "custom.json");

    writeFileSync(
      configPath,
      JSON.stringify({
        rules: {
          referencedFileMissing: {
            ignorePaths: ["api_response_examples.md"],
            ignoreGlobs: ["docs/**/*.md"],
            ignorePatterns: ["^storage/logs/.+\\.log$"],
          },
        },
      }),
    );

    const config = loadConfig(dir, "custom.json");
    expect(config.rules.referencedFileMissing).toEqual({
      ignorePaths: ["api_response_examples.md"],
      ignoreGlobs: ["docs/**/*.md"],
      ignorePatterns: ["^storage/logs/.+\\.log$"],
    });
  });

  test("loads generic rule settings", () => {
    const dir = createTempDir("context-debt-config-");
    const configPath = join(dir, "custom.json");

    writeFileSync(
      configPath,
      JSON.stringify({
        ruleSettings: {
          "missing-lint-script": {
            enabled: false,
          },
          "repeated-negative-rules": {
            severity: "MEDIUM",
          },
        },
      }),
    );

    const config = loadConfig(dir, "custom.json");
    expect(config.ruleSettings).toEqual({
      "missing-lint-script": {
        enabled: false,
      },
      "repeated-negative-rules": {
        severity: "MEDIUM",
      },
    });
  });

  test("loads duplicate and token thresholds", () => {
    const dir = createTempDir("context-debt-config-");
    const configPath = join(dir, "custom.json");

    writeFileSync(
      configPath,
      JSON.stringify({
        thresholds: {
          duplicateInstructionSimilarity: 0.72,
          oversizedContextChars: 9000,
          tokenWasteMinWords: 12,
        },
      }),
    );

    const config = loadConfig(dir, "custom.json");
    expect(config.thresholds).toEqual({
      duplicateInstructionSimilarity: 0.72,
      oversizedContextChars: 9000,
      tokenWasteMinWords: 12,
    });
  });
});
