import type { ContextFile, ScanContext } from "../core/types.js";

type ContextUnit = {
  file: string;
  kind: ContextFile["kind"];
  normalized: string;
  raw: string;
  tokenCount: number;
};

const aiContextKinds = new Set([
  "agents",
  "claude",
  "cursor-rule",
  "copilot",
  "codex",
  "windsurf",
]);

const tokenPattern = /[\p{Script=Han}]|[a-z0-9_:-]+/giu;

export function getAiInstructionFiles(context: ScanContext): ContextFile[] {
  return context.contextFiles.filter((file) => aiContextKinds.has(file.kind));
}

export function extractContextUnits(file: ContextFile): ContextUnit[] {
  const units: ContextUnit[] = [];
  let paragraphBuffer: string[] = [];

  for (const line of file.content.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flushParagraph(units, file, paragraphBuffer);
      paragraphBuffer = [];
      continue;
    }

    if (trimmed.startsWith("#")) {
      flushParagraph(units, file, paragraphBuffer);
      paragraphBuffer = [];
      continue;
    }

    if (isStandaloneUnit(trimmed)) {
      flushParagraph(units, file, paragraphBuffer);
      paragraphBuffer = [];
      pushUnit(units, file, trimmed);
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph(units, file, paragraphBuffer);
  return units;
}

export function getDuplicateUnits(
  files: ContextFile[],
): Map<string, ContextUnit[]> {
  const duplicates = new Map<string, ContextUnit[]>();

  for (const file of files) {
    for (const unit of extractContextUnits(file)) {
      const existing = duplicates.get(unit.normalized) ?? [];
      existing.push(unit);
      duplicates.set(unit.normalized, existing);
    }
  }

  return new Map(
    [...duplicates.entries()].filter(([, entries]) => entries.length > 1),
  );
}

export function calculateUnitSimilarity(
  left: ContextFile,
  right: ContextFile,
): {
  samples: string[];
  score: number;
  sharedCount: number;
} {
  const leftUnits = new Set(
    extractContextUnits(left).map((unit) => unit.normalized),
  );
  const rightUnits = new Set(
    extractContextUnits(right).map((unit) => unit.normalized),
  );
  const shared = [...leftUnits].filter((unit) => rightUnits.has(unit));
  const score =
    leftUnits.size + rightUnits.size === 0
      ? 0
      : (2 * shared.length) / (leftUnits.size + rightUnits.size);

  return {
    samples: shared.slice(0, 2),
    score,
    sharedCount: shared.length,
  };
}

function flushParagraph(
  units: ContextUnit[],
  file: ContextFile,
  paragraphBuffer: string[],
): void {
  if (paragraphBuffer.length === 0) {
    return;
  }

  pushUnit(units, file, paragraphBuffer.join(" "));
}

function pushUnit(units: ContextUnit[], file: ContextFile, raw: string): void {
  const normalized = normalizeInstructionText(raw);
  const tokenCount = countApproxTokens(normalized);

  if (normalized.length === 0 || tokenCount < 4) {
    return;
  }

  units.push({
    file: file.path,
    kind: file.kind,
    normalized,
    raw,
    tokenCount,
  });
}

function normalizeInstructionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[-*]\s+/u, "")
    .replace(/^\d+\.\s+/u, "")
    .replace(/[`*_>]/gu, "")
    .replace(/\[[^\]]+\]\(([^)]+)\)/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

function countApproxTokens(text: string): number {
  return text.match(tokenPattern)?.length ?? 0;
}

function isStandaloneUnit(line: string): boolean {
  return /^[-*]\s+/u.test(line) || /^\d+\.\s+/u.test(line);
}
