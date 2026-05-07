import { existsSync } from "node:fs";

import { getConfidenceLabel } from "../core/confidence.js";
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
      const confidence = getReferenceConfidence(reference.referenceType);
      const confidenceLabel = getConfidenceLabel(confidence);

      if (
        seen.has(key) ||
        reference.candidateKind !== "local-file" ||
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
        severity: confidenceLabel === "high" ? "HIGH" : "MEDIUM",
        file: reference.file,
        line: reference.line,
        evidence: `${reference.value} was referenced, but ${resolved} does not exist.`,
        explanation:
          "AI instructions refer to a local file or path that is not present in the repository.",
        recommendation:
          "Create the referenced file or update the instruction to point at an existing path.",
        sourceKind: reference.sourceKind,
        confidence,
        confidenceLabel,
        resolvedPath: relativePath,
      });
    }

    return issues;
  },
  autofix(context, issues, session) {
    for (const issue of issues) {
      const missingPath = issue.evidence.split(" was referenced")[0];
      const file = context.contextFiles.find(
        (entry) => entry.path === issue.file,
      );

      if (!file || !missingPath) {
        continue;
      }

      session.updateFile(
        file.path,
        file.content,
        (content) =>
          content
            .split("\n")
            .filter((line) => !line.includes(missingPath))
            .join("\n")
            .replace(/\n{3,}/gu, "\n\n"),
        `removed missing reference ${missingPath}`,
      );
    }
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
