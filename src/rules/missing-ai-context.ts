import { primaryContextPatterns } from "../core/discovery.js";
import type { Issue, RuleModule, ScanContext } from "../core/types.js";

export const missingAiContextRule: RuleModule = {
  id: "missing-ai-context",
  check(context: ScanContext): Issue[] {
    const hasPrimaryContext = context.contextFiles.some((file) =>
      matchesPrimaryContext(file.path),
    );

    if (hasPrimaryContext) {
      return [];
    }

    return [
      {
        id: "missing-ai-context",
        ruleId: "missing-ai-context",
        title: "No primary AI instruction files found",
        severity: "LOW",
        file: ".",
        evidence:
          "No AGENTS.md, CLAUDE.md, Cursor rules, or Copilot instructions were found.",
        explanation: "Agents may lack project-specific guidance.",
        recommendation: "Add AGENTS.md or another primary AI instruction file.",
        sourceKind: "project-meta",
        confidence: 0.99,
      },
    ];
  },
};

function matchesPrimaryContext(path: string): boolean {
  return primaryContextPatterns.some((pattern) => {
    if (pattern.includes("**")) {
      return path.startsWith(".cursor/rules/");
    }
    return path === pattern;
  });
}
