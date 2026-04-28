import type { Issue, RuleModule, ScanContext } from "../core/types.js";

type ScriptRuleOptions = {
  category: "test" | "build" | "lint";
  ruleId: RuleModule["id"];
  title: string;
};

export function createMissingScriptIssues(
  context: ScanContext,
  options: ScriptRuleOptions,
): Issue[] {
  return context.commands
    .filter((command) => command.category === options.category)
    .filter((command) => !context.packageJson?.scripts[command.scriptName])
    .map((command) => ({
      id: options.ruleId,
      ruleId: options.ruleId,
      title: options.title,
      severity: "HIGH",
      file: command.file,
      line: command.line,
      evidence: `${command.command} was referenced, but package.json has no "${command.scriptName}" script.`,
      explanation:
        "AI instructions point to a Node command that cannot be resolved in package.json.",
      recommendation: `Add scripts.${command.scriptName} to package.json or update the instruction to the correct ${options.category} command.`,
      sourceKind: command.sourceKind,
      confidence: 0.98,
    }));
}
