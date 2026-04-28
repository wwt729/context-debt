import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  extractContextUnits,
  getAiInstructionFiles,
  getDuplicateUnits,
} from "../utils/context-units.js";
import { loadConfig, mergeScanConfig } from "./config.js";
import { buildScanContext } from "./context.js";
import { scanRepository } from "./scanner.js";
import type { FixEdit, FixResult, ScanOptions } from "./types.js";

const compactFileName = "context-debt.compact.md";
const filePrecedence: Record<string, number> = {
  agents: 0,
  claude: 1,
  copilot: 2,
  codex: 3,
  windsurf: 4,
  "cursor-rule": 5,
  readme: 6,
};

type MutableEdit = {
  after: string;
  before: string;
  path: string;
  reasons: Set<string>;
};

export async function fixRepository(
  inputPath: string,
  options: ScanOptions = {},
  write = false,
): Promise<FixResult> {
  const rootDir = resolve(inputPath);
  const loadedConfig = loadConfig(rootDir, options.configPath);
  const config = mergeScanConfig(loadedConfig, {
    include: options.include,
    exclude: options.exclude,
  });
  const context = await buildScanContext(rootDir, config);
  const scanResult = await scanRepository(inputPath, options);
  const aiFiles = getAiInstructionFiles(context);
  const edits = new Map<string, MutableEdit>();

  removeMissingReferenceLines(context, scanResult.issues, edits);
  dedupeWithinFiles(aiFiles, edits);
  dedupeInstructionUnits(aiFiles, edits);

  const compactContent = buildCompactContext(aiFiles);
  const compactPath = compactFileName;
  if (compactContent.length > 0) {
    edits.set(compactPath, {
      after: compactContent,
      before: safeReadFile(rootDir, compactPath),
      path: compactPath,
      reasons: new Set(["generated compact context suggestion"]),
    });
  }

  const finalEdits = [...edits.values()]
    .filter((edit) => edit.before !== edit.after)
    .map((edit) => toFixEdit(edit));

  if (write) {
    for (const edit of finalEdits) {
      writeFileSync(resolve(rootDir, edit.path), edit.after, "utf8");
    }
  }

  return {
    edits: finalEdits,
    generatedCompactPath: compactPath,
    issueSummary: scanResult.summary,
    scannedPath: inputPath,
  };
}

function removeMissingReferenceLines(
  context: Awaited<ReturnType<typeof buildScanContext>>,
  issues: Awaited<ReturnType<typeof scanRepository>>["issues"],
  edits: Map<string, MutableEdit>,
): void {
  for (const issue of issues.filter(
    (entry) => entry.id === "referenced-file-missing",
  )) {
    const missingPath = issue.evidence.split(" was referenced")[0];
    const file = context.contextFiles.find(
      (entry) => entry.path === issue.file,
    );

    if (!file || !missingPath) {
      continue;
    }

    const current = getCurrentContent(edits, file.path, file.content);
    const next = current
      .split("\n")
      .filter((line) => !line.includes(missingPath))
      .join("\n")
      .replace(/\n{3,}/gu, "\n\n");

    upsertEdit(
      edits,
      file.path,
      file.content,
      next,
      `removed missing reference ${missingPath}`,
    );
  }
}

function dedupeInstructionUnits(
  files: ReturnType<typeof getAiInstructionFiles>,
  edits: Map<string, MutableEdit>,
): void {
  const duplicates = getDuplicateUnits(files);

  for (const [, units] of duplicates) {
    const canonical = [...units].sort(compareUnits)[0];

    for (const unit of units) {
      if (unit.file === canonical.file) {
        continue;
      }

      const file = files.find((entry) => entry.path === unit.file);
      if (!file) {
        continue;
      }

      const current = getCurrentContent(edits, file.path, file.content);
      const next = removeFirstExactBlock(current, unit.raw).replace(
        /\n{3,}/gu,
        "\n\n",
      );
      upsertEdit(
        edits,
        file.path,
        file.content,
        next,
        `removed duplicate instruction kept in ${canonical.file}`,
      );
    }
  }
}

