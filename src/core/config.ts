import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

import type {
  ContextDebtConfig,
  RuleLevel,
  RuleSetting,
  ScanConfig,
  Severity,
} from "./types.js";

const severitySchema = z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]);
const ruleLevelSchema = z.enum(["off", "warn", "error"]);
const ruleSettingSchema = z.object({
  enabled: z.boolean().optional(),
  level: ruleLevelSchema.optional(),
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

export function isRuleDisabled(setting: RuleSetting): boolean {
  return setting.enabled === false || setting.level === "off";
}

export function resolveRuleSeverity(
  setting: RuleSetting,
  fallbackSeverity: Severity,
): Severity {
  if (setting.severity) {
    return setting.severity;
  }

  if (setting.level === "error") {
    return "HIGH";
  }

  if (setting.level === "warn") {
    return "LOW";
  }

  return fallbackSeverity;
}

export function formatRuleSettingOverride(
  ruleId: string,
  setting: RuleSetting,
): string {
  const details = [
    setting.enabled === false ? "enabled=false" : null,
    setting.level ? `level=${setting.level}` : null,
    setting.severity ? `severity=${setting.severity}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${ruleId} (${details.join(", ")})` : ruleId;
}

export function getRuleLevelLabel(level: RuleLevel): string {
  if (level === "off") {
    return "disabled";
  }

  if (level === "warn") {
    return "non-blocking";
  }

  return "blocking";
}
