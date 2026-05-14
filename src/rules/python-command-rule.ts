import type {
  ExtractedCommand,
  Issue,
  PythonCommandCategory,
  PythonCommandKind,
  PythonToolName,
  RuleModule,
  ScanContext,
} from "../core/types.js";

const defaultEvidenceFiles = "pyproject.toml, uv.lock, or poetry.lock";

type MissingPythonCommandRuleOptions = {
  explanation: string;
  id: string;
  recommendation: string;
  title: string;
  tool: PythonToolName;
};

export function createMissingPythonCommandRule(
  options: MissingPythonCommandRuleOptions,
): RuleModule {
  return {
    id: options.id,
    check(context: ScanContext): Issue[] {
      const tooling = context.tooling.pythonTooling[options.tool];
      if (tooling.present) {
        return [];
      }

      return findPythonCommands(context, tooling)
        .filter((command) => command.selfContained !== true)
        .filter((command) => !hasSelfContainedPythonCommand(context, command))
        .map((command) =>
          buildMissingPythonCommandIssue(command, tooling, options),
        );
    },
  };
}

export function findPythonCommands(
  context: ScanContext,
  options: {
    category: PythonCommandCategory;
    commandKind: PythonCommandKind;
  },
): ExtractedCommand[] {
  return context.commands.filter(
    (command) =>
      command.category === options.category &&
      command.commandKind === options.commandKind,
  );
}

function buildMissingPythonCommandIssue(
  command: ExtractedCommand,
  tooling: ScanContext["tooling"]["pythonTooling"][PythonToolName],
  options: MissingPythonCommandRuleOptions,
): Issue {
  const evidenceFiles =
    tooling.evidenceFiles.length > 0
      ? tooling.evidenceFiles.join(", ")
      : defaultEvidenceFiles;

  return {
    id: options.id,
    ruleId: options.id,
    title: options.title,
    severity: "HIGH",
    file: command.file,
    line: command.line,
    evidence: `${command.command} was referenced, but no ${tooling.tool} tooling signal was found in ${evidenceFiles}.`,
    explanation: options.explanation,
    recommendation: options.recommendation,
    sourceKind: command.sourceKind,
    confidence: 0.96,
  };
}

function hasSelfContainedPythonCommand(
  context: ScanContext,
  command: ExtractedCommand,
): boolean {
  return context.commands.some(
    (candidate) =>
      candidate.category === command.category &&
      candidate.commandKind === command.commandKind &&
      candidate.file === command.file &&
      candidate.selfContained === true,
  );
}
