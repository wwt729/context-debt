import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import {
  calculateUnitSimilarity,
  getAiInstructionFiles,
} from "../utils/context-units.js";

const minimumSharedUnits = 2;
const sampleLimit = 3;
const fileKindPriority: Record<
  ScanContext["contextFiles"][number]["kind"],
  number
> = {
  agents: 0,
  claude: 1,
  "cursor-rule": 2,
  copilot: 3,
  codex: 4,
  windsurf: 5,
  readme: 6,
  "package-json": 7,
  mcp: 8,
  "project-meta": 9,
};

export const duplicateInstructionsRule: RuleModule = {
  id: "duplicate-instructions",
  check(context: ScanContext): Issue[] {
    const files = getAiInstructionFiles(context);
    const issues: Issue[] = [];

    for (let index = 0; index < files.length; index += 1) {
      for (
        let nextIndex = index + 1;
        nextIndex < files.length;
        nextIndex += 1
      ) {
        const left = files[index];
        const right = files[nextIndex];
        const similarity = calculateUnitSimilarity(left, right);

        if (
          similarity.sharedCount < minimumSharedUnits ||
          similarity.score <
            context.config.thresholds.duplicateInstructionSimilarity
        ) {
          continue;
        }

        const canonicalFile = pickCanonicalFile(left, right);
        const duplicateFile = canonicalFile.path === left.path ? right : left;
        issues.push({
          id: "duplicate-instructions",
          ruleId: "duplicate-instructions",
          title: "Two AI instruction files appear to duplicate each other",
          severity: "MEDIUM",
          file: canonicalFile.path,
          evidence: buildEvidence(left.path, right.path, similarity),
          explanation:
            "Multiple instruction files repeat the same guidance, which increases token cost and makes ownership unclear.",
          recommendation: `Keep the shared instruction block in ${canonicalFile.path} and trim the duplicate guidance from ${duplicateFile.path}.`,
          sourceKind: canonicalFile.kind,
          confidence: getDuplicateConfidence(similarity.score),
          relatedFiles: [duplicateFile.path],
        });
      }
    }

    return issues;
  },
};

function buildEvidence(
  leftPath: string,
  rightPath: string,
  similarity: ReturnType<typeof calculateUnitSimilarity>,
): string {
  const repeatedSections = similarity.samples
    .slice(0, sampleLimit)
    .map((sample) => `"${sample}"`)
    .join(", ");

  return `${leftPath} and ${rightPath} share ${Math.round(similarity.score * 100)}% normalized overlap, covering ${Math.round(similarity.leftCoverage * 100)}% of ${leftPath} and ${Math.round(similarity.rightCoverage * 100)}% of ${rightPath}. Repeated sections: ${repeatedSections}.`;
}

function pickCanonicalFile(
  left: ScanContext["contextFiles"][number],
  right: ScanContext["contextFiles"][number],
): ScanContext["contextFiles"][number] {
  const priorityDiff =
    fileKindPriority[left.kind] - fileKindPriority[right.kind];
  if (priorityDiff !== 0) {
    return priorityDiff < 0 ? left : right;
  }

  return left.path.localeCompare(right.path) <= 0 ? left : right;
}

function getDuplicateConfidence(score: number): number {
  if (score >= 0.9) {
    return 0.92;
  }

  if (score >= 0.75) {
    return 0.87;
  }

  return 0.8;
}
