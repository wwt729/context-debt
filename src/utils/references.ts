import { existsSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

import { hasKnownFileExtension, knownRootSegments } from "./path-patterns.js";

type ReferenceResolution = {
  candidates: string[];
  resolvedPath: string;
};

export function resolveReference(
  rootDir: string,
  sourceFile: string,
  value: string,
): string {
  return resolveReferenceWithCandidates(rootDir, sourceFile, value)
    .resolvedPath;
}

function resolveReferenceWithCandidates(
  rootDir: string,
  sourceFile: string,
  value: string,
): ReferenceResolution {
  if (value.startsWith("/")) {
    const resolvedPath = resolve(rootDir, `.${value}`);
    return {
      candidates: [resolvedPath],
      resolvedPath,
    };
  }

  const sourceRelative = resolve(rootDir, dirname(sourceFile), value);
  const candidates = [sourceRelative];

  if (shouldTryRootFallback(value)) {
    const rootRelative = resolve(rootDir, value);
    if (rootRelative !== sourceRelative) {
      candidates.push(rootRelative);
    }
  }

  const resolvedPath = candidates.find(pathExists) ?? candidates[0];
  return {
    candidates,
    resolvedPath,
  };
}

export function normalizeResolvedPath(
  rootDir: string,
  resolvedPath: string,
): string {
  return relative(rootDir, resolvedPath).replaceAll("\\", "/");
}

export function isGeneratedRuntimePath(value: string): boolean {
  return extname(value) === ".log";
}

export function isDeprecatedPath(value: string): boolean {
  return /(?:^|\/)(legacy|old|deprecated|tmp|backup)(?:\/|$)/iu.test(value);
}

function shouldTryRootFallback(value: string): boolean {
  if (
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/") ||
    value.endsWith("/")
  ) {
    return false;
  }

  if (!value.includes("/")) {
    return hasKnownFileExtension(value);
  }

  const firstSegment = value.split("/")[0] ?? "";
  return knownRootSegments.has(firstSegment);
}

function pathExists(candidate: string): boolean {
  return existsSync(candidate);
}
