import type { RuleModule, ScanContext } from "../core/types.js";
import { createMissingScriptIssues } from "./script-rule.js";

export const missingLintScriptRule: RuleModule = {
  id: "missing-lint-script",
  check(context: ScanContext) {
    return createMissingScriptIssues(context, {
      category: "lint",
      ruleId: "missing-lint-script",
      title: "Referenced lint command has no matching script",
    });
  },
};
