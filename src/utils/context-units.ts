import type { ContextFile, ScanContext } from "../core/types.js";

export type ContextUnit = {
  file: string;
  kind: ContextFile["kind"];
  normalized: string;
  raw: string;
  tokenCount: number;
};

export type DuplicateSourceSummary = {
  duplicatedChars: number;
  duplicatedTokens: number;
  file: string;
  repeatedBlocks: number;
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
  duplicatedChars: number;
  leftCoverage: number;
  rightCoverage: number;
  samples: string[];
  score: number;
  sharedCount: number;
  sharedUnits: ContextUnit[];
} {
  const leftUnits = extractContextUnits(left);
  const rightUnits = extractContextUnits(right);
  const leftByNormalized = indexUnitsByNormalized(leftUnits);
  const rightByNormalized = indexUnitsByNormalized(rightUnits);
  const sharedUnits = [...leftByNormalized.keys()]
    .filter((normalized) => rightByNormalized.has(normalized))
    .map((normalized) => leftByNormalized.get(normalized))
    .filter((unit): unit is ContextUnit => unit !== undefined);
  const sharedCount = sharedUnits.length;
  const duplicatedChars = sharedUnits.reduce(
    (total, unit) => total + unit.raw.length,
    0,
  );
  const leftCharTotal = leftUnits.reduce(
    (total, unit) => total + unit.raw.length,
    0,
  );
  const rightCharTotal = rightUnits.reduce(
    (total, unit) => total + unit.raw.length,
    0,
  );
  const score =
    leftUnits.length + rightUnits.length === 0
      ? 0
      : (2 * sharedCount) / (leftUnits.length + rightUnits.length);

  return {
    duplicatedChars,
    leftCoverage: leftCharTotal === 0 ? 0 : duplicatedChars / leftCharTotal,
    rightCoverage: rightCharTotal === 0 ? 0 : duplicatedChars / rightCharTotal,
    samples: sharedUnits.slice(0, 3).map((unit) => formatUnitSample(unit.raw)),
    score,
    sharedCount,
    sharedUnits,
  };
}

export function summarizeDuplicateSources(
  duplicates: Map<string, ContextUnit[]>,
): DuplicateSourceSummary[] {
  const byFile = new Map<string, DuplicateSourceSummary>();

  for (const entries of duplicates.values()) {
    for (const entry of entries) {
      const current = byFile.get(entry.file) ?? {
        duplicatedChars: 0,
        duplicatedTokens: 0,
        file: entry.file,
        repeatedBlocks: 0,
      };
      current.duplicatedChars += entry.raw.length;
      current.duplicatedTokens += entry.tokenCount;
      current.repeatedBlocks += 1;
      byFile.set(entry.file, current);
    }
  }

  return [...byFile.values()].sort(compareDuplicateSources);
}

export function estimateTokenWasteFromChars(chars: number): number {
  return Math.ceil(chars / 4);
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

function indexUnitsByNormalized(
  units: ContextUnit[],
): Map<string, ContextUnit> {
  return new Map(units.map((unit) => [unit.normalized, unit]));
}

function formatUnitSample(raw: string): string {
  const normalized = raw.replace(/\s+/gu, " ").trim();
  if (normalized.length <= 60) {
    return normalized;
  }

  return `${normalized.slice(0, 57)}...`;
}

function compareDuplicateSources(
  left: DuplicateSourceSummary,
  right: DuplicateSourceSummary,
): number {
  return (
    right.duplicatedChars - left.duplicatedChars ||
    right.repeatedBlocks - left.repeatedBlocks ||
    left.file.localeCompare(right.file)
  );
}
