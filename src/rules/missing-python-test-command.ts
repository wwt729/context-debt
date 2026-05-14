import type { Issue, RuleModule, ScanContext } from "../core/types.js";

export const missingPythonTestCommandRule: RuleModule = {
  id: "missing-python-test-command",
  check(context: ScanContext): Issue[] {
    return context.commands
      .filter((command) => command.commandKind === "python-test")
      .filter((command) => command.category === "test")
      .filter((command) => command.selfContained !== true)
      .filter((command) => !hasSelfContainedPythonTestCommand(context, command))
      .filter(() => !context.tooling.pythonTestTooling.hasPytest)
      .map((command) => buildIssue(context, command));
  },
};

function buildIssue(
  context: ScanContext,
  command: Extract<
    ScanContext["commands"][number],
    { category: "test"; commandKind: "python-test" }
  >,
): Issue {
  const evidenceFiles =
    context.tooling.pythonTestTooling.evidenceFiles.length > 0
      ? context.tooling.pythonTestTooling.evidenceFiles.join(", ")
      : "pyproject.toml, uv.lock, or poetry.lock";

  return {
    id: "missing-python-test-command",
    ruleId: "missing-python-test-command",
    title: "Referenced Python test command has no matching tooling signal",
    severity: "HIGH",
    file: command.file,
    line: command.line,
    evidence: `${command.command} was referenced, but no pytest tooling signal was found in ${evidenceFiles}.`,
    explanation:
      "AI instructions point to a Python pytest command, but repository metadata does not show a local pytest dependency or configuration.",
    recommendation:
      "Add pytest configuration or dependencies to pyproject.toml or lockfiles, or update the instruction to the correct Python test command.",
    sourceKind: command.sourceKind,
    confidence: 0.96,
  };
}

function hasSelfContainedPythonTestCommand(
  context: ScanContext,
  command: Extract<
    ScanContext["commands"][number],
    { category: "test"; commandKind: "python-test" }
  >,
): boolean {
  return context.commands.some(
    (candidate) =>
      candidate.commandKind === "python-test" &&
      candidate.category === "test" &&
      candidate.file === command.file &&
      candidate.selfContained === true,
  );
}
