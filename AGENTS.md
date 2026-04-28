# AGENTS.md

## Project

This repository builds `context-debt`, an npm CLI that scans repositories for stale, conflicting, duplicated, risky, or wasteful AI coding instructions.

Think of it as ESLint for AI coding context.

## Product principles

- Static analysis first.
- No external LLM API in MVP.
- No telemetry.
- No network access by default.
- Fast enough to run in CI.
- Human-readable terminal output.
- Machine-readable JSON output.
- Rules should be deterministic and testable.

## Tech stack

- TypeScript
- Node.js >= 20
- pnpm
- Commander.js
- fast-glob
- zod
- vitest
- tsup

## Commands

The CLI should support:

```bash
context-debt scan .
context-debt scan . --json
context-debt scan . --strict
context-debt init
context-debt doctor
```

## Code style

- Keep modules small.
- Prefer pure functions for rules.
- Every rule should export metadata and a check function.
- Every rule must have tests.
- Avoid hidden side effects.
- Do not introduce telemetry.
- Do not call external services.
- Do not add a web UI unless explicitly requested.

## Rule design

Each issue must include:

- id
- title
- severity
- file
- optional line
- evidence
- explanation
- recommendation
- optional autofixAvailable

Severity values:

- HIGH
- MEDIUM
- LOW
- INFO

## Test expectations

Before completing a task, run:

```bash
pnpm test
pnpm build
```

If dependencies changed, also run:

```bash
pnpm install
```

## Documentation expectations

README should always include:

- tagline
- install command
- basic usage
- sample output
- rule list
- CI example
- JSON example
- roadmap

## Workflow

- Inspect the repo first.
- Plan before editing code.
- After implementation, run `pnpm test` and `pnpm build`.

## Important

When adding or changing rules, update tests and README.
When fixing a repeated mistake, update this AGENTS.md.
