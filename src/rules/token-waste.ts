import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import {
  getAiInstructionFiles,
  getDuplicateUnits,
} from "../utils/context-units.js";

export const tokenWasteRule: RuleModule = {
  id: "token-waste",
  check(context: ScanContext): Issue[] {
    const duplicates = getDuplicateUnits(getAiInstructionFiles(context));
    const duplicateWords = [...duplicates.values()].reduce(
      (total, entries) => total + entries[0].tokenCount * (entries.length - 1),
      0,
    );

    if (duplicateWords < context.config.thresholds.tokenWasteMinWords) {
      return [];
    }

    return [
      {
        id: "token-waste",
        ruleId: "token-waste",
        title: "Repeated instructions are wasting context budget",
        severity: "LOW",
        file: ".",
        evidence: `Approx. ${duplicateWords} duplicated words/tokens detected across ${duplicates.size} repeated instruction blocks.`,
        explanation:
          "Repeated setup and workflow guidance adds cost to every AI session without increasing signal.",
        recommendation:
          "Consolidate repeated instructions into a shared canonical file and reference it from tool-specific context files.",
        sourceKind: "project-meta",
        confidence: 0.82,
        relatedFiles: [
          ...new Set(
            [...duplicates.values()].flat().map((entry) => entry.file),
          ),
        ],
      },
    ];
  },
};
