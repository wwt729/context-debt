import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import {
  estimateTokenWasteFromChars,
  getAiInstructionFiles,
  getDuplicateUnits,
  summarizeDuplicateSources,
} from "../utils/context-units.js";

export const tokenWasteRule: RuleModule = {
  id: "token-waste",
  check(context: ScanContext): Issue[] {
    const aiFiles = getAiInstructionFiles(context);
    const duplicates = getDuplicateUnits(aiFiles);
    const duplicatedChars = getDuplicatedChars(duplicates);
    const estimatedWastedTokens = estimateTokenWasteFromChars(duplicatedChars);

    if (estimatedWastedTokens < context.config.thresholds.tokenWasteMinWords) {
      return [];
    }

    const topSources = summarizeDuplicateSources(duplicates).slice(0, 3);
    const canonicalFile = pickCanonicalWasteFile(aiFiles, topSources);
    const relatedFiles = topSources.map((entry) => entry.file);

    return [
      {
        id: "token-waste",
        ruleId: "token-waste",
        title: "Repeated instructions are wasting context budget",
        severity: "LOW",
        file: canonicalFile ?? ".",
        evidence: buildWasteEvidence(
          duplicatedChars,
          estimatedWastedTokens,
          duplicates.size,
          topSources,
        ),
        explanation:
          "Repeated setup and workflow guidance adds cost to every AI session without increasing signal.",
        recommendation: buildWasteRecommendation(canonicalFile, relatedFiles),
        sourceKind: "project-meta",
        confidence: 0.82,
        relatedFiles,
      },
    ];
  },
};

function getDuplicatedChars(
  duplicates: ReturnType<typeof getDuplicateUnits>,
): number {
  return [...duplicates.values()].reduce((total, entries) => {
    return total + entries[0].raw.length * (entries.length - 1);
  }, 0);
}

function buildWasteEvidence(
  duplicatedChars: number,
  estimatedWastedTokens: number,
  repeatedBlocks: number,
  topSources: ReturnType<typeof summarizeDuplicateSources>,
): string {
  const topSourceSummary = topSources
    .map((entry) => `${entry.file} (${entry.duplicatedChars} chars)`)
    .join(", ");

  return `Approx. ${duplicatedChars} duplicated chars (~${estimatedWastedTokens} wasted tokens) detected across ${repeatedBlocks} repeated instruction blocks. Top duplicate sources: ${topSourceSummary}.`;
}

function buildWasteRecommendation(
  canonicalFile: string | undefined,
  relatedFiles: string[],
): string {
  if (!canonicalFile) {
    return "Consolidate repeated setup instructions into one canonical AI context file and remove the duplicated blocks elsewhere.";
  }

  const duplicateFiles = relatedFiles.filter((file) => file !== canonicalFile);
  if (duplicateFiles.length === 0) {
    return `Keep the shared setup guidance in ${canonicalFile} and remove repeated blocks elsewhere.`;
  }

  return `Keep the shared setup guidance in ${canonicalFile} and trim duplicated instruction blocks from ${duplicateFiles.join(", ")}.`;
}

function pickCanonicalWasteFile(
  aiFiles: ScanContext["contextFiles"],
  topSources: ReturnType<typeof summarizeDuplicateSources>,
): string | undefined {
  const duplicatedFiles = new Set(topSources.map((entry) => entry.file));
  const preferredKinds = [
    "agents",
    "claude",
    "cursor-rule",
    "copilot",
  ] as const;

  for (const kind of preferredKinds) {
    const match = aiFiles.find(
      (file) => file.kind === kind && duplicatedFiles.has(file.path),
    );
    if (match) {
      return match.path;
    }
  }

  return topSources[0]?.file;
}