function dedupeWithinFiles(
  files: ReturnType<typeof getAiInstructionFiles>,
  edits: Map<string, MutableEdit>,
): void {
  for (const file of files) {
    const seen = new Set<string>();
    let current = getCurrentContent(edits, file.path, file.content);

    for (const unit of extractContextUnits(file)) {
      if (!seen.has(unit.normalized)) {
        seen.add(unit.normalized);
        continue;
      }

      current = removeLastExactBlock(current, unit.raw).replace(
        /\n{3,}/gu,
        "\n\n",
      );
    }

    upsertEdit(
      edits,
      file.path,
      file.content,
      current,
      "removed duplicate instructions in the same file",
    );
  }
}

function buildCompactContext(
  files: ReturnType<typeof getAiInstructionFiles>,
): string {
  const canonicalByNormalized = new Map<
    string,
    { file: string; raw: string; kind: string }
  >();

  for (const file of [...files].sort(compareFiles)) {
    for (const unit of extractContextUnits(file)) {
      if (!canonicalByNormalized.has(unit.normalized)) {
        canonicalByNormalized.set(unit.normalized, {
          file: file.path,
          raw: unit.raw,
          kind: file.kind,
        });
      }
    }
  }

  const lines = [
    "# Compact AI Context",
    "",
    "Generated by `context-debt fix` from canonical instruction units.",
    "",
  ];

  for (const unit of canonicalByNormalized.values()) {
    lines.push(`- ${stripListMarker(unit.raw)}`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function compareFiles(
  left: ReturnType<typeof getAiInstructionFiles>[number],
  right: ReturnType<typeof getAiInstructionFiles>[number],
): number {
  const precedenceDiff =
    (filePrecedence[left.kind] ?? 99) - (filePrecedence[right.kind] ?? 99);

  if (precedenceDiff !== 0) {
    return precedenceDiff;
  }

  return left.path.localeCompare(right.path);
}

function compareUnits(
  left: ReturnType<typeof extractContextUnits>[number],
  right: ReturnType<typeof extractContextUnits>[number],
): number {
  const precedenceDiff =
    (filePrecedence[left.kind] ?? 99) - (filePrecedence[right.kind] ?? 99);

  if (precedenceDiff !== 0) {
    return precedenceDiff;
  }

  return left.file.localeCompare(right.file);
}

function removeFirstExactBlock(content: string, raw: string): string {
  const escaped = escapeRegex(raw);
  return content.replace(new RegExp(`(^|\\n)${escaped}(?=\\n|$)`, "u"), "$1");
}

function removeLastExactBlock(content: string, raw: string): string {
  const pattern = new RegExp(`(^|\\n)${escapeRegex(raw)}(?=\\n|$)`, "gu");
  const matches = [...content.matchAll(pattern)];

  if (matches.length === 0) {
    return content;
  }

  const lastMatch = matches[matches.length - 1];
  const start = lastMatch.index ?? 0;
  const fullMatch = lastMatch[0];
  return `${content.slice(0, start)}${fullMatch.startsWith("\n") ? "\n" : ""}${content.slice(start + fullMatch.length)}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function stripListMarker(value: string): string {
  return value.replace(/^[-*]\s+/u, "").replace(/^\d+\.\s+/u, "");
}

function getCurrentContent(
  edits: Map<string, MutableEdit>,
  path: string,
  fallback: string,
): string {
  return edits.get(path)?.after ?? fallback;
}

function upsertEdit(
  edits: Map<string, MutableEdit>,
  path: string,
  before: string,
  after: string,
  reason: string,
): void {
  const existing = edits.get(path);

  if (existing) {
    existing.after = after;
    existing.reasons.add(reason);
    return;
  }

  edits.set(path, {
    after,
    before,
    path,
    reasons: new Set([reason]),
  });
}

function safeReadFile(rootDir: string, path: string): string {
  try {
    return readFileSync(resolve(rootDir, path), "utf8");
  } catch {
    return "";
  }
}

function toFixEdit(edit: MutableEdit): FixEdit {
  return {
    action: edit.before.length === 0 ? "create" : "update",
    after: edit.after,
    before: edit.before,
    path: edit.path,
    reason: [...edit.reasons].join("; "),
  };
}
