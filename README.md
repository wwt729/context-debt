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
- Human-readable terminal output and machine-readable JSON output.

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
context-debt doctor .
context-debt fix .
context-debt fix . --write
```

Typical workflow:

1. Run `context-debt scan .` locally while editing instructions.
2. Add `context-debt scan . --strict` to CI.
3. Use `context-debt doctor .` when file discovery or config behavior looks off.
4. Use `context-debt fix .` to preview safe fixes.

## What Gets Scanned

`context-debt` currently scans project metadata and instruction-like files, including:

- `AGENTS.md`
- `CLAUDE.md`
- Cursor rules under `.cursor/rules/`
- Copilot instructions
- Codex-related instruction files
- Windsurf-related instruction files
- `README.md`
- `package.json`
- MCP config files

It does not try to "understand everything". It checks structured signals such as:

- command references
- local file/path references
- package manager guidance
- MCP capability hints and allowlists
- duplicated or oversized instruction blocks
- rule density and repeated negative rules

## Commands

### `scan`

```bash
context-debt scan [path]
```

Scan a repository and emit text or JSON results.

Options:

- `--json`: convenience flag for JSON output
- `--format <text|json>`: explicit output format
- `--strict`: fail on `MEDIUM` and `HIGH`
- `--no-color`: disable ANSI color
- `--config <path>`: custom config file
- `--max-issues <count>`: cap displayed issues while keeping full totals
- `--include <glob>`: append include globs
- `--exclude <glob>`: append exclude globs

Examples:

```bash
context-debt scan .
context-debt scan . --strict
context-debt scan . --format json --max-issues 20
context-debt scan . --config ./context-debt.config.json
```

### `doctor`

```bash
context-debt doctor [path]
```

Print discovery diagnostics for the repository:

- config status
- package.json presence
- discovered primary context files
- detected MCP files
- discovered file counts by kind

### `fix`

```bash
context-debt fix [path]
context-debt fix [path] --write
```

`fix` is intentionally conservative and only applies high-confidence edits.

Current fixers:

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

HIGH (2)
  missing-test-script - Referenced test command has no matching script
    File: CLAUDE.md:3
    Evidence: pnpm test was referenced, but package.json has no "test" script.
    Recommendation: Add scripts.test to package.json or update the instruction to the correct test command.
  referenced-file-missing - Referenced local file does not exist
    File: AGENTS.md:7
    Evidence: docs/release-playbook.md was referenced, but /repo/docs/release-playbook.md does not exist.
    Recommendation: Create the referenced file or update the instruction to point at an existing path.

MEDIUM (1)
  stale-reference - Referenced file path appears stale after a rename
    File: README.md:12
    Evidence: docs/legacy-ci.md was referenced, but docs/ci.md exists instead.
    Recommendation: Update the instruction to the current path so agents follow the right file.

LOW (1)
  token-waste - Repeated long instruction blocks waste context budget
    File: AGENTS.md
    Evidence: 91 duplicated words were repeated across AGENTS.md and CLAUDE.md.
    Recommendation: Keep one canonical instruction block and reference it from the other files.

Summary: 2 HIGH, 1 MEDIUM, 1 LOW, 0 INFO
```

Interpretation:

- `HIGH`: likely broken or risky guidance
- `MEDIUM`: conflicting, stale, or oversized context
- `LOW`: signal-quality or token-efficiency problems
- `INFO`: informational findings

## JSON Example

```json
{
  "tool": "context-debt",
  "version": "0.1.0",
  "displayedIssues": 2,
  "scannedPath": ".",
  "summary": {
    "HIGH": 2,
    "MEDIUM": 1,
    "LOW": 1,
    "INFO": 0
  },
  "totalIssues": 4,
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
      "confidence": 0.98
    },
    {
      "id": "referenced-file-missing",
      "ruleId": "referenced-file-missing",
      "title": "Referenced local file does not exist",
      "severity": "HIGH",
      "file": "AGENTS.md",
      "line": 7,
      "evidence": "docs/release-playbook.md was referenced, but /repo/docs/release-playbook.md does not exist.",
      "explanation": "AI instructions refer to a local file or path that is not present in the repository.",
      "recommendation": "Create the referenced file or update the instruction to point at an existing path.",
      "sourceKind": "agents",
      "confidence": 0.9,
      "resolvedPath": "docs/release-playbook.md"
    }
  ]
}
```

Useful fields:

