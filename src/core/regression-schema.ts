import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

import type { ConfidenceLabel, ScanSummary, Severity } from "./types.js";

const regressionCategorySchema = z.enum([
  "monorepo",
  "docs-heavy",
  "ai-heavy",
  "mcp-heavy",
]);

export const issueMatchSchema = z.object({
  ruleId: z.string().min(1),
  file: z.string().min(1),
  severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  line: z.number().int().positive().optional(),
  resolvedPath: z.string().min(1).optional(),
  serverName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

const triageSchema = z.object({
  expectedTruePositives: z.array(issueMatchSchema).default([]),
  allowedFalsePositives: z.array(issueMatchSchema).default([]),
  mustNotAppear: z.array(issueMatchSchema).default([]),
});

const coverageGapSchema = z.object({
  ruleId: z.string().min(1),
  reason: z.string().min(1),
});

const regressionRepoSchema = z.object({
  id: z.string().min(1),
  category: regressionCategorySchema,
  source: z.object({
    repo: z.string().min(1),
    commit: z.string().min(1),
    license: z.string().min(1),
    url: z.string().url(),
  }),
  fixturePath: z.string().min(1),
  snapshotPath: z.string().min(1),
  notes: z.string().default(""),
  triage: triageSchema.default({
    expectedTruePositives: [],
    allowedFalsePositives: [],
    mustNotAppear: [],
  }),
});

const regressionManifestSchema = z.object({
  schemaVersion: z.literal(1),
  coverageGaps: z.array(coverageGapSchema).default([]),
  repos: z.array(regressionRepoSchema).default([]),
});

export type RegressionCategory = z.infer<typeof regressionCategorySchema>;
export type RegressionIssueMatch = z.infer<typeof issueMatchSchema>;
export type RegressionTriage = z.infer<typeof triageSchema>;
export type RegressionRepo = z.infer<typeof regressionRepoSchema>;
export type RegressionManifest = z.infer<typeof regressionManifestSchema>;
export type RegressionCoverageGap = z.infer<typeof coverageGapSchema>;
export type RegressionTriageBucket = keyof RegressionTriage;

export type NormalizedRegressionIssue = {
  confidenceLabel: ConfidenceLabel | null;
  file: string;
  line: number | null;
  relatedFiles: string[];
  resolvedPath: string | null;
  ruleId: string;
  serverName: string | null;
  severity: Severity;
  title: string;
};

export type NormalizedRegressionSnapshot = {
  id: string;
  issues: NormalizedRegressionIssue[];
  schemaVersion: 1;
  strictFailureCount: number;
  summary: ScanSummary;
};

export function getRegressionManifestPath(rootDir: string): string {
  return resolve(rootDir, "regressions/manifest.json");
}

export function loadRegressionManifest(rootDir: string): RegressionManifest {
  const raw = readFileSync(getRegressionManifestPath(rootDir), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return regressionManifestSchema.parse(parsed);
}
