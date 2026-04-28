import { existsSync } from "node:fs";

import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import { isIgnoredReference } from "../utils/reference-ignore.js";
import {
  isGeneratedRuntimePath,
  normalizeResolvedPath,
  resolveReference,
} from "../utils/references.js";

export const referencedFileMissingRule: RuleModule = {
  id: "referenced-file-missing",
  check(context: ScanContext): Issue[] {
    const issues: Issue[] = [];
    const seen = new Set<string>();

    for (const reference of context.pathReferences) {
      const resolved = resolveReference(
        context.rootDir,
        reference.file,
        reference.value,
      );
      const relativePath = normalizeResolvedPath(context.rootDir, resolved);
      const key = `${reference.file}:${reference.value}`;

      if (
        seen.has(key) ||
        existsSync(resolved) ||
        isGeneratedRuntimePath(reference.value) ||
        isIgnoredReference(context, reference.value, relativePath)
      ) {
        continue;
      }

      seen.add(key);
      issues.push({
        id: "referenced-file-missing",
        ruleId: "referenced-file-missing",
        title: "Referenced local file does not exist",
        severity: "HIGH",
        file: reference.file,
        line: reference.line,
        evidence: `${reference.value} was referenced, but ${resolved} does not exist.`,
        explanation:
          "AI instructions refer to a local file or path that is not present in the repository.",
        recommendation:
          "Create the referenced file or update the instruction to point at an existing path.",
        sourceKind: reference.sourceKind,
        confidence: getReferenceConfidence(reference.referenceType),
        resolvedPath: relativePath,
      });
    }

    return issues;
  },
};

function getReferenceConfidence(
  referenceType: ScanContext["pathReferences"][number]["referenceType"],
): number {
  if (referenceType === "markdown-link") {
    return 0.99;
  }

  if (referenceType === "inline-code") {
    return 0.9;
  }

  return 0.78;
}
