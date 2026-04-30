import { runRuleWithSettings } from "../core/rule-settings.js";
import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import { conflictingPackageManagerRule } from "./conflicting-package-manager.js";
import { contradictoryTestCommandRule } from "./contradictory-test-command.js";
import { dangerousMcpPermissionRule } from "./dangerous-mcp-permission.js";
import { duplicateInstructionsRule } from "./duplicate-instructions.js";
import { missingAiContextRule } from "./missing-ai-context.js";
import { missingBuildScriptRule } from "./missing-build-script.js";
import { missingLintScriptRule } from "./missing-lint-script.js";
import { missingTestScriptRule } from "./missing-test-script.js";
import { oversizedContextFileRule } from "./oversized-context-file.js";
import { referencedFileMissingRule } from "./referenced-file-missing.js";
import { repeatedNegativeRulesRule } from "./repeated-negative-rules.js";
import { staleReferenceRule } from "./stale-reference.js";
import { tokenWasteRule } from "./token-waste.js";
import { tooManyGlobalRulesRule } from "./too-many-global-rules.js";

export const rules: RuleModule[] = [
  missingAiContextRule,
  missingTestScriptRule,
  missingBuildScriptRule,
  missingLintScriptRule,
  conflictingPackageManagerRule,
  dangerousMcpPermissionRule,
  referencedFileMissingRule,
  contradictoryTestCommandRule,
  staleReferenceRule,
  oversizedContextFileRule,
  duplicateInstructionsRule,
  tokenWasteRule,
  repeatedNegativeRulesRule,
  tooManyGlobalRulesRule,
];

export const ruleIds = rules
  .map((rule) => rule.id)
  .sort((left, right) => left.localeCompare(right));

export function runRules(context: ScanContext): Issue[] {
  return rules.flatMap((rule) => runRuleWithSettings(context, rule));
}
