import type { ExtractedPathReference } from "../core/types.js";
import { isDeprecatedPath } from "../utils/references.js";

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

export function getReferenceType(
  allowSingleFile: boolean,
  value: string,
): ExtractedPathReference["referenceType"] {
  if (value.startsWith("./") || value.startsWith("../")) {
    return "markdown-link";
  }

  return allowSingleFile ? "inline-code" : "instruction-text";
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
