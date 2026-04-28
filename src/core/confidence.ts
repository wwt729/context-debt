import type { ConfidenceLabel, Issue } from "./types.js";

const HIGH_CONFIDENCE_MIN = 0.9;
const MEDIUM_CONFIDENCE_MIN = 0.75;

export function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= HIGH_CONFIDENCE_MIN) {
    return "high";
  }

  if (confidence >= MEDIUM_CONFIDENCE_MIN) {
    return "medium";
  }

  return "low";
}

export function withDerivedIssueFields(issue: Issue): Issue {
  return {
    ...issue,
    confidenceLabel: issue.confidenceLabel ?? getConfidenceLabel(issue.confidence),
    relatedFiles: normalizeRelatedFiles(issue),
  };
}

export function isStrictFailureIssue(issue: Issue): boolean {
  return issue.severity === "MEDIUM" && issue.confidenceLabel === "high";
}

function normalizeRelatedFiles(issue: Issue): string[] | undefined {
  if (!issue.relatedFiles?.length) {
    return undefined;
  }

  const unique = [...new Set(issue.relatedFiles)].filter(
    (path) => path !== issue.file,
  );

  return unique.length > 0 ? unique : undefined;
}
