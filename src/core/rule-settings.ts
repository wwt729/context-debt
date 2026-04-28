import { withDerivedIssueFields } from "./confidence.js";
import { getRuleSetting, isRuleDisabled, resolveRuleSeverity } from "./config.js";
import type { Issue, RuleModule, ScanContext } from "./types.js";

export function runRuleWithSettings(
  context: ScanContext,
  rule: RuleModule,
): Issue[] {
  const setting = getRuleSetting(context.config, rule.id);
  if (isRuleDisabled(setting)) {
    return [];
  }

  return rule.check(context).map((issue) => applyIssueSetting(issue, setting));
}

function applyIssueSetting(
  issue: Issue,
  setting: { severity?: Issue["severity"] },
): Issue {
  const nextIssue = setting.severity
    ? { ...issue, severity: setting.severity }
    : {
        ...issue,
        severity: resolveRuleSeverity(setting, issue.severity),
      };

  return withDerivedIssueFields(nextIssue);
}
