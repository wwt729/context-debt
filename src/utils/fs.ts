import { existsSync } from "node:fs";

export function ensurePathExists(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Path does not exist: ${path}`);
  }
}
