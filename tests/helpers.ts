import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runCli } from "../src/cli.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

export const projectRoot = join(currentDir, "..");
export const fixturesDir = join(projectRoot, "fixtures");

export function fixturePath(name: string): string {
  return join(fixturesDir, name);
}

export function createTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function copyFixtureToTemp(name: string): string {
  const targetDir = createTempDir(`context-debt-fixture-${name}-`);
  cpSync(fixturePath(name), targetDir, { recursive: true });
  return targetDir;
}

export async function runCliWithOutput(args: string[]) {
  let stdout = "";
  let stderr = "";

  const code = await runCli(args, {
    stderr: (message) => {
      stderr += message;
    },
    stdout: (message) => {
      stdout += message;
    },
  });

  return { code, stderr, stdout };
}
