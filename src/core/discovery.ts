import { relative, resolve } from "node:path";
import fg from "fast-glob";

import type { ContextDebtConfig, ContextFileKind } from "./types.js";

export const discoveryPatterns = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/**/*.mdc",
  ".github/copilot-instructions.md",
  ".codex/**/*.md",
  ".windsurf/**/*.md",
  "README.md",
  "**/package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "pyproject.toml",
  "uv.lock",
  "Cargo.toml",
  "Makefile",
  "docker-compose.yml",
  ".env.example",
  ".mcp.json",
  "mcp.json",
  ".vscode/mcp.json",
  ".cursor/mcp.json",
  ".claude/mcp.json",
];

export const primaryContextPatterns = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/**/*.mdc",
  ".github/copilot-instructions.md",
];

export async function discoverPaths(
  rootDir: string,
  config: ContextDebtConfig,
): Promise<string[]> {
  const ignore = config.scan.exclude.map((entry) =>
    entry.endsWith("/**") ? entry : `${entry}/**`,
  );

  return discoverFromPatterns(
    rootDir,
    [...discoveryPatterns, ...config.scan.include],
    ignore,
  );
}

export async function discoverFromPatterns(
  rootDir: string,
  patterns: string[],
  ignore: string[] = [],
): Promise<string[]> {
  const entries = await fg(patterns, {
    cwd: rootDir,
    dot: true,
    ignore,
    onlyFiles: true,
    unique: true,
  });

  return entries.sort((left, right) => left.localeCompare(right));
}

export function classifyContextFile(filePath: string): ContextFileKind {
  if (filePath === "AGENTS.md") {
    return "agents";
  }

  if (filePath === "CLAUDE.md") {
    return "claude";
  }

  if (filePath.startsWith(".cursor/rules/")) {
    return "cursor-rule";
  }

  if (filePath === ".github/copilot-instructions.md") {
    return "copilot";
  }

  if (filePath.startsWith(".codex/")) {
    return "codex";
  }

  if (filePath.startsWith(".windsurf/")) {
    return "windsurf";
  }

  if (filePath === "README.md") {
    return "readme";
  }

  if (filePath === "package.json" || filePath.endsWith("/package.json")) {
    return "package-json";
  }

  if (filePath.endsWith("mcp.json") || filePath.endsWith(".mcp.json")) {
    return "mcp";
  }

  return "project-meta";
}

export function toAbsolutePath(rootDir: string, filePath: string): string {
  return resolve(rootDir, filePath);
}

export function toRelativePath(rootDir: string, filePath: string): string {
  const relativePath = relative(rootDir, filePath);
  return relativePath.length > 0 ? relativePath : ".";
}
