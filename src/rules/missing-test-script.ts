import type { RuleModule, ScanContext } from "../core/types.js";
import { createMissingScriptIssues } from "./script-rule.js";

export const missingTestScriptRule: RuleModule = {
  id: "missing-test-script",
  check(context: ScanContext) {
    return createMissingScriptIssues(context, {
      category: "test",
      ruleId: "missing-test-script",
      title: "Referenced test command has no matching script",
    });
  },
};
