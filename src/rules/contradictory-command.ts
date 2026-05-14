import type { Issue, RuleModule, ScanContext } from "../core/types.js";

type CommandCategory = ScanContext["commands"][number]["category"];

type ContradictoryCommandRuleOptions = {
  category: CommandCategory;
  explanation: string;
  recommendation: string;
  ruleId: RuleModule["id"];
  title: string;
};

export function createContradictoryCommandRule(
  options: ContradictoryCommandRuleOptions,
): RuleModule {
  return {
    id: options.ruleId,
    check(context: ScanContext): Issue[] {
      const commands = context.commands.filter(
        (command) =>
          command.commandKind === "node-script" &&
          command.category === options.category,
      );

      if (new Set(commands.map((command) => command.file)).size < 2) {
        return [];
      }

      const scriptsByName = new Map<string, typeof commands>();
      for (const command of commands) {
        const existing = scriptsByName.get(command.scriptName) ?? [];
        existing.push(command);
        scriptsByName.set(command.scriptName, existing);
      }

      if (scriptsByName.size < 2) {
        return [];
      }

      return [
        {
          id: options.ruleId,
          ruleId: options.ruleId,
          title: options.title,
          severity: "MEDIUM",
          file: ".",
          evidence: [...scriptsByName.entries()]
            .map(([scriptName, entries]) =>
              formatCommandEvidence(scriptName, entries),
            )
            .join("; "),
          explanation: options.explanation,
          recommendation: options.recommendation,
          sourceKind: "project-meta",
          confidence: 0.84,
          relatedFiles: [
            ...new Set(
              [...scriptsByName.values()].flat().map((command) => command.file),
            ),
          ],
        },
      ];
    },
  };
}

function formatCommandEvidence(
  scriptName: string,
  commands: ScanContext["commands"],
): string {
  const locations = commands
    .map((command) => `${command.file}:${command.line}`)
    .join(", ");

  return `${scriptName} -> ${locations}`;
}
