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
} from "./core/report.js";
import {
  formatScanReport,
  resolveScanReportFormat,
  shouldReportErrorAsJson,
} from "./core/scan-report.js";
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
  format?: string;
  include?: string[];
  maxIssues?: string;
  output?: string;
  root?: string[];
  strict?: boolean;
  verbose?: boolean;
};

type FixOptions = {
  config?: string;
  exclude?: string[];
  include?: string[];
  root?: string[];
  verbose?: boolean;
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
    .option("--format <format>", "output format: text, json, or html")
    .option("--output <path>", "write report output to a file")
    .option("--strict", "fail on HIGH and high-confidence MEDIUM issues")
    .option("--no-color", "disable colored terminal output")
    .option("--verbose", "show explanation and rule metadata in text output")
    .option("--config <path>", "custom config path")
    .option("--max-issues <count>", "limit displayed issues")
    .option(
      "--root <path>",
      "limit discovery to a repo-relative root",
      collectOption,
      [],
    )
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
    .option(
      "--root <path>",
      "limit discovery to a repo-relative root",
      collectOption,
      [],
    )
    .option("--include <glob>", "additional include glob", collectOption, [])
    .option("--exclude <glob>", "additional exclude glob", collectOption, [])
    .action(async (path: string, options: FixOptions) => {
      exitCode = await handleFix(path, options, io);
    });

  program
    .command("doctor")
    .argument("[path]", "repository path", ".")
    .option("--verbose", "include current findings with explanations")
    .option("--config <path>", "custom config path")
    .option(
      "--root <path>",
      "limit discovery to a repo-relative root",
      collectOption,
      [],
    )
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
      roots: options.root,
    });
    const format = resolveScanReportFormat(options);
    const output = formatScanReport(result, format, {
      color: options.color ?? true,
      verbose: options.verbose ?? false,
    });

    writeScanOutput(output, options, io);
    return getExitCode(result, options.strict ?? false);
  } catch (error) {
    io.stderr(formatErrorReport(error, shouldReportErrorAsJson(options)));
    return 2;
  }
}

function writeScanOutput(
  output: string,
  options: ScanOptions,
  io: CliIo,
): void {
  if (!options.output) {
    io.stdout(output);
    return;
  }

  const outputPath = resolve(options.output);
  writeFileSync(outputPath, output, "utf8");
  io.stdout(`Wrote ${outputPath}\n`);
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
        roots: options.root,
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
    roots: options.root,
  });
  const preview = options.verbose
    ? await scanRepository(path, {
        configPath: options.config,
        exclude: options.exclude,
        include: options.include,
        roots: options.root,
      })
    : null;
  const header = [
    `Node: ${process.version}`,
    `pnpm: ${pnpmCheck.status === 0 ? pnpmCheck.stdout.trim() : "not available"}`,
  ].join("\n");

  io.stdout(
    `${header}\n${formatDoctorReport(diagnostics, {
      findingPreview: preview,
    })}`,
  );
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

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
