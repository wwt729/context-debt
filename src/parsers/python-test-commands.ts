import type { ExtractedCommand } from "../core/types.js";
import { shouldIgnoreCommandReference } from "./markdown-heuristics.js";
import { getLineNumber, uniqueBy } from "./text.js";

const uvPytestPattern =
  /\buv\s+run(?:\s+--[\w-]+(?:=(?:"[^"]+"|'[^']+'|[^\s`]+))?|\s+--with\s+[^\s`]+|\s+--project(?:=[^\s`]+|\s+[^\s`]+))*\s+pytest\b(?:\s+[^\n`]+)?/giu;
const poetryPytestPattern =
  /\bpoetry\s+run(?:\s+--[\w-]+(?:=(?:"[^"]+"|'[^']+'|[^\s`]+))?)*\s+pytest\b(?:\s+[^\n`]+)?/giu;
const uvRuffPattern =
  /\buv\s+run(?:\s+--[\w-]+(?:=(?:"[^"]+"|'[^']+'|[^\s`]+))?|\s+--with\s+[^\s`]+|\s+--project(?:=[^\s`]+|\s+[^\s`]+))*\s+ruff\s+check\b(?:\s+[^\n`]+)?/giu;
const poetryRuffPattern =
  /\bpoetry\s+run(?:\s+--[\w-]+(?:=(?:"[^"]+"|'[^']+'|[^\s`]+))?)*\s+ruff\s+check\b(?:\s+[^\n`]+)?/giu;
const inlinePytestPattern = /`(?<command>pytest\b(?:\s+[^`\n]+)?)`/gu;
const standalonePytestPattern =
  /^\s*(?:[-*]\s+|\d+\.\s+)?(?<command>pytest\b(?:\s+[^\n`]+)?)\s*$/gmu;
const inlineRuffPattern = /`(?<command>ruff\s+check\b(?:\s+[^`\n]+)?)`/gu;
const standaloneRuffPattern =
  /^\s*(?:[-*]\s+|\d+\.\s+)?(?<command>ruff\s+check\b(?:\s+[^\n`]+)?)\s*$/gmu;

export function extractPythonCommands(
  file: string,
  content: string,
): ExtractedCommand[] {
  const commands: ExtractedCommand[] = [];
  const coveredRanges: Array<{ end: number; start: number }> = [];

  for (const match of content.matchAll(uvPytestPattern)) {
    addPythonCommand(commands, coveredRanges, file, content, match, {
      commandKind: "python-test",
      manager: "uv",
      scriptName: "pytest",
      selfContainedFlag: /\s--with\s+pytest\b/iu,
    });
  }

  for (const match of content.matchAll(poetryPytestPattern)) {
    addPythonCommand(commands, coveredRanges, file, content, match, {
      commandKind: "python-test",
      manager: "poetry",
      scriptName: "pytest",
    });
  }

  for (const match of content.matchAll(uvRuffPattern)) {
    addPythonCommand(commands, coveredRanges, file, content, match, {
      commandKind: "python-lint",
      category: "lint",
      manager: "uv",
      scriptName: "ruff",
      selfContainedFlag: /\s--with\s+ruff\b/iu,
    });
  }

  for (const match of content.matchAll(poetryRuffPattern)) {
    addPythonCommand(commands, coveredRanges, file, content, match, {
      commandKind: "python-lint",
      category: "lint",
      manager: "poetry",
      scriptName: "ruff",
    });
  }

  addBarePythonCommands(
    commands,
    coveredRanges,
    file,
    content,
    inlinePytestPattern,
    {
      commandKind: "python-test",
      scriptName: "pytest",
    },
  );
  addBarePythonCommands(
    commands,
    coveredRanges,
    file,
    content,
    standalonePytestPattern,
    {
      commandKind: "python-test",
      scriptName: "pytest",
    },
  );
  addBarePythonCommands(
    commands,
    coveredRanges,
    file,
    content,
    inlineRuffPattern,
    {
      category: "lint",
      commandKind: "python-lint",
      scriptName: "ruff",
    },
  );
  addBarePythonCommands(
    commands,
    coveredRanges,
    file,
    content,
    standaloneRuffPattern,
    {
      category: "lint",
      commandKind: "python-lint",
      scriptName: "ruff",
    },
  );

  return uniqueBy(
    commands.sort(
      (left, right) =>
        left.line - right.line || left.command.localeCompare(right.command),
    ),
    (command) => `${command.file}:${command.line}:${command.command}`,
  );
}

function addPythonCommand(
  commands: ExtractedCommand[],
  coveredRanges: Array<{ end: number; start: number }>,
  file: string,
  content: string,
  match: RegExpMatchArray,
  options: {
    category?: "lint" | "test";
    commandKind: "python-lint" | "python-test";
    manager?: "poetry" | "uv";
    scriptName: "pytest" | "ruff";
    selfContainedFlag?: RegExp;
  },
): void {
  const index = match.index ?? 0;
  if (shouldIgnoreCommandReference(content, index)) {
    return;
  }

  const command = match[0].trim();
  commands.push({
    category: options.category ?? "test",
    command,
    commandKind: options.commandKind,
    file,
    line: getLineNumber(content, index),
    manager: options.manager,
    scriptName: options.scriptName,
    ...(options.selfContainedFlag?.test(command)
      ? { selfContained: true as const }
      : {}),
    sourceKind: "readme",
  });
  coveredRanges.push({ start: index, end: index + match[0].length });
}

function addBarePythonCommands(
  commands: ExtractedCommand[],
  coveredRanges: Array<{ end: number; start: number }>,
  file: string,
  content: string,
  pattern: RegExp,
  options: {
    category?: "lint" | "test";
    commandKind: "python-lint" | "python-test";
    scriptName: "pytest" | "ruff";
  },
): void {
  for (const match of content.matchAll(pattern)) {
    const command = match.groups?.command?.trim();
    const index = match.index ?? 0;
    const end = index + match[0].length;

    if (!command || isCoveredRange(coveredRanges, index, end)) {
      continue;
    }

    if (shouldIgnoreCommandReference(content, index)) {
      continue;
    }

    commands.push({
      category: options.category ?? "test",
      command,
      commandKind: options.commandKind,
      file,
      line: getLineNumber(content, index),
      scriptName: options.scriptName,
      sourceKind: "readme",
    });
    coveredRanges.push({ start: index, end });
  }
}

function isCoveredRange(
  ranges: Array<{ end: number; start: number }>,
  start: number,
  end: number,
): boolean {
  return ranges.some((range) => start >= range.start && end <= range.end);
}
