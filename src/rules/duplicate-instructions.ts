import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import {
  calculateUnitSimilarity,
  getAiInstructionFiles,
} from "../utils/context-units.js";

const minimumSharedUnits = 2;

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

        issues.push({
          id: "duplicate-instructions",
          ruleId: "duplicate-instructions",
          title: "Two AI instruction files appear to duplicate each other",
          severity: "MEDIUM",
          file: left.path,
          evidence: `${left.path} and ${right.path} share ${Math.round(similarity.score * 100)}% normalized instruction overlap.`,
          explanation:
            "Multiple instruction files repeat the same guidance, which increases token cost and makes ownership unclear.",
          recommendation:
            "Keep shared repository-wide guidance in one canonical file and leave tool-specific files only for tool-specific behavior.",
          sourceKind: left.kind,
          confidence: 0.87,
          relatedFiles: [right.path],
        });
      }
    }

    return issues;
  },
};
