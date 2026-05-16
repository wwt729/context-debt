const markdownTableSeparatorPattern =
  /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;
const markdownTableRowPattern = /^\s*\|.+\|\s*$/u;
const ruleCatalogHeaderPattern =
  /\brule\b.*\bwhat it checks\b|\bwhat it checks\b.*\brule\b/iu;
const descriptiveCommandPattern =
  /\b(?:reference|references|referenced|describes?|checks?|detects?|reports?|matches?)\b/iu;
const imperativeCommandPattern =
  /\b(?:run|execute|use|invoke|call|start|build|test|lint)\b/iu;

export function isNonActionableCommandTableReference(
  content: string,
  index: number,
): boolean {
  const line = getLineAt(content, index);
  if (!isMarkdownTableRow(line)) {
    return false;
  }

  if (hasRuleCatalogHeader(content, index)) {
    return true;
  }

  const normalized = normalizeTableLine(line);
  return (
    descriptiveCommandPattern.test(normalized) &&
    !imperativeCommandPattern.test(normalized)
  );
}

function hasRuleCatalogHeader(content: string, index: number): boolean {
  const previousLines = content
    .slice(0, getLineStart(content, index))
    .split("\n");
  const headerLines: string[] = [];

  for (
    let lineIndex = previousLines.length - 1;
    lineIndex >= 0;
    lineIndex -= 1
  ) {
    const line = previousLines[lineIndex] ?? "";
    if (!line.trim()) {
      break;
    }

    if (!isMarkdownTableRow(line) && !isMarkdownTableSeparator(line)) {
      break;
    }

    if (isMarkdownTableRow(line)) {
      headerLines.unshift(normalizeTableLine(line));
    }
  }

  return headerLines.some((line) => ruleCatalogHeaderPattern.test(line));
}

function getLineAt(content: string, index: number): string {
  const start = getLineStart(content, index);
  const end = content.indexOf("\n", index);
  return content.slice(start, end === -1 ? undefined : end);
}

function getLineStart(content: string, index: number): number {
  return content.lastIndexOf("\n", index - 1) + 1;
}

function isMarkdownTableRow(line: string): boolean {
  return markdownTableRowPattern.test(line) && !isMarkdownTableSeparator(line);
}

function isMarkdownTableSeparator(line: string): boolean {
  return markdownTableSeparatorPattern.test(line);
}

function normalizeTableLine(line: string): string {
  return line
    .replace(/`[^`\n]+`/gu, " COMMAND ")
    .replace(/[|*_>#-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}
