import { relative, resolve } from "node:path";
import fg from "fast-glob";

import type { ContextDebtConfig, ContextFileKind } from "./types.js";

const rootScopedContextPatterns = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/copilot-instructions.md",
] as const;

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
  "poetry.lock",
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
  const roots = normalizeScanRoots(config.scan.roots);
  const patterns = scopePatternsToRoots(
    [...discoveryPatterns, ...config.scan.include],
    roots,
  );

  return discoverFromPatterns(rootDir, patterns, ignore);
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
  if (filePath === "AGENTS.md" || filePath.endsWith("/AGENTS.md")) {
    return "agents";
  }

  if (filePath === "CLAUDE.md" || filePath.endsWith("/CLAUDE.md")) {
    return "claude";
  }

  if (
    filePath.startsWith(".cursor/rules/") ||
    filePath.includes("/.cursor/rules/")
  ) {
    return "cursor-rule";
  }

  if (
    filePath === ".github/copilot-instructions.md" ||
    filePath.endsWith("/.github/copilot-instructions.md")
  ) {
    return "copilot";
  }

  if (filePath.startsWith(".codex/") || filePath.includes("/.codex/")) {
    return "codex";
  }

  if (filePath.startsWith(".windsurf/") || filePath.includes("/.windsurf/")) {
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

export function isPrimaryContextFile(filePath: string): boolean {
  return primaryContextPatterns.some((pattern) =>
    matchesPrimaryPattern(pattern, filePath),
  );
}

function matchesPrimaryPattern(pattern: string, filePath: string): boolean {
  if (pattern === "AGENTS.md") {
    return filePath === pattern || filePath.endsWith("/AGENTS.md");
  }

  if (pattern === "CLAUDE.md") {
    return filePath === pattern || filePath.endsWith("/CLAUDE.md");
  }

  if (pattern === ".github/copilot-instructions.md") {
    return (
      filePath === pattern ||
      filePath.endsWith("/.github/copilot-instructions.md")
    );
  }

  return (
    filePath.startsWith(".cursor/rules/") ||
    filePath.includes("/.cursor/rules/")
  );
}

function normalizeScanRoots(roots: string[]): string[] {
  const normalized = roots
    .map((root) =>
      root
        .trim()
        .replace(/^\.\/+/u, "")
        .replace(/\/+$/u, ""),
    )
    .filter((root) => root.length > 0 && root !== ".");

  return normalized.length > 0
    ? [...new Set(normalized)].sort((left, right) => left.localeCompare(right))
    : ["."];
}

function scopePatternsToRoots(patterns: string[], roots: string[]): string[] {
  if (roots.length === 1 && roots[0] === ".") {
    return patterns;
  }

  const scoped = roots.flatMap((root) =>
    patterns.flatMap((pattern) => scopePatternToRoot(root, pattern)),
  );

  return [...new Set(scoped)].sort((left, right) => left.localeCompare(right));
}

function scopePatternToRoot(root: string, pattern: string): string[] {
  if (
    rootScopedContextPatterns.includes(
      pattern as (typeof rootScopedContextPatterns)[number],
    )
  ) {
    return [`${root}/${pattern}`, `${root}/**/${pattern}`];
  }

  return [`${root}/${pattern}`];
}
