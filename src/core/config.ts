import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

import type { ContextDebtConfig, RuleSetting, ScanConfig } from "./types.js";

const severitySchema = z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]);
const ruleSettingSchema = z.object({
  enabled: z.boolean().optional(),
  severity: severitySchema.optional(),
});

const configSchema = z.object({
  ruleSettings: z.record(z.string(), ruleSettingSchema).default({}),
  rules: z
    .object({
      referencedFileMissing: z
        .object({
          ignoreGlobs: z.array(z.string()).default([]),
          ignorePaths: z.array(z.string()).default([]),
          ignorePatterns: z.array(z.string()).default([]),
        })
        .default({
          ignoreGlobs: [],
          ignorePaths: [],
          ignorePatterns: [],
        }),
    })
    .default({
      referencedFileMissing: {
        ignoreGlobs: [],
        ignorePaths: [],
        ignorePatterns: [],
      },
    }),
  scan: z
    .object({
      include: z.array(z.string()).default([]),
      exclude: z
        .array(z.string())
        .default(["node_modules", "dist", "coverage"]),
    })
    .default({
      include: [],
      exclude: ["node_modules", "dist", "coverage"],
    }),
  thresholds: z
    .object({
      duplicateInstructionSimilarity: z.number().min(0).max(1).default(0.6),
      oversizedContextChars: z.number().int().positive().default(12_000),
      tokenWasteMinWords: z.number().int().positive().default(40),
    })
    .default({
      duplicateInstructionSimilarity: 0.6,
      oversizedContextChars: 12_000,
      tokenWasteMinWords: 40,
    }),
});

const defaultConfig = configSchema.parse({});

export function getDefaultConfig(): ContextDebtConfig {
  return structuredClone(defaultConfig);
}

export function getDefaultConfigPath(rootDir: string): string {
  return resolve(rootDir, "context-debt.config.json");
}

export function loadConfig(
  rootDir: string,
  configPath?: string,
): ContextDebtConfig {
  const targetPath = configPath
    ? resolve(rootDir, configPath)
    : getDefaultConfigPath(rootDir);

  if (!existsSync(targetPath)) {
    return getDefaultConfig();
  }

  const raw = readFileSync(targetPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  return configSchema.parse(parsed);
}

export function mergeScanConfig(
  config: ContextDebtConfig,
  overrides: Partial<ScanConfig>,
): ContextDebtConfig {
  return {
    ...config,
    scan: {
      include: [...config.scan.include, ...(overrides.include ?? [])],
      exclude: [...config.scan.exclude, ...(overrides.exclude ?? [])],
    },
  };
}

export function getRuleSetting(
  config: ContextDebtConfig,
  ruleId: string,
): RuleSetting {
  return config.ruleSettings[ruleId] ?? {};
}
