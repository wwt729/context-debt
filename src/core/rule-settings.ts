import { withDerivedIssueFields } from "./confidence.js";
import {
  getRuleSetting,
  isRuleDisabled,
  resolveRuleSeverity,
} from "./config.js";
import type { Issue, RuleModule, ScanContext } from "./types.js";

export function runRuleWithSettings(
  context: ScanContext,
  rule: RuleModule,
): Issue[] {
  const setting = getRuleSetting(context.config, rule.id);
  if (isRuleDisabled(setting)) {
    return [];
  }

  return rule
    .check(context)
    .map((issue) => applyIssueSetting(issue, setting, rule));
}

function applyIssueSetting(
  issue: Issue,
  setting: { severity?: Issue["severity"] },
  rule: RuleModule,
): Issue {
  const nextIssue = {
    ...issue,
    severity: setting.severity
      ? setting.severity
      : resolveRuleSeverity(setting, issue.severity),
    autofixAvailable:
      issue.autofixAvailable ?? (rule.autofix ? true : undefined),
  };

  return withDerivedIssueFields(nextIssue);
}
