import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { runRules } from "../rules/index.js";
import { getDefaultConfigPath, loadConfig, mergeScanConfig } from "./config.js";
import { buildScanContext } from "./context.js";
import {
  classifyContextFile,
  discoverPaths,
  primaryContextPatterns,
} from "./discovery.js";
import type {
  DoctorResult,
  ScanOptions,
  ScanResult,
  ScanSummary,
  Severity,
} from "./types.js";

const severityOrder: Severity[] = ["HIGH", "MEDIUM", "LOW", "INFO"];

export async function scanRepository(
  inputPath: string,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const rootDir = resolve(inputPath);
  const loadedConfig = loadConfig(rootDir, options.configPath);
  const config = mergeScanConfig(loadedConfig, {
    include: options.include,
    exclude: options.exclude,
  });
  const context = await buildScanContext(rootDir, config);
  const allIssues = runRules(context).sort(compareIssues);
  const issues = allIssues.slice(0, options.maxIssues ?? allIssues.length);

  return {
    displayedIssues: issues.length,
    issues,
    summary: summarizeIssues(allIssues),
    scannedPath: inputPath,
    totalIssues: allIssues.length,
  };
}

export function summarizeIssues(issues: ScanResult["issues"]): ScanSummary {
  return {
    HIGH: countIssues(issues, "HIGH"),
    MEDIUM: countIssues(issues, "MEDIUM"),
    LOW: countIssues(issues, "LOW"),
    INFO: countIssues(issues, "INFO"),
  };
}

export function getExitCode(summary: ScanSummary, strict: boolean): number {
  if (summary.HIGH > 0) {
    return 1;
  }

  if (strict && summary.MEDIUM > 0) {
    return 1;
  }

  return 0;
}

function countIssues(issues: ScanResult["issues"], severity: Severity): number {
  return issues.filter((issue) => issue.severity === severity).length;
}

function compareIssues(
  left: ScanResult["issues"][number],
  right: ScanResult["issues"][number],
): number {
  const severityDiff =
    severityOrder.indexOf(left.severity) -
    severityOrder.indexOf(right.severity);

  if (severityDiff !== 0) {
    return severityDiff;
  }

  const fileDiff = left.file.localeCompare(right.file);
  if (fileDiff !== 0) {
    return fileDiff;
  }

  return left.id.localeCompare(right.id);
}

export async function diagnoseRepository(
  inputPath: string,
  options: Pick<ScanOptions, "configPath" | "include" | "exclude"> = {},
): Promise<DoctorResult> {
  const rootDir = resolve(inputPath);
  const configPath = options.configPath
    ? resolve(rootDir, options.configPath)
    : getDefaultConfigPath(rootDir);
  let configStatus: DoctorResult["configStatus"] = "missing";

  try {
    configStatus = existsSync(configPath) ? "valid" : "missing";
    const loadedConfig = loadConfig(rootDir, options.configPath);
    const config = mergeScanConfig(loadedConfig, {
      include: options.include,
      exclude: options.exclude,
    });
    const paths = await discoverPaths(rootDir, config);
    const kindCounts = {
      agents: 0,
      claude: 0,
      "cursor-rule": 0,
      copilot: 0,
      codex: 0,
      windsurf: 0,
      readme: 0,
      "package-json": 0,
      mcp: 0,
      "project-meta": 0,
    } as DoctorResult["kindCounts"];

    for (const path of paths) {
      kindCounts[classifyContextFile(path)] += 1;
    }

    return {
      configStatus,
      discoveredCount: paths.length,
      kindCounts,
      mcpFiles: paths.filter((path) => classifyContextFile(path) === "mcp"),
      packageJsonPresent: paths.includes("package.json"),
      path: rootDir,
      pnpmVersion: null,
      primaryContextFiles: paths.filter((path) =>
        primaryContextPatterns.some((pattern) =>
          pattern.includes("**")
            ? path.startsWith(".cursor/rules/")
            : path === pattern,
        ),
      ),
    };
  } catch {
    configStatus = "invalid";
    return {
      configStatus,
      discoveredCount: 0,
      kindCounts: {
        agents: 0,
        claude: 0,
        "cursor-rule": 0,
        copilot: 0,
        codex: 0,
        windsurf: 0,
        readme: 0,
        "package-json": 0,
        mcp: 0,
        "project-meta": 0,
      },
      mcpFiles: [],
      packageJsonPresent: false,
      path: rootDir,
      pnpmVersion: null,
      primaryContextFiles: [],
    };
  }
}
