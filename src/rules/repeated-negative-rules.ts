import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import {
  getNegativeRuleMatches,
  normalizeNegativeRule,
} from "../utils/instruction-text.js";

const minimumRepeatedRules = 3;

type NegativeEntry = {
  file: string;
  line: number;
  sourceKind: Issue["sourceKind"];
};

export const repeatedNegativeRulesRule: RuleModule = {
  id: "repeated-negative-rules",
  check(context: ScanContext): Issue[] {
    const matches = new Map<string, NegativeEntry[]>();

    for (const file of context.contextFiles) {
      for (const match of getNegativeRuleMatches(file)) {
        const normalized = normalizeNegativeRule(match.text);
        const existing = matches.get(normalized) ?? [];
        existing.push({
          file: file.path,
          line: match.line,
          sourceKind: file.kind,
        });
        matches.set(normalized, existing);
      }
    }

    return [...matches.entries()]
      .filter(([, entries]) => entries.length >= minimumRepeatedRules)
      .map(([normalized, entries]) => buildIssue(normalized, entries));
  },
};

function buildIssue(normalized: string, entries: NegativeEntry[]): Issue {
  const first = entries[0];
  const evidence = entries
    .map((entry) => `${entry.file}:${entry.line}`)
    .slice(0, 3)
    .join(", ");

  return {
    id: "repeated-negative-rules",
    ruleId: "repeated-negative-rules",
    title: "The same negative instruction is repeated multiple times",
    severity: "LOW",
    file: first.file,
    line: first.line,
    evidence: `"${normalized}" appears ${entries.length} times across ${evidence}.`,
    explanation:
      "Repeated 'do not' style guidance adds token cost without increasing clarity once the rule is already established.",
    recommendation:
      "Keep the strongest version of the rule in one place and remove repeated negative phrasing elsewhere.",
    sourceKind: first.sourceKind,
    confidence: 0.83,
  };
}
