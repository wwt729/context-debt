const actionVerbPattern =
  /\b(?:read|open|see|check|review|use|edit|inspect|follow|update|create|compare|load|visit)\b/iu;
const catalogLeadInPattern =
  /\b(?:such as|including|includes|supported|supports|supports scanning|currently scans|scans|scan|examples?)\b/iu;
const standaloneCodeListPattern =
  /^\s*(?:[-*+]\s+|\d+\.\s+)?(?:`[^`\n]+`\s*(?:,\s*|\/\s*|\|\s*|\band\b\s*|\bor\b\s*)?)+$/iu;
const markdownNoisePattern = /[*_>#]/gu;
const exampleContextPattern =
  /\b(?:example|examples|sample|minimal example|template|rule format)\b/iu;
const optionalCommandPattern = /\b(?:if present|if available|optional)\b/iu;
const structuredCommandPattern = /"command"\s*:/u;
const exampleContextLookbackLines = 30;

export function shouldIgnoreCommandReference(
  content: string,
  index: number,
): boolean {
  const lineText = getLineText(content, index);

  if (optionalCommandPattern.test(normalizeLine(lineText))) {
    return true;
  }

  if (isInsideContextFence(content, index)) {
    return true;
  }

  return hasExampleHeadingAbove(content, index);
}

export function shouldIgnorePathReference(
  content: string,
  index: number,
  referenceType: "markdown-link" | "inline-code" | "instruction-text",
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

export function getLineText(content: string, index: number): string {
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

function isInsideContextFence(content: string, index: number): boolean {
  const fenceStart = findOpenFenceStart(content, index);

  if (fenceStart === null) {
    return false;
  }

  const lineText = getLineText(content, index);
  if (structuredCommandPattern.test(lineText)) {
    return true;
  }

  return hasExampleContextBeforeFence(content, fenceStart);
}

function findOpenFenceStart(content: string, index: number): number | null {
  let cursor = 0;
  let openFenceStart: number | null = null;

  while (cursor <= index) {
    const lineEnd = content.indexOf("\n", cursor);
    const nextCursor = lineEnd === -1 ? content.length + 1 : lineEnd + 1;
    const lineText = content.slice(
      cursor,
      lineEnd === -1 ? undefined : lineEnd,
    );

    if (lineText.trimStart().startsWith("```")) {
      openFenceStart = openFenceStart === null ? cursor : null;
    }

    cursor = nextCursor;
  }

  return openFenceStart;
}

function hasExampleContextBeforeFence(
  content: string,
  fenceStart: number,
): boolean {
  const previousLines = content.slice(0, fenceStart).split("\n");
  let seenNonEmpty = 0;

  for (let index = previousLines.length - 1; index >= 0; index -= 1) {
    const line = previousLines[index]?.trim() ?? "";

    if (!line) {
      if (seenNonEmpty > 0) {
        break;
      }
      continue;
    }

    seenNonEmpty += 1;
    if (line.startsWith("#")) {
      if (exampleContextPattern.test(line)) {
        return true;
      }
      break;
    }

    if (exampleContextPattern.test(normalizeLine(line))) {
      return true;
    }

    if (seenNonEmpty >= 3) {
      break;
    }
  }

  return (
    hasExampleHeadingAbove(content, fenceStart) ||
    hasExampleContextWithinLookback(content, fenceStart)
  );
}

function hasExampleHeadingAbove(content: string, index: number): boolean {
  const previousLines = content
    .slice(0, content.lastIndexOf("\n", index - 1) + 1)
    .split("\n");
  let headingLevel: number | null = null;

  for (
    let lineIndex = previousLines.length - 1;
    lineIndex >= 0;
    lineIndex -= 1
  ) {
    const line = previousLines[lineIndex]?.trim() ?? "";

    if (!line) {
      continue;
    }

    if (line.startsWith("```")) {
      return false;
    }

    if (line.startsWith("#")) {
      const currentLevel = getHeadingLevel(line);

      if (headingLevel === null) {
        headingLevel = currentLevel;
        if (exampleContextPattern.test(line)) {
          return true;
        }
        continue;
      }

      if (currentLevel >= headingLevel) {
        return false;
      }

      headingLevel = currentLevel;
      if (exampleContextPattern.test(line)) {
        return true;
      }
    }
  }

  return false;
}

function getHeadingLevel(line: string): number {
  return line.match(/^#+/u)?.[0].length ?? 0;
}

function hasExampleContextWithinLookback(
  content: string,
  index: number,
): boolean {
  const previousLines = content
    .slice(0, content.lastIndexOf("\n", index - 1) + 1)
    .split("\n");
  const startIndex = Math.max(
    0,
    previousLines.length - exampleContextLookbackLines,
  );

  for (
    let lineIndex = previousLines.length - 1;
    lineIndex >= startIndex;
    lineIndex -= 1
  ) {
    const line = previousLines[lineIndex]?.trim() ?? "";
    if (line && exampleContextPattern.test(normalizeLine(line))) {
      return true;
    }
  }

  return false;
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
