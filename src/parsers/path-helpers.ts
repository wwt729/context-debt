import type { PathCandidateKind } from "../core/types.js";
import {
  isDeprecatedPath,
  isGeneratedRuntimePath,
} from "../utils/references.js";

const knownRootSegments = new Set([
  ".github",
  ".cursor",
  ".codex",
  ".windsurf",
  "app",
  "src",
  "lib",
  "docs",
  "routes",
  "database",
  "storage",
  "config",
  "tests",
  "packages",
  "public",
  "resources",
  "scripts",
  "bin",
  "cmd",
]);

export function isLikelyLocalPath(
  value: string,
  allowSingleFile: boolean,
): boolean {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }

  if (value.includes("{") || value.includes("}")) {
    return false;
  }

  if (value.includes("*") || value.includes(" ")) {
    return false;
  }

  if (value === "test" || value === "build" || value === "lint") {
    return false;
  }

  if (isLikelyPackageName(value) || isLikelyRoutePrefix(value)) {
    return false;
  }

  if (value.startsWith("./") || value.startsWith("../")) {
    return true;
  }

  if (value.startsWith("/")) {
    return value.split("/").filter(Boolean).length > 1;
  }

  if (isDeprecatedPath(value)) {
    return value.endsWith("/") || hasKnownFileExtension(value);
  }

  if (!value.includes("/")) {
    return allowSingleFile && hasKnownFileExtension(value);
  }

  if (!hasKnownFileExtension(value) && !value.endsWith("/")) {
    return false;
  }

  return knownRootSegments.has(value.split("/")[0] ?? "");
}

export function classifyPathCandidate(
  value: string,
  lineText: string,
  allowSingleFile: boolean,
): PathCandidateKind {
  if (isUrl(value)) {
    return "url";
  }

  if (isGlobPattern(value)) {
    return "glob-pattern";
  }

  if (isGeneratedRuntimePath(value)) {
    return "generated-file";
  }

  if (isCommandArgument(lineText, value)) {
    return "command-argument";
  }

  if (isLikelyPackageName(value)) {
    return "package-reference";
  }

  if (
    isStrongExamplePath(lineText) ||
    (isWeakExamplePath(lineText) && !hasActionVerb(lineText))
  ) {
    return "example-path";
  }

  return isLikelyLocalPath(value, allowSingleFile) ? "local-file" : "unknown";
}

function hasKnownFileExtension(value: string): boolean {
  return /\.(md|mdc|json|toml|yml|yaml|txt|js|ts|tsx|jsx|php|py|rs|go|java|sh|log)$/u.test(
    value,
  );
}

function isLikelyPackageName(value: string): boolean {
  return (
    !hasKnownFileExtension(value) &&
    /^[a-z0-9._-]+\/[a-z0-9._-]+\/?$/u.test(value)
  );
}

function isLikelyRoutePrefix(value: string): boolean {
  return value.startsWith("/") && value.split("/").filter(Boolean).length <= 1;
}

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isGlobPattern(value: string): boolean {
  return (
    value.includes("*") ||
    value.includes("{") ||
    value.includes("}") ||
    value.includes("[") ||
    value.includes("]")
  );
}

function isCommandArgument(lineText: string, value: string): boolean {
  return new RegExp(
    `--[\\w-]+(?:=|\\s+)${escapeRegExp(value)}(?:[\\s.,;:)]|$)`,
    "u",
  ).test(lineText);
}

function isStrongExamplePath(lineText: string): boolean {
  return /\b(?:for example|e\.g\.)\b|as an example\b/iu.test(lineText);
}

function isWeakExamplePath(lineText: string): boolean {
  return /\blike\b/iu.test(lineText);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function hasActionVerb(lineText: string): boolean {
  return /\b(?:read|open|see|check|review|use|edit|inspect|follow|update|create|compare|load|visit)\b/iu.test(
    lineText,
  );
}
