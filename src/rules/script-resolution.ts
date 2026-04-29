import type {
  ExtractedCommand,
  ParsedPackageJson,
  ScanContext,
} from "../core/types.js";

const commandDirectoryPattern = /\bcd\s+([./\w-]+)\s*&&/gu;
const inlineTokenPattern = /`([./\w-]+)`/gu;
const contextLookbackLines = 12;

export function hasMatchingScript(
  context: ScanContext,
  command: ExtractedCommand,
): boolean {
  const rootPackageJson = context.packageJson;
  if (rootPackageJson?.scripts[command.scriptName]) {
    return true;
  }

  return resolveCommandPackageJsons(context, command).some(
    (packageJson) => packageJson.scripts[command.scriptName],
  );
}

function resolveCommandPackageJsons(
  context: ScanContext,
  command: ExtractedCommand,
): ParsedPackageJson[] {
  const directoryHints = collectDirectoryHints(context, command);
  if (directoryHints.length === 0) {
    return [];
  }

  return context.packageJsons.filter((packageJson) =>
    directoryHints.some(
      (directory) => packageJson.path === `${directory}/package.json`,
    ),
  );
}

function collectDirectoryHints(
  context: ScanContext,
  command: ExtractedCommand,
): string[] {
  const sourceFile = context.contextFiles.find(
    (file) => file.path === command.file,
  );
  if (!sourceFile) {
    return [];
  }

  const lines = sourceFile.content.split("\n");
  const lineIndex = command.line - 1;
  const startIndex = Math.max(0, lineIndex - contextLookbackLines);
  const hints = new Set<string>();

  for (let index = lineIndex; index >= startIndex; index -= 1) {
    const line = lines[index] ?? "";
    for (const hint of extractDirectoryHintsFromLine(context, line)) {
      hints.add(hint);
    }
  }

  return [...hints].sort((left, right) => left.localeCompare(right));
}

function extractDirectoryHintsFromLine(
  context: ScanContext,
  line: string,
): string[] {
  const hints = new Set<string>();

  for (const match of line.matchAll(commandDirectoryPattern)) {
    addIfKnownPackageDir(context, hints, match[1]);
  }

  for (const match of line.matchAll(inlineTokenPattern)) {
    addIfKnownPackageDir(context, hints, match[1]);
  }

  return [...hints];
}

function addIfKnownPackageDir(
  context: ScanContext,
  hints: Set<string>,
  rawValue: string | undefined,
): void {
  const candidate = normalizeDirectory(rawValue);
  if (!candidate) {
    return;
  }

  if (
    context.packageJsons.some(
      (packageJson) => packageJson.path === `${candidate}/package.json`,
    )
  ) {
    hints.add(candidate);
  }
}

function normalizeDirectory(value: string | undefined): string | null {
  if (!value || value.includes("*")) {
    return null;
  }

  const normalized = value.replace(/^\.\/+/u, "").replace(/\/+$/u, "");

  if (!normalized || normalized === "." || normalized.includes(".")) {
    return null;
  }

  return normalized;
}
