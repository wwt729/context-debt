#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command, CommanderError } from "commander";

import { getDefaultConfig, getDefaultConfigPath } from "./core/config.js";
import { fixRepository } from "./core/fix.js";
import { TOOL_NAME, VERSION } from "./core/meta.js";
import {
  formatDoctorReport,
  formatErrorReport,
  formatFixReport,
  formatJsonReport,
  formatTextReport,
} from "./core/report.js";
import {
  diagnoseRepository,
  getExitCode,
  scanRepository,
} from "./core/scanner.js";
import { ensurePathExists } from "./utils/fs.js";

type CliIo = {
  stderr: (message: string) => void;
  stdout: (message: string) => void;
};

type ScanOptions = {
  config?: string;
  json?: boolean;
  color?: boolean;
  exclude?: string[];
  format?: "json" | "text";
  include?: string[];
  maxIssues?: string;
  strict?: boolean;
};

type FixOptions = {
  config?: string;
  exclude?: string[];
  include?: string[];
  write?: boolean;
};

const defaultIo: CliIo = {
  stderr: (message) => process.stderr.write(message),
  stdout: (message) => process.stdout.write(message),
};

export async function runCli(
  argv: string[],
  io: CliIo = defaultIo,
): Promise<number> {
  let exitCode = 0;

  const program = new Command();
  program.name(TOOL_NAME).version(VERSION).exitOverride();
  program.configureOutput({
    writeErr: (message) => io.stderr(message),
    writeOut: (message) => io.stdout(message),
  });

  program
    .command("scan")
    .argument("[path]", "repository path to scan", ".")
    .option("--json", "output machine-readable JSON")
    .option("--format <format>", "output format: text or json")
    .option("--strict", "treat MEDIUM issues as failures")
    .option("--no-color", "disable colored terminal output")
    .option("--config <path>", "custom config path")
    .option("--max-issues <count>", "limit displayed issues")
    .option("--include <glob>", "additional include glob", collectOption, [])
    .option("--exclude <glob>", "additional exclude glob", collectOption, [])
    .action(async (path: string, options: ScanOptions) => {
      exitCode = await handleScan(path, options, io);
    });

  program.command("init").action(() => {
    exitCode = handleInit(io);
  });

  program
    .command("fix")
    .argument("[path]", "repository path to fix", ".")
    .option("--write", "apply edits instead of previewing")
    .option("--config <path>", "custom config path")
    .option("--include <glob>", "additional include glob", collectOption, [])
    .option("--exclude <glob>", "additional exclude glob", collectOption, [])
    .action(async (path: string, options: FixOptions) => {
      exitCode = await handleFix(path, options, io);
    });

  program
    .command("doctor")
    .argument("[path]", "repository path", ".")
    .option("--config <path>", "custom config path")
    .option("--include <glob>", "additional include glob", collectOption, [])
    .option("--exclude <glob>", "additional exclude glob", collectOption, [])
    .action(async (path: string, options: FixOptions) => {
      exitCode = await handleDoctor(path, options, io);
    });

  try {
    await program.parseAsync(argv, { from: "user" });
    return exitCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }
    throw error;
  }
}

async function handleScan(
  path: string,
  options: ScanOptions,
  io: CliIo,
): Promise<number> {
  try {
    const targetPath = resolve(path);
    ensurePathExists(targetPath);
    const result = await scanRepository(path, {
      configPath: options.config,
      exclude: options.exclude,
      include: options.include,
      maxIssues: parseIntegerOption(options.maxIssues),
    });
    const output = shouldUseJson(options)
      ? formatJsonReport(result)
      : formatTextReport(result, { color: options.color ?? true });

    io.stdout(output);
    return getExitCode(result, options.strict ?? false);
  } catch (error) {
    io.stderr(formatErrorReport(error, options.json ?? false));
    return 2;
  }
}

async function handleFix(
  path: string,
  options: FixOptions,
  io: CliIo,
): Promise<number> {
  try {
    const targetPath = resolve(path);
    ensurePathExists(targetPath);
    const result = await fixRepository(
      path,
      {
        configPath: options.config,
        exclude: options.exclude,
        include: options.include,
      },
      options.write ?? false,
    );

    io.stdout(formatFixReport(result, options.write ?? false));
    return 0;
  } catch (error) {
    io.stderr(formatErrorReport(error, false));
    return 2;
  }
}

function handleInit(io: CliIo): number {
  const configPath = getDefaultConfigPath(process.cwd());
  if (existsSync(configPath)) {
    io.stderr(`context-debt config already exists at ${configPath}\n`);
    return 1;
  }

  const config = getDefaultConfig();
  writeFileSync(
    `${configPath}`,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
  io.stdout(`Created ${configPath}\n`);
  return 0;
}

async function handleDoctor(
  path: string,
  options: FixOptions,
  io: CliIo,
): Promise<number> {
  const pnpmCheck = spawnSync("pnpm", ["-v"], { encoding: "utf8" });
  const diagnostics = await diagnoseRepository(path, {
    configPath: options.config,
    exclude: options.exclude,
    include: options.include,
  });
  const header = [
    `Node: ${process.version}`,
    `pnpm: ${pnpmCheck.status === 0 ? pnpmCheck.stdout.trim() : "not available"}`,
  ].join("\n");

  io.stdout(`${header}\n${formatDoctorReport(diagnostics)}`);
  return 0;
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseIntegerOption(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function shouldUseJson(options: ScanOptions): boolean {
  return options.json === true || options.format === "json";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
