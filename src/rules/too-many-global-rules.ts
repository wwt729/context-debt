import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import { countBroadDirectives } from "../utils/instruction-text.js";

const maximumBroadDirectives = 12;

export const tooManyGlobalRulesRule: RuleModule = {
  id: "too-many-global-rules",
  check(context: ScanContext): Issue[] {
    return context.contextFiles
      .filter((file) => file.kind === "agents" || file.kind === "claude")
      .map((file) => ({ count: countBroadDirectives(file), file }))
      .filter((entry) => entry.count > maximumBroadDirectives)
      .map(({ count, file }) => ({
        id: "too-many-global-rules",
        ruleId: "too-many-global-rules",
        title: "Global instruction file has too many broad rules",
        severity: "MEDIUM",
        file: file.path,
        evidence: `${file.path} contains ${count} broad directive lines, above the limit of ${maximumBroadDirectives}.`,
        explanation:
          "Large global rule sets make it harder for agents to identify which guidance truly applies everywhere.",
        recommendation:
          "Move directory-specific guidance into scoped files and keep only repository-wide rules in the global context file.",
        sourceKind: file.kind,
        confidence: 0.8,
      }));
  },
};
