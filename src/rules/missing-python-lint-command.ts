import type { Issue, RuleModule, ScanContext } from "../core/types.js";

export const missingPythonLintCommandRule: RuleModule = {
  id: "missing-python-lint-command",
  check(context: ScanContext): Issue[] {
    return context.commands
      .filter((command) => command.commandKind === "python-lint")
      .filter((command) => command.category === "lint")
      .filter((command) => command.selfContained !== true)
      .filter((command) => !hasSelfContainedPythonLintCommand(context, command))
      .filter(() => !context.tooling.pythonLintTooling.hasRuff)
      .map((command) => buildIssue(context, command));
  },
};

function buildIssue(
  context: ScanContext,
  command: Extract<
    ScanContext["commands"][number],
    { category: "lint"; commandKind: "python-lint" }
  >,
): Issue {
  const evidenceFiles =
    context.tooling.pythonLintTooling.evidenceFiles.length > 0
      ? context.tooling.pythonLintTooling.evidenceFiles.join(", ")
      : "pyproject.toml, uv.lock, or poetry.lock";

  return {
    id: "missing-python-lint-command",
    ruleId: "missing-python-lint-command",
    title: "Referenced Python lint command has no matching tooling signal",
    severity: "HIGH",
    file: command.file,
    line: command.line,
    evidence: `${command.command} was referenced, but no ruff tooling signal was found in ${evidenceFiles}.`,
    explanation:
      "AI instructions point to a Python ruff command, but repository metadata does not show a local ruff dependency or configuration.",
    recommendation:
      "Add ruff configuration or dependencies to pyproject.toml or lockfiles, or update the instruction to the correct Python lint command.",
    sourceKind: command.sourceKind,
    confidence: 0.96,
  };
}

function hasSelfContainedPythonLintCommand(
  context: ScanContext,
  command: Extract<
    ScanContext["commands"][number],
    { category: "lint"; commandKind: "python-lint" }
  >,
): boolean {
  return context.commands.some(
    (candidate) =>
      candidate.commandKind === "python-lint" &&
      candidate.category === "lint" &&
      candidate.file === command.file &&
      candidate.selfContained === true,
  );
}
