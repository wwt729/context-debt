import type {
  ExtractedCommand,
  ExtractedPathReference,
  PackageManagerEvidence,
  PackageManagerName,
} from "../core/types.js";
import {
  commandPatterns,
  getCommandCategory,
  getCommandManager,
} from "./command-helpers.js";
import { classifyPathCandidate } from "./path-helpers.js";
import { getLineNumber, uniqueBy } from "./text.js";

const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
const inlineCodePattern = /`([^`\n]+)`/g;
const pathTokenPattern =
  /\b(?:read|open|see|check|review|use|edit|inspect)\s+((?:\.{0,2}\/|\.?[\w-]+\/)[^\s)`,:;]+)/gi;
const flagValuePattern =
  /--[\w-]+(?:=|\s+)((?:\.{0,2}\/|\/|\.?[\w-]+\/)[^\s)`,:;]+)/g;
const explicitManagerPattern =
  /\b(?:use|prefer|install with|run with)\s+(pnpm|npm|yarn)\b/gi;
const actionVerbPattern =
  /\b(?:read|open|see|check|review|use|edit|inspect|follow|update|create|compare|load|visit)\b/iu;
const catalogLeadInPattern =
  /\b(?:such as|including|includes|supported|supports|supports scanning|currently scans|scans|scan|examples?)\b/iu;
const standaloneCodeListPattern =
  /^\s*(?:[-*+]\s+|\d+\.\s+)?(?:`[^`\n]+`\s*(?:,\s*|\/\s*|\|\s*|\band\b\s*|\bor\b\s*)?)+$/iu;
const markdownNoisePattern = /[*_>#]/gu;

type ParsedMarkdownContext = {
  commands: ExtractedCommand[];
  pathReferences: ExtractedPathReference[];
  packageManagers: PackageManagerEvidence[];
};

export function parseMarkdownContext(
  file: string,
  content: string,
): ParsedMarkdownContext {
  return {
    commands: extractCommands(file, content),
    pathReferences: extractPathReferences(file, content),
    packageManagers: extractPackageManagers(file, content),
  };
}

export function extractCommands(
  file: string,
  content: string,
): ExtractedCommand[] {
  const commands: ExtractedCommand[] = [];

  for (const pattern of commandPatterns) {
    for (const match of content.matchAll(pattern)) {
      const manager = getCommandManager(match[0]);
      const scriptName = match.groups?.script;
      const index = match.index ?? 0;

      if (!manager || !scriptName) {
        continue;
      }

      commands.push({
        category: getCommandCategory(scriptName),
        command: match[0],
        manager,
        scriptName,
        file,
        line: getLineNumber(content, index),
        sourceKind: "readme",
      });
    }
  }

  return uniqueBy(
    commands.sort(
      (left, right) =>
        left.line - right.line || left.command.localeCompare(right.command),
    ),
    (command) => `${command.file}:${command.line}:${command.command}`,
  );
}

export function extractPathReferences(
  file: string,
  content: string,
): ExtractedPathReference[] {
  const results: ExtractedPathReference[] = [];

  for (const match of content.matchAll(markdownLinkPattern)) {
    addPathReference(
      results,
      file,
      content,
      match[1],
      match.index ?? 0,
      true,
      "markdown-link",
    );
  }

  for (const match of content.matchAll(inlineCodePattern)) {
    addPathReference(
      results,
      file,
      content,
      match[1],
      match.index ?? 0,
      false,
      "inline-code",
    );
  }

  for (const match of content.matchAll(pathTokenPattern)) {
    addPathReference(
      results,
      file,
      content,
      match[1],
      match.index ?? 0,
      false,
      "instruction-text",
    );
  }

  for (const match of content.matchAll(flagValuePattern)) {
    addPathReference(
      results,
      file,
      content,
      match[1],
      match.index ?? 0,
      false,
      "instruction-text",
    );
  }

  return uniqueBy(
    results.sort(
      (left, right) =>
        left.line - right.line || left.value.localeCompare(right.value),
    ),
    (entry) => `${entry.file}:${entry.value}`,
  );
}

export function extractPackageManagers(
  file: string,
  content: string,
): PackageManagerEvidence[] {
  const evidence: PackageManagerEvidence[] = [];

  for (const match of content.matchAll(explicitManagerPattern)) {
    const manager = match[1] as PackageManagerName;
    evidence.push({
      manager,
      file,
      line: getLineNumber(content, match.index ?? 0),
      evidence: match[0],
      source: "instruction",
      sourceKind: "readme",
    });
  }

  for (const command of extractCommands(file, content)) {
    evidence.push({
      manager: command.manager,
      file,
      line: command.line,
      evidence: command.command,
      source: "instruction",
      sourceKind: command.sourceKind,
    });
  }

  return uniqueBy(
    evidence.sort(
      (left, right) =>
        (left.line ?? 0) - (right.line ?? 0) ||
        left.evidence.localeCompare(right.evidence),
    ),
    (entry) => `${entry.file}:${entry.line}:${entry.evidence}`,
  );
}

function addPathReference(
  results: ExtractedPathReference[],
  file: string,
  content: string,
  rawValue: string,
  index: number,
  allowSingleFile: boolean,
  referenceType: ExtractedPathReference["referenceType"],
): void {
  const value = sanitizeReferenceValue(rawValue.trim());
  const lineText = getLineText(content, index);
  const candidateKind = classifyPathCandidate(value, lineText, allowSingleFile);

  if (
    candidateKind === "url" ||
    candidateKind === "unknown" ||
    shouldIgnorePathReference(content, index, referenceType)
  ) {
    return;
  }

  results.push({
    value,
    file,
    line: getLineNumber(content, index),
    referenceType,
    candidateKind,
    sourceKind: "readme",
  });
}

function sanitizeReferenceValue(value: string): string {
  return value.replace(/[),.:;]+$/u, "");
}

function shouldIgnorePathReference(
  content: string,
  index: number,
  referenceType: ExtractedPathReference["referenceType"],
): boolean {
  if (referenceType === "markdown-link") {
    return false;
  }

  const lineText = getLineText(content, index);

  if (hasActionVerb(lineText)) {
    return false;
  }

  if (hasCatalogLeadIn(lineText)) {
    return true;
  }

  return (
    isStandaloneCodeList(lineText) && hasCatalogLeadInAbove(content, index)
  );
}

function getLineText(content: string, index: number): string {
  const start = content.lastIndexOf("\n", index - 1) + 1;
  const end = content.indexOf("\n", index);
  return content.slice(start, end === -1 ? undefined : end);
}

function hasActionVerb(line: string): boolean {
  return actionVerbPattern.test(normalizeLine(line));
}

function hasCatalogLeadIn(line: string): boolean {
  return catalogLeadInPattern.test(normalizeLine(line));
}

function isStandaloneCodeList(line: string): boolean {
  return standaloneCodeListPattern.test(line.trim());
}

function normalizeLine(line: string): string {
  return line
    .replace(markdownNoisePattern, " ")
    .replace(/`[^`\n]+`/g, " PATH ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function hasCatalogLeadInAbove(content: string, index: number): boolean {
  const currentLineStart = content.lastIndexOf("\n", index - 1) + 1;
  const previousLines = content.slice(0, currentLineStart).split("\n");
  if (previousLines.at(-1) === "") {
    previousLines.pop();
  }
  let crossedBlankLine = false;

  for (
    let lineIndex = previousLines.length - 1;
    lineIndex >= 0;
    lineIndex -= 1
  ) {
    const line = previousLines[lineIndex] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      if (crossedBlankLine) {
        break;
      }
      crossedBlankLine = true;
      continue;
    }

    if (trimmed.startsWith("#")) {
      break;
    }

    if (hasCatalogLeadIn(trimmed)) {
      return true;
    }

    if (crossedBlankLine && !isListLine(trimmed)) {
      break;
    }
  }

  return false;
}

function isListLine(line: string): boolean {
  return /^(?:[-*+]\s+|\d+\.\s+)/u.test(line);
}
