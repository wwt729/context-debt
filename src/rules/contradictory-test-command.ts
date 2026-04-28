import type { Issue, RuleModule, ScanContext } from "../core/types.js";

export const contradictoryTestCommandRule: RuleModule = {
  id: "contradictory-test-command",
  check(context: ScanContext): Issue[] {
    const testCommands = context.commands.filter(
      (command) => command.category === "test",
    );

    if (new Set(testCommands.map((command) => command.file)).size < 2) {
      return [];
    }

    const uniqueScripts = new Map<string, typeof testCommands>();
    for (const command of testCommands) {
      const existing = uniqueScripts.get(command.scriptName) ?? [];
      existing.push(command);
      uniqueScripts.set(command.scriptName, existing);
    }

    if (uniqueScripts.size < 2) {
      return [];
    }

    return [buildIssue(uniqueScripts)];
  },
};

function buildIssue(
  uniqueScripts: Map<string, ScanContext["commands"]>,
): Issue {
  const evidence = [...uniqueScripts.entries()]
    .map(([scriptName, commands]) => {
      const first = commands[0];
      return `${scriptName} (${first.file}:${first.line})`;
    })
    .join(", ");

  return {
    id: "contradictory-test-command",
    ruleId: "contradictory-test-command",
    title: "Different files recommend incompatible test commands",
    severity: "MEDIUM",
    file: ".",
    evidence,
    explanation:
      "Multiple AI instruction files point to different test scripts, which can send agents down inconsistent execution paths.",
    recommendation:
      "Align repository guidance on a single primary test command or clearly separate when each test command should be used.",
    sourceKind: "project-meta",
    confidence: 0.84,
  };
}
