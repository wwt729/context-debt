# context-debt

Find stale, conflicting, missing, risky, duplicated, and wasteful AI coding instructions in your repo.

`context-debt` is a publishable npm CLI that statically scans repository context for Codex, Claude Code, Cursor, Copilot, Windsurf, MCP configs, and project metadata before those instructions drift into failures or token waste.

Your code has technical debt. Your AI context has context debt.

## Install

```bash
pnpm add -D context-debt
```

## Basic usage

```bash
context-debt scan .
context-debt scan . --strict
context-debt scan . --format json
context-debt scan . --max-issues 20
context-debt doctor .
context-debt fix .
context-debt fix . --write
```

## Commands

### `scan`

```bash
context-debt scan [path]
```

Options:

- `--json`: legacy convenience flag for JSON output
- `--format <text|json>`: explicit output format
- `--strict`: fail on `MEDIUM` and `HIGH`
- `--no-color`: disable ANSI color
- `--config <path>`: load a custom `context-debt.config.json`
- `--max-issues <count>`: cap displayed issues while preserving full summary totals
- `--include <glob>`: append include globs at runtime
- `--exclude <glob>`: append exclude globs at runtime

### `doctor`

```bash
context-debt doctor [path]
```

Prints discovery diagnostics:

- config status
- package.json presence
- discovered primary context files
- detected MCP config files
- discovered file counts by kind

### `fix`

```bash
context-debt fix [path]
context-debt fix [path] --write
```

`fix` is intentionally conservative and currently handles:

- removing lines that reference missing local files
- removing exact duplicate instruction units
- generating `context-debt.compact.md` from canonical instruction blocks

### `init`

```bash
context-debt init
```

Creates a default `context-debt.config.json` in the current directory.

## Sample output

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

## JSON example

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

Configuration notes:

- `ruleSettings.<rule-id>.enabled`: turn a rule off
- `ruleSettings.<rule-id>.severity`: override severity
- `rules.referencedFileMissing.ignorePaths`: exact raw or repo-relative paths
- `rules.referencedFileMissing.ignoreGlobs`: repo-relative glob ignores
- `rules.referencedFileMissing.ignorePatterns`: regex-based ignores
- `scan.include` and `scan.exclude`: repository-specific discovery tuning
- `thresholds.duplicateInstructionSimilarity`: overlap threshold for `duplicate-instructions`
- `thresholds.oversizedContextChars`: char threshold for `oversized-context-file`
- `thresholds.tokenWasteMinWords`: minimum duplicated words before `token-waste`

## Rules

| Rule | Severity | What it checks |
| --- | --- | --- |
| `missing-test-script` | `HIGH` | AI docs reference a Node test command that package.json does not expose |
| `missing-build-script` | `HIGH` | AI docs reference a build command with no matching script |
| `missing-lint-script` | `HIGH` | AI docs reference a lint command with no matching script |
| `conflicting-package-manager` | `HIGH` | Instructions, lockfiles, and package metadata disagree on npm/pnpm/yarn |
| `dangerous-mcp-permission` | `HIGH` | MCP servers imply wide access without enough scoping or explanation |
| `referenced-file-missing` | `HIGH` | AI docs point to missing local files or docs |
| `contradictory-test-command` | `MEDIUM` | Different files recommend conflicting test commands |
| `stale-reference` | `MEDIUM` | A referenced path looks renamed or outdated |
| `oversized-context-file` | `MEDIUM` | One context file is too large for efficient prompt use |
| `duplicate-instructions` | `MEDIUM` | Instruction blocks overlap heavily across files |
| `too-many-global-rules` | `MEDIUM` | One global instruction file is carrying too much policy |
| `token-waste` | `LOW` | Long duplicated instruction text wastes prompt budget |
| `repeated-negative-rules` | `LOW` | Repeated “do not” rules create noisy, low-signal instruction sets |
| `missing-ai-context` | `LOW` | The repo has no primary AI context file at all |

## MCP scanning example

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

Scanning it:

```bash
context-debt scan . --format json
```

Typical outcome:

- `dangerous-mcp-permission` when a server implies broad filesystem/network/command scope without a clear allowlist or explanation

Safe configs usually include both:

- a human-readable `description` or rationale
- a narrow allowlist such as `roots`, `allowedPaths`, `allowedCommands`, or `allowedDomains`

## CI example

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

This repository also includes a full workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) covering:

- lint
- test on Node 20 and 22
- build
- macOS/Linux package smoke tests against the packed tarball

## Package smoke test

Release validation should exercise the package that npm users install, not only the local source tree:

```bash
pnpm build
pnpm smoke:package
```

The smoke script:

- runs `pnpm pack`
- extracts the tarball and validates the packaged files that npm users receive
- verifies packed CLI execution on a clean fixture
- verifies direct CLI execution with `scan .` from a separate working directory

## Sample CI exit behavior

- `HIGH` issues: exit `1`
- `MEDIUM` issues with `--strict`: exit `1`
- `LOW` or `INFO` only: exit `0`
- runtime/config errors: exit `2`

## Roadmap

- more autofixers beyond exact duplicate and missing-reference cleanup
- richer rule-level documentation and examples
- more real-repo regression fixtures to calibrate false positives

## Release notes

- [CHANGELOG.md](CHANGELOG.md)
- [docs/releasing.md](docs/releasing.md)