- `summary`: total issue counts by severity
- `displayedIssues` vs `totalIssues`: affected by `--max-issues`
- `confidence`: rule confidence score
- `sourceKind`: where the issue originated
- `resolvedPath`: normalized resolved path when available

## Configuration

Create `context-debt.config.json`:

```json
{
  "ruleSettings": {
    "missing-lint-script": {
      "enabled": false
    },
    "repeated-negative-rules": {
      "severity": "MEDIUM"
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
    "exclude": ["node_modules", "dist", "coverage", "tmp"]
  },
  "thresholds": {
    "duplicateInstructionSimilarity": 0.72,
    "oversizedContextChars": 12000,
    "tokenWasteMinWords": 40
  }
}
```

Configuration reference:

| Key | Meaning |
| --- | --- |
| `ruleSettings.<rule-id>.enabled` | Disable a rule completely |
| `ruleSettings.<rule-id>.severity` | Override rule severity |
| `rules.referencedFileMissing.ignorePaths` | Exact raw or repo-relative paths to ignore |
| `rules.referencedFileMissing.ignoreGlobs` | Repo-relative glob patterns to ignore |
| `rules.referencedFileMissing.ignorePatterns` | Regex-based ignore patterns |
| `scan.include` | Additional include globs |
| `scan.exclude` | Additional exclude globs |
| `thresholds.duplicateInstructionSimilarity` | Similarity threshold for `duplicate-instructions` |
| `thresholds.oversizedContextChars` | Character limit for `oversized-context-file` |
| `thresholds.tokenWasteMinWords` | Minimum duplicated words before `token-waste` fires |

## Rules

| Rule | Severity | What it checks |
| --- | --- | --- |
| `missing-test-script` | `HIGH` | AI docs reference a test command missing from `package.json` |
| `missing-build-script` | `HIGH` | AI docs reference a build command missing from `package.json` |
| `missing-lint-script` | `HIGH` | AI docs reference a lint command missing from `package.json` |
| `conflicting-package-manager` | `HIGH` | Instructions, lockfiles, and metadata disagree on npm/pnpm/yarn |
| `dangerous-mcp-permission` | `HIGH` | MCP servers imply broad capability without enough scoping |
| `referenced-file-missing` | `HIGH` | AI docs point to missing local files |
| `contradictory-test-command` | `MEDIUM` | Different files recommend conflicting test commands |
| `stale-reference` | `MEDIUM` | A referenced path appears stale after a rename |
| `oversized-context-file` | `MEDIUM` | A context file is too large for efficient prompt use |
| `duplicate-instructions` | `MEDIUM` | Instruction blocks overlap heavily across files |
| `too-many-global-rules` | `MEDIUM` | One global file carries too much policy |
| `token-waste` | `LOW` | Long duplicated text wastes prompt budget |
| `repeated-negative-rules` | `LOW` | Repeated “do not” rules lower signal quality |
| `missing-ai-context` | `LOW` | The repo has no primary AI context file |

## MCP Scanning Example

`context-debt` scans these MCP config locations by default:

- `.mcp.json`
- `mcp.json`
- `.vscode/mcp.json`
- `.cursor/mcp.json`
- `.claude/mcp.json`

Example risky config:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "roots": ["/"]
    }
  }
}
```

Run:

```bash
context-debt scan . --format json
```

Typical outcome:

- `dangerous-mcp-permission` when a server implies broad filesystem, command, or network scope without a clear allowlist or explanation

Safer MCP configs usually include both:

- a human-readable `description` or rationale
- a narrow allowlist such as `roots`, `allowedPaths`, `allowedCommands`, or `allowedDomains`

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
- fail CI on `MEDIUM` when `--strict` is enabled
- allow `LOW` and `INFO` to pass by default

This repository also includes a full workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) covering:

- `lint`
- `test` on Node 20 and 22
- `build`
- macOS/Linux package smoke tests

## Package Smoke Test

Release validation should test the actual packed artifact, not only the local source tree.

```bash
pnpm build
pnpm smoke:package
```

The smoke script:

- runs `pnpm pack`
- extracts the tarball and checks packaged files
- runs the packed CLI on a clean fixture
- verifies CLI path behavior from a separate working directory

## Exit Codes

- `0`: only `LOW` / `INFO`, or no issues
- `1`: `HIGH`, or `MEDIUM` under `--strict`
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

## Release Notes

- [CHANGELOG.md](CHANGELOG.md)
- [docs/releasing.md](docs/releasing.md)
