import type { Issue, RuleModule, ScanContext } from "../core/types.js";

const contextKinds = new Set([
  "agents",
  "claude",
  "cursor-rule",
  "copilot",
  "codex",
  "windsurf",
  "readme",
]);

export const oversizedContextFileRule: RuleModule = {
  id: "oversized-context-file",
  check(context: ScanContext): Issue[] {
    return context.contextFiles
      .filter((file) => contextKinds.has(file.kind))
      .filter(
        (file) =>
          file.content.length > context.config.thresholds.oversizedContextChars,
      )
      .map((file) => ({
        id: "oversized-context-file",
        ruleId: "oversized-context-file",
        title: "Context file is unusually large",
        severity: "MEDIUM",
        file: file.path,
        evidence: `${file.path} contains ${file.content.length} characters, above the configured limit of ${context.config.thresholds.oversizedContextChars}.`,
        explanation:
          "Large AI context files increase token cost and make it harder for agents to keep critical instructions in focus.",
        recommendation:
          "Split broad instructions into smaller scoped files or remove redundant content from this context file.",
        sourceKind: file.kind,
        confidence: 0.99,
      }));
  },
};
