import { existsSync } from "node:fs";
import { basename, extname } from "node:path";
import fg from "fast-glob";

import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import {
  isDeprecatedPath,
  isGeneratedRuntimePath,
  normalizeResolvedPath,
  resolveReference,
} from "../utils/references.js";

export const staleReferenceRule: RuleModule = {
  id: "stale-reference",
  check(context: ScanContext): Issue[] {
    return context.pathReferences
      .filter((reference) => reference.candidateKind === "local-file")
      .map((reference) => buildIssue(context, reference))
      .filter((issue): issue is Issue => issue !== null);
  },
};

function buildIssue(
  context: ScanContext,
  reference: ScanContext["pathReferences"][number],
): Issue | null {
  const resolved = resolveReference(
    context.rootDir,
    reference.file,
    reference.value,
  );
  const relativePath = normalizeResolvedPath(context.rootDir, resolved);
  if (existsSync(resolved) || isGeneratedRuntimePath(reference.value)) {
    return null;
  }

  const replacementCandidates = findReplacementCandidates(
    context,
    relativePath,
  );
  if (replacementCandidates.length === 0) {
    return null;
  }

  if (!isLikelyStaleReference(reference, relativePath, replacementCandidates)) {
    return null;
  }

  return {
    id: "stale-reference",
    ruleId: "stale-reference",
    title: "Stale reference points to a deprecated or removed path",
    severity: "MEDIUM",
    file: reference.file,
    line: reference.line,
    evidence: `${reference.value} looks like a deprecated path, ${relativePath} does not exist, and similar current paths were found: ${replacementCandidates.join(", ")}.`,
    explanation:
      "AI instructions still reference a legacy-style path that appears to have been removed or renamed.",
    recommendation: `Update the instruction to a current repository path such as ${replacementCandidates[0]}.`,
    sourceKind: reference.sourceKind,
    confidence: 0.9,
    resolvedPath: relativePath,
    relatedFiles: replacementCandidates,
  };
}

function isLikelyStaleReference(
  reference: ScanContext["pathReferences"][number],
  relativePath: string,
  replacementCandidates: string[],
): boolean {
  if (isDeprecatedPath(reference.value) || isDeprecatedPath(relativePath)) {
    return true;
  }

  if (reference.referenceType === "instruction-text") {
    return false;
  }

  if (replacementCandidates.length !== 1) {
    return false;
  }
  return true;
}

function findReplacementCandidates(
  context: ScanContext,
  relativePath: string,
): string[] {
  const targetBaseName = basename(relativePath);
  const targetStem = stripExtension(targetBaseName);
  const discoveredCandidates = [...context.discoveredPaths].filter((path) =>
    hasSameBaseName(path, targetBaseName, targetStem),
  );
  const repoCandidates = fg
    .sync([`**/${targetBaseName}`], {
      cwd: context.rootDir,
      dot: true,
      ignore: context.config.scan.exclude.map((entry) =>
        entry.endsWith("/**") ? entry : `${entry}/**`,
      ),
      onlyFiles: true,
      unique: true,
    })
    .filter((path) => hasSameBaseName(path, targetBaseName, targetStem));
  const candidates = [...new Set([...discoveredCandidates, ...repoCandidates])]
    .filter((path) => path !== relativePath)
    .sort((left, right) => left.localeCompare(right));

  return candidates.slice(0, 3);
}

function hasSameBaseName(
  candidatePath: string,
  targetBaseName: string,
  targetStem: string,
): boolean {
  const candidateBaseName = basename(candidatePath);
  const candidateStem = stripExtension(candidateBaseName);

  return candidateBaseName === targetBaseName || candidateStem === targetStem;
}

function stripExtension(value: string): string {
  const extension = extname(value);
  return extension.length > 0 ? value.slice(0, -extension.length) : value;
}
