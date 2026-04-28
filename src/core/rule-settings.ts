import { getRuleSetting } from "./config.js";
import type { Issue, RuleModule, ScanContext } from "./types.js";

export function runRuleWithSettings(
  context: ScanContext,
  rule: RuleModule,
): Issue[] {
  const setting = getRuleSetting(context.config, rule.id);
  if (setting.enabled === false) {
    return [];
  }

  return rule.check(context).map((issue) => applyIssueSetting(issue, setting));
}

function applyIssueSetting(
  issue: Issue,
  setting: { severity?: Issue["severity"] },
): Issue {
  if (!setting.severity) {
    return issue;
  }

  return {
    ...issue,
    severity: setting.severity,
  };
}
