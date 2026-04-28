import { relative } from "node:path";

export function toDisplayPath(rootDir: string, absolutePath: string): string {
  const value = relative(rootDir, absolutePath);
  return value.length > 0 ? value : ".";
}
