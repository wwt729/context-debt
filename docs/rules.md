# Rules and Configuration

This page is the reference manual for `context-debt` rules, configuration, and MCP risk scanning.

## Configuration Reference

Create `context-debt.config.json` in the repository root:

```json
{
  "ruleSettings": {
    "missing-lint-script": {
      "level": "off"
    },
    "repeated-negative-rules": {
      "level": "warn"
    },
    "too-many-global-rules": {
      "severity": "INFO"
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

| Key | Meaning |
| --- | --- |
| `ruleSettings.<rule-id>.enabled` | Disable a rule completely |
| `ruleSettings.<rule-id>.level` | Stable alias: `off`, `warn`, or `error` |
| `ruleSettings.<rule-id>.severity` | Override rule severity |
| `rules.referencedFileMissing.ignorePaths` | Exact raw or repo-relative paths to ignore |
| `rules.referencedFileMissing.ignoreGlobs` | Repo-relative glob patterns to ignore |
| `rules.referencedFileMissing.ignorePatterns` | Regex-based ignore patterns |
| `scan.include` | Additional include globs |
| `scan.exclude` | Additional exclude globs |
| `scan.roots` | Limit discovery to specific repo-relative roots; overridden by CLI `--root` |
| `thresholds.duplicateInstructionSimilarity` | Similarity threshold for `duplicate-instructions` |
| `thresholds.oversizedContextChars` | Character limit for `oversized-context-file` |
| `thresholds.tokenWasteMinWords` | Minimum duplicated words before `token-waste` fires |

Rule level semantics:

- `off`: disable the rule
- `warn`: force findings from that rule to `LOW`
- `error`: force findings from that rule to `HIGH`
- `severity`: explicit severity override, which takes precedence over `level`

## Rules

| Rule | Severity | What it checks |
| --- | --- | --- |
| `missing-ai-context` | `LOW` | The repo has no primary AI context file |
| `missing-test-script` | `HIGH` | AI docs reference a Node test command missing from `package.json` |
| `missing-python-test-command` | `HIGH` | AI docs reference a Python `pytest` command, but the repo has no matching local pytest tooling signal |
| `missing-python-lint-command` | `HIGH` | AI docs reference a Python `ruff` command, but the repo has no matching local ruff tooling signal |
| `missing-build-script` | `HIGH` | AI docs reference a build command missing from `package.json` |
| `missing-lint-script` | `HIGH` | AI docs reference a lint command missing from `package.json` |
| `conflicting-package-manager` | `HIGH` | Instructions, lockfiles, and metadata disagree on package manager choice across npm/pnpm/yarn/uv/poetry/pip |
| `dangerous-mcp-permission` | `HIGH` | MCP servers imply broad capability without enough scoping |
| `referenced-file-missing` | `HIGH` / `MEDIUM` | AI docs point to missing local files, with severity based on confidence |
| `contradictory-build-command` | `MEDIUM` | Different files recommend conflicting build commands |
| `contradictory-lint-command` | `MEDIUM` | Different files recommend conflicting lint commands |
| `contradictory-test-command` | `MEDIUM` | Different files recommend conflicting test commands |
| `stale-reference` | `MEDIUM` | A deprecated-looking path is missing and a likely replacement path exists |
| `oversized-context-file` | `MEDIUM` | A context file is too large for efficient prompt use |
| `duplicate-instructions` | `MEDIUM` | Instruction blocks overlap heavily across files, with repeated-section samples and a canonical file suggestion |
| `too-many-global-rules` | `MEDIUM` | One global file carries too much policy |
| `token-waste` | `LOW` | Long duplicated text wastes prompt budget, with estimated wasted tokens and top duplicate sources |
| `repeated-negative-rules` | `LOW` | Repeated "do not" rules lower signal quality |

## JSON Fields

JSON output uses schema version `1.1`.

Useful fields:

- `summary`: total issue counts by severity
- `displayedIssues` vs `totalIssues`: affected by `--max-issues`
- `schemaVersion`: stable JSON report schema version
- `strictFailureCount`: how many issues would fail `--strict`
- `confidence`: rule confidence score
- `confidenceLabel`: stable confidence tier used by `--strict`
- `autofixAvailable`: whether `context-debt fix` can propose a rule-owned edit
- `sourceKind`: where the issue originated
- `resolvedPath`: normalized resolved path when available
- `relatedFiles`: additional files involved in a multi-file finding

## MCP Scanning

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

Typical outcome:

- `dangerous-mcp-permission` when a server implies broad filesystem, command, or network scope without a clear allowlist or explanation

Safer MCP configs usually include both:

- a human-readable `description` or rationale
- a narrow allowlist such as `roots`, `allowedPaths`, `allowedCommands`, or `allowedDomains`

## Autofix Scope

`context-debt fix` is intentionally conservative. Current fixers:

- remove lines that reference missing local files
- remove exact duplicate instruction units
- generate `context-debt.compact.md` from canonical instruction blocks

Preview changes first:

```bash
context-debt fix .
```

Apply changes explicitly:

```bash
context-debt fix . --write
```
