import type { ContextFile } from "../core/types.js";

type LineMatch = {
  line: number;
  text: string;
};

const directivePattern =
  /^(?:[-*]\s+|\d+\.\s+)?(?:always|never|must|should|prefer|use|run|read|avoid|do not|don't)\b/iu;
const negativePattern = /\b(do not|don't|never|avoid)\b/iu;

export function getLineMatches(content: string, pattern: RegExp): LineMatch[] {
  return content
    .split("\n")
    .map((text, index) => ({ line: index + 1, text: text.trim() }))
    .filter((entry) => entry.text.length > 0 && pattern.test(entry.text));
}

export function countBroadDirectives(file: ContextFile): number {
  return getLineMatches(file.content, directivePattern).length;
}

export function getNegativeRuleMatches(file: ContextFile): LineMatch[] {
  return getLineMatches(file.content, negativePattern);
}

export function normalizeNegativeRule(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[-*\d.\s]+/u, "")
    .replace(/\b(do not|don't|never|avoid)\b/giu, "NEG")
    .replace(/[`"'.,:;()]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}
