# context-debt

[English](./README.md) | [简体中文](./README.zh-CN.md)

Context debt scanner for AI coding instructions.

`context-debt` is a publishable npm CLI that statically scans repository instructions for Codex, Claude Code, Cursor, Copilot, Windsurf, MCP configs, and project metadata before they drift into breakage, false guidance, security risk, or token waste.

Your code has technical debt. Your AI context has context debt.

## Overview

`context-debt` treats AI instructions like lintable source artifacts.

It is designed for repositories that already contain files such as:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/*.mdc`
- `.github/copilot-instructions.md`
- Codex / Windsurf instruction files
- `README.md`
- `package.json`
- `.mcp.json`, `.cursor/mcp.json`, `.claude/mcp.json`

## Why

AI coding assistants are now part of the repo surface. Over time, those instructions drift:

- commands stop matching `package.json`
- referenced docs get renamed or deleted
- different tools recommend different package managers
- giant instruction files waste context budget
- permissive MCP configs outgrow their original intent

`context-debt` solves this as a deterministic static-analysis problem instead of an LLM runtime problem.

## Principles

- Static-analysis first.
- No external LLM API in MVP.
- No telemetry.
- No network access by default.
- Deterministic and testable rules.
- Human-readable terminal output, machine-readable JSON output, and static HTML reports.

## Install

```bash
pnpm add -D context-debt
```

Or:

```bash
npm install -D context-debt
```

Requirements:

- Node.js `>= 20`
- `pnpm` is recommended for development in this repository

## Basic Usage

```bash
context-debt scan .
context-debt scan . --strict
context-debt scan . --format json
context-debt scan . --format html --output context-debt-report.html
context-debt doctor .
context-debt fix .
context-debt fix . --write
```

Typical workflow:

1. Run `context-debt scan .` locally while editing instructions.
2. Add `context-debt scan . --strict` to CI.
3. Use `context-debt doctor .` when file discovery or config behavior looks off.
4. Use `context-debt fix .` to preview safe fixes.
5. Use `context-debt doctor . --verbose` when you need diagnostics plus the current finding basis in one place.

## What Gets Scanned

`context-debt` currently scans project metadata and instruction-like files:

- AI context files such as `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, Codex files, and Windsurf files
- `README.md`
- Node metadata such as `package.json` and lockfiles
- Python metadata such as `pyproject.toml`, `poetry.lock`, and `uv.lock`
- MCP config files such as `.mcp.json`, `.cursor/mcp.json`, and `.claude/mcp.json`

It checks structured signals such as command references, local file/path references, package manager guidance, MCP capability hints, duplicated instruction blocks, and oversized context files.

## Commands

### `scan`

```bash
context-debt scan [path]
```

Scan a repository and emit text, JSON, or static HTML results.

Common options:

- `--json` or `--format json`: output machine-readable JSON
- `--format html --output <path>`: write a standalone HTML report
- `--strict`: fail on `HIGH` and high-confidence `MEDIUM`
- `--no-color`: disable ANSI color
- `--verbose`: show explanations and extra issue metadata
- `--config <path>`: custom config file
- `--max-issues <count>`: cap displayed issues while keeping full totals
- `--root <path>`: limit discovery to a repo-relative root; repeat to scan multiple roots
- `--include <glob>` / `--exclude <glob>`: append discovery globs

### `doctor`

```bash
context-debt doctor [path]
```

Print discovery diagnostics: config status, effective include/exclude globs, rule overrides, discovered context files, MCP files, package metadata, and file counts.

### `fix`

```bash
context-debt fix [path]
context-debt fix [path] --write
```

Preview or apply conservative high-confidence edits:

- remove lines that reference missing local files
- remove exact duplicate instruction units
- generate `context-debt.compact.md` from canonical instruction blocks

### `init`

```bash
context-debt init
```

Create a default `context-debt.config.json` in the current directory.

## Sample Output

```text
Context Debt Report

HIGH (1)
  missing-test-script - Referenced test command has no matching script
    File: CLAUDE.md:3
    Confidence: high (0.98)
    Evidence: pnpm test was referenced, but package.json has no "test" script.
    Recommendation: Add scripts.test to package.json or update the instruction to the correct test command.

MEDIUM (1)
  referenced-file-missing - Referenced local file does not exist
    File: AGENTS.md:7
    Confidence: medium (0.78)
    Evidence: docs/release-playbook.md was referenced, but /repo/docs/release-playbook.md does not exist.
    Recommendation: Create the referenced file or update the instruction to point at an existing path.

Summary: 1 HIGH, 1 MEDIUM, 0 LOW, 0 INFO
```

Severity meaning:

- `HIGH`: likely broken or risky guidance
- `MEDIUM`: conflicting, stale, or oversized context
- `LOW`: signal-quality or token-efficiency problems
- `INFO`: informational findings

## JSON Example

```json
{
  "schemaVersion": "1.1",
  "tool": "context-debt",
  "version": "0.1.0",
  "displayedIssues": 1,
  "scannedPath": ".",
  "summary": {
    "HIGH": 1,
    "MEDIUM": 0,
    "LOW": 0,
    "INFO": 0
  },
  "strictFailureCount": 0,
  "totalIssues": 1,
  "issues": [
    {
      "id": "missing-test-script",
      "ruleId": "missing-test-script",
      "title": "Referenced test command has no matching script",
      "severity": "HIGH",
      "file": "CLAUDE.md",
      "line": 3,
      "evidence": "pnpm test was referenced, but package.json has no \"test\" script.",
      "explanation": "AI instructions point to a Node test command that cannot be resolved in package.json.",
      "recommendation": "Add scripts.test to package.json or update the instruction to the correct test command.",
      "sourceKind": "claude",
      "confidence": 0.98,
      "confidenceLabel": "high",
      "autofixAvailable": true
    }
  ]
}
```

Useful JSON fields include `summary`, `displayedIssues`, `totalIssues`, `strictFailureCount`, `confidence`, `confidenceLabel`, `autofixAvailable`, `sourceKind`, `resolvedPath`, and `relatedFiles`.

## Configuration

Create `context-debt.config.json`:

```json
{
  "ruleSettings": {
    "missing-lint-script": {
      "level": "off"
    },
    "repeated-negative-rules": {
      "level": "warn"
    }
  },
  "rules": {
    "referencedFileMissing": {
      "ignorePaths": ["docs/generated/known-gap.md"],
      "ignoreGlobs": ["docs/archive/**/*.md"],
      "ignorePatterns": ["^storage/logs/.+\\.log$"]
    }
  },
  "scan": {
    "include": [".cursor/**/*.mdc"],
    "exclude": ["node_modules", "dist", "coverage", "tmp"],
    "roots": ["packages/app"]
  },
  "thresholds": {
    "duplicateInstructionSimilarity": 0.72,
    "oversizedContextChars": 12000,
    "tokenWasteMinWords": 40
  }
}
```

Full configuration and MCP guidance live in [docs/rules.md](docs/rules.md).

## Rule List

Current rules:

- `missing-ai-context`
- `missing-test-script`
- `missing-python-test-command`
- `missing-python-lint-command`
- `missing-build-script`
- `missing-lint-script`
- `conflicting-package-manager`
- `dangerous-mcp-permission`
- `referenced-file-missing`
- `contradictory-build-command`
- `contradictory-lint-command`
- `contradictory-test-command`
- `stale-reference`
- `oversized-context-file`
- `duplicate-instructions`
- `too-many-global-rules`
- `token-waste`
- `repeated-negative-rules`

See [docs/rules.md](docs/rules.md) for severity, trigger details, configuration keys, and MCP examples.

## CI Example

Minimal GitHub Actions step:

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm exec context-debt scan . --strict
```

