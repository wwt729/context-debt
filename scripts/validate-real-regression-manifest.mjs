import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";

import {
  formatThirdPartyFixtures,
  loadRegressionManifest,
} from "../dist/index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "..");
const manifest = loadRegressionManifest(projectRoot);
const fixtureIds = new Set();
const repoSources = new Set();

for (const repo of manifest.repos) {
  assertUnique(fixtureIds, repo.id, `Duplicate regression id: ${repo.id}`);
  assertUnique(
    repoSources,
    `${repo.source.repo}@${repo.source.commit}`,
    `Duplicate regression source: ${repo.source.repo}@${repo.source.commit}`,
  );
  assertExists(
    repo.fixturePath,
    `Missing regression fixture: ${repo.fixturePath}`,
  );
  assertExists(
    repo.snapshotPath,
    `Missing regression snapshot: ${repo.snapshotPath}`,
  );
  assertNoSymlinks(repo.fixturePath, repo.id);
  assertReasons(
    repo.triage.expectedTruePositives,
    repo.id,
    "expectedTruePositives",
  );
  assertReasons(
    repo.triage.allowedFalsePositives,
    repo.id,
    "allowedFalsePositives",
  );
  assertReasons(repo.triage.mustNotAppear, repo.id, "mustNotAppear");
}

const thirdPartyPath = resolve(
  projectRoot,
  "regressions/THIRD_PARTY_FIXTURES.md",
);
const expectedThirdParty = formatThirdPartyFixtures(manifest);
const actualThirdParty = readFileSync(thirdPartyPath, "utf8");

if (actualThirdParty !== expectedThirdParty) {
  throw new Error("THIRD_PARTY_FIXTURES.md is out of date.");
}

process.stdout.write(
  `Validated ${manifest.repos.length} regression fixtures.\n`,
);

function assertExists(relativePath, message) {
  if (!existsSync(resolve(projectRoot, relativePath))) {
    throw new Error(message);
  }
}

function assertReasons(entries, repoId, field) {
  for (const entry of entries) {
    if (!entry.reason) {
      throw new Error(
        `${repoId} -> ${field} requires a reason for ${entry.ruleId}.`,
      );
    }
  }
}

function assertUnique(target, key, message) {
  if (target.has(key)) {
    throw new Error(message);
  }

  target.add(key);
}

function assertNoSymlinks(relativePath, repoId) {
  const root = resolve(projectRoot, relativePath);
  const entries = fg.sync(["**"], {
    cwd: root,
    dot: true,
    followSymbolicLinks: false,
    onlyFiles: false,
  });

  for (const entry of entries) {
    const absolutePath = resolve(root, entry);
    if (lstatSync(absolutePath).isSymbolicLink()) {
      throw new Error(`${repoId} fixture contains a symlink: ${entry}`);
    }
  }
}
