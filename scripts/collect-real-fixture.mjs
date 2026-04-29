import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";

import {
  discoveryPatterns,
  formatThirdPartyFixtures,
  loadRegressionManifest,
  scanRepository,
} from "../dist/index.js";

const categories = new Set(["monorepo", "docs-heavy", "ai-heavy", "mcp-heavy"]);
const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "..");

const options = parseArgs(process.argv.slice(2));
assertRequired(options.repo, "--repo is required");
assertRequired(options.ref, "--ref is required");
assertRequired(options.id, "--id is required");
assertRequired(options.category, "--category is required");

if (!categories.has(options.category)) {
  throw new Error(`Unsupported category: ${options.category}`);
}

const tempDir = mkdtempSync(join(tmpdir(), "context-debt-regression-"));
const metadata = await fetchJson(
  `https://api.github.com/repos/${options.repo}`,
);
const commit = await fetchJson(
  `https://api.github.com/repos/${options.repo}/commits/${options.ref}`,
);
const sourceRoot = downloadRepository(options.repo, commit.sha, tempDir);
const fixtureRoot = resolve(projectRoot, "regressions/repos", options.id);

rmSync(fixtureRoot, { force: true, recursive: true });
await copySeedFiles(sourceRoot, fixtureRoot);
await hydrateReferencedFiles(sourceRoot, fixtureRoot);
updateManifest(options, metadata, commit.sha);

process.stdout.write(
  `Collected regression fixture ${options.id} from ${options.repo}@${commit.sha}.\n`,
);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith("--") || !value) {
      continue;
    }

    parsed[key.slice(2)] = value;
  }

  return parsed;
}

function assertRequired(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

async function fetchJson(url) {
  return JSON.parse(
    runCommandWithOutput("curl", [
      "-sL",
      "-H",
      "User-Agent: context-debt-regression-fixture",
      "-H",
      "Accept: application/vnd.github+json",
      url,
    ]),
  );
}

function downloadRepository(repo, commit, tempDir) {
  const tarballPath = resolve(tempDir, `${basename(repo)}-${commit}.tar.gz`);
  const url = `https://codeload.github.com/${repo}/tar.gz/${commit}`;

  runCommand("curl", ["-L", "-o", tarballPath, url]);
  runCommand("tar", ["-xzf", tarballPath, "-C", tempDir]);

  const extractedDir = readdirSync(tempDir, { withFileTypes: true }).find(
    (entry) => entry.isDirectory() && entry.name.includes(commit.slice(0, 7)),
  )?.name;

  if (!extractedDir) {
    throw new Error(`Failed to extract tarball for ${repo}@${commit}.`);
  }

  return resolve(tempDir, extractedDir);
}

function copySeedFiles(sourceRoot, fixtureRoot) {
  mkdirSync(fixtureRoot, { recursive: true });

  return fg(discoveryPatterns, {
    cwd: sourceRoot,
    dot: true,
    onlyFiles: true,
    unique: true,
  }).then((entries) => {
    for (const entry of entries) {
      copyRelativePath(sourceRoot, fixtureRoot, entry);
    }
  });
}

async function hydrateReferencedFiles(sourceRoot, fixtureRoot) {
  for (let round = 0; round < 5; round += 1) {
    const result = await scanRepository(fixtureRoot);
    const candidates = collectHydrationCandidates(result.issues);
    let copied = 0;

    for (const candidate of candidates) {
      if (candidate.startsWith("/") || candidate.startsWith("..")) {
        continue;
      }

      try {
        copyRelativePath(sourceRoot, fixtureRoot, candidate);
        copied += 1;
      } catch {}
    }

    if (copied === 0) {
      return;
    }
  }
}

function collectHydrationCandidates(issues) {
  const candidates = new Set();

  for (const issue of issues) {
    if (issue.ruleId === "referenced-file-missing" && issue.resolvedPath) {
      candidates.add(issue.resolvedPath);
    }

    if (issue.ruleId === "stale-reference") {
      for (const relatedFile of issue.relatedFiles ?? []) {
        candidates.add(relatedFile);
      }
    }
  }

  return [...candidates].sort((left, right) => left.localeCompare(right));
}

function copyRelativePath(sourceRoot, fixtureRoot, relativePath) {
  const sourcePath = resolve(sourceRoot, relativePath);
  const targetPath = resolve(fixtureRoot, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { dereference: true, recursive: true });
}

function updateManifest(options, metadata, commit) {
  const manifest = loadRegressionManifest(projectRoot);
  const existing = manifest.repos.find((repo) => repo.id === options.id);
  const repoEntry = {
    id: options.id,
    category: options.category,
    source: {
      repo: options.repo,
      commit,
      license: metadata.license?.spdx_id ?? "UNKNOWN",
      url: metadata.html_url,
    },
    fixturePath: `regressions/repos/${options.id}`,
    snapshotPath: `regressions/snapshots/${options.id}.json`,
    notes: existing?.notes ?? "",
    triage: existing?.triage ?? {
      expectedTruePositives: [],
      allowedFalsePositives: [],
      mustNotAppear: [],
    },
  };
  const nextRepos = manifest.repos
    .filter((repo) => repo.id !== options.id)
    .concat(repoEntry)
    .sort((left, right) => left.id.localeCompare(right.id));
  const nextManifest = {
    schemaVersion: 1,
    repos: nextRepos,
  };

  writeFileSync(
    resolve(projectRoot, "regressions/manifest.json"),
    `${JSON.stringify(nextManifest, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(projectRoot, "regressions/THIRD_PARTY_FIXTURES.md"),
    formatThirdPartyFixtures(nextManifest),
    "utf8",
  );
}

function runCommand(command, args) {
  runCommandWithOutput(command, args);
}

function runCommandWithOutput(command, args) {
  const result = spawnSync("/bin/zsh", ["-lc", toShellCommand(command, args)], {
    encoding: "utf8",
  });

  if (result.status === 0) {
    return result.stdout;
  }

  throw new Error(
    result.stderr || result.stdout || `Command failed: ${command}`,
  );
}

function toShellCommand(command, args) {
  return [command, ...args].map(quoteShellArg).join(" ");
}

function quoteShellArg(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
