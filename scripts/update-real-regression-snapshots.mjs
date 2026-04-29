import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadRegressionManifest,
  normalizeRegressionResult,
  scanRepository,
} from "../dist/index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "..");
const manifest = loadRegressionManifest(projectRoot);

for (const repo of manifest.repos) {
  const result = await scanRepository(resolve(projectRoot, repo.fixturePath));
  const normalized = normalizeRegressionResult(repo.id, result);
  const snapshotPath = resolve(projectRoot, repo.snapshotPath);

  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(
    `${snapshotPath}`,
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
}

process.stdout.write(
  `Updated ${manifest.repos.length} regression snapshots.\n`,
);
