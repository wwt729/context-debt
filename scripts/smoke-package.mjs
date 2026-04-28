import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "..");
const cleanFixture = join(projectRoot, "fixtures", "clean-repo");
const failingFixture = join(projectRoot, "fixtures", "missing-test-script");
const smokeRoot = join(projectRoot, ".tmp-smoke");

main();

function main() {
  mkdirSync(smokeRoot, { recursive: true });
  const tempRoot = mkdtempSync(join(smokeRoot, "context-debt-"));

  try {
    runSmoke(tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runSmoke(tempRoot) {
  const packDir = join(tempRoot, "pack");
  const extractDir = join(tempRoot, "extract");
  const cleanRepoDir = join(tempRoot, "clean-repo");
  const failingRepoDir = join(tempRoot, "missing-test-script");

  mkdirSync(packDir, { recursive: true });
  mkdirSync(extractDir, { recursive: true });
  cpSync(cleanFixture, cleanRepoDir, { recursive: true });
  cpSync(failingFixture, failingRepoDir, { recursive: true });

  run("pnpm", ["pack", "--pack-destination", packDir], projectRoot);
  const tarballPath = join(packDir, getTarballName(packDir));
  run("tar", ["-xzf", tarballPath, "-C", extractDir], projectRoot);
  const packageDir = join(extractDir, "package");

  assert.ok(existsSync(join(packageDir, "dist", "cli.js")));
  assert.ok(existsSync(join(packageDir, "dist", "index.d.ts")));
  assert.ok(existsSync(join(packageDir, "README.md")));
  assert.ok(existsSync(join(packageDir, "CHANGELOG.md")));

  const passingRun = run(
    process.execPath,
    [
      join(packageDir, "dist", "cli.js"),
      "scan",
      cleanRepoDir,
      "--format",
      "json",
      "--no-color",
    ],
    projectRoot,
  );
  const passingReport = JSON.parse(passingRun.stdout);
  assert.equal(passingReport.tool, "context-debt");
  assert.equal(passingReport.summary.HIGH, 0);
  assert.equal(passingReport.summary.MEDIUM, 0);

  const cliPath = join(packageDir, "dist", "cli.js");
  const failingRun = run(
    process.execPath,
    [cliPath, "scan", ".", "--no-color"],
    failingRepoDir,
    1,
  );
  assert.match(failingRun.stdout, /missing-test-script/u);
  assert.match(failingRun.stdout, /CLAUDE\.md:3/u);
}

function getTarballName(packDir) {
  const tarballs = readdirSync(packDir).filter((entry) =>
    entry.endsWith(".tgz"),
  );
  assert.equal(
    tarballs.length,
    1,
    "expected exactly one tarball from pnpm pack",
  );
  return tarballs[0];
}

function run(command, args, cwd, expectedStatus = 0) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_fund: "false",
      npm_config_update_notifier: "false",
    },
  });

  if (result.status !== expectedStatus) {
    throw new Error(formatFailure(command, args, cwd, result));
  }

  return result;
}

function formatFailure(command, args, cwd, result) {
  return [
    `Command failed: ${command} ${args.join(" ")}`,
    `cwd: ${cwd}`,
    `status: ${result.status ?? "null"}`,
    `stdout:\n${result.stdout}`,
    `stderr:\n${result.stderr}`,
  ].join("\n");
}
