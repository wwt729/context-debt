import type { RuleModule, ScanContext } from "../core/types.js";
import { createMissingScriptIssues } from "./script-rule.js";

export const missingBuildScriptRule: RuleModule = {
  id: "missing-build-script",
  check(context: ScanContext) {
    return createMissingScriptIssues(context, {
      category: "build",
      ruleId: "missing-build-script",
      title: "Referenced build command has no matching script",
    });
  },
};
