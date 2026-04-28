import type { ScanContext } from "../core/types.js";
import { matchesGlob } from "./glob.js";

export function isIgnoredReference(
  context: ScanContext,
  rawValue: string,
  relativePath: string,
): boolean {
  const config = context.config.rules.referencedFileMissing;

  if (
    config.ignorePaths.includes(rawValue) ||
    config.ignorePaths.includes(relativePath)
  ) {
    return true;
  }

  if (
    config.ignoreGlobs.some((pattern) => matchesGlob(relativePath, pattern))
  ) {
    return true;
  }

  return config.ignorePatterns.some((pattern) => {
    const regex = new RegExp(pattern, "u");
    return regex.test(rawValue) || regex.test(relativePath);
  });
}
