import { existsSync } from "node:fs";

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
      .filter((reference) => isDeprecatedPath(reference.value))
      .filter((reference) => !isIgnoredOrExisting(context, reference))
      .map((reference) => buildIssue(context, reference));
  },
};

function isIgnoredOrExisting(
  context: ScanContext,
  reference: ScanContext["pathReferences"][number],
): boolean {
  const resolved = resolveReference(
    context.rootDir,
    reference.file,
    reference.value,
  );
  return existsSync(resolved) || isGeneratedRuntimePath(reference.value);
}

function buildIssue(
  context: ScanContext,
  reference: ScanContext["pathReferences"][number],
): Issue {
  const resolved = resolveReference(
    context.rootDir,
    reference.file,
    reference.value,
  );
  const relativePath = normalizeResolvedPath(context.rootDir, resolved);

  return {
    id: "stale-reference",
    ruleId: "stale-reference",
    title: "Stale reference points to a deprecated or removed path",
    severity: "MEDIUM",
    file: reference.file,
    line: reference.line,
    evidence: `${reference.value} looks like a deprecated path and ${relativePath} does not exist.`,
    explanation:
      "AI instructions still reference a legacy-style path that appears to have been removed or renamed.",
    recommendation:
      "Remove the stale path from AI instructions or update it to the current repository location.",
    sourceKind: reference.sourceKind,
    confidence: 0.88,
    resolvedPath: relativePath,
  };
}