Meaning:

- fail CI on `HIGH`
- fail CI on high-confidence `MEDIUM` when `--strict` is enabled
- allow `LOW` and `INFO` to pass by default

This repository also includes a full workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) covering lint, tests on Node 20 and 22, build, and package smoke tests.

## Package Smoke Test

Release validation should test the actual packed artifact, not only the local source tree.

```bash
pnpm build
pnpm smoke:package
```

The smoke script packs the CLI, checks packaged files, runs the packed binary on a clean fixture, and verifies CLI path behavior from a separate working directory.

## Exit Codes

- `0`: only `LOW` / `INFO`, or no issues
- `1`: `HIGH`, or high-confidence `MEDIUM` under `--strict`
- `2`: runtime or config error

## Use Cases

Use `context-debt` when you want to:

- keep `AGENTS.md` and `CLAUDE.md` aligned
- catch broken paths before agents waste cycles
- standardize package-manager guidance across docs
- control MCP risk in repo-local config files
- reduce duplicated instruction blocks across tools
- add deterministic AI-context checks to CI

## Roadmap

- more autofixers beyond exact duplicate and missing-reference cleanup
- richer rule-level documentation and examples
- more real-repo regression fixtures to calibrate false positives

Real-repo regression coverage is validated in CI. Every shipped rule must be exercised by third-party regression triage, or be explicitly listed in `regressions/manifest.json` with a coverage-gap reason until a fixture is added.

## Release Notes

- [CHANGELOG.md](CHANGELOG.md)
- [docs/releasing.md](docs/releasing.md)
