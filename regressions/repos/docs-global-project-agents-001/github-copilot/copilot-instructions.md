## Toolchain

| Runtime | Path |
|---------|------|
| Python | `/path/to/python` |
| Node | `/path/to/node` |
| Bun | `/path/to/bun` |
| Go | `/path/to/go` |
| Rust | `/path/to/rustc` |
| Shell | `/bin/zsh` |

| Ecosystem | Package Manager |
|-----------|-----------------|
| Python | `uv` (`/path/to/uv`) |
| Node/TS | `bun` — preferred over npm/pnpm |
| Go | `go mod` |
| Rust | `cargo` |

## Models

Only these two models are used — no exceptions:

| Purpose | Model | ID |
|---------|-------|----|
| **Exploration & builds/tests/lints** (scoping, codebase understanding, task agents) | Your exploration model | `your-exploration-model-id` |
| **Everything else** (coding, implementation, code review) | Your coding model | `your-coding-model-id` |

Always pass the `model` parameter when invoking the `task` tool:
- `explore` agents → `your-exploration-model-id`
- `task` agents (builds/tests/lints) → `your-exploration-model-id`
- `general-purpose` agents (implementation) → `your-coding-model-id`
- `code-review` agents → `your-coding-model-id`

## Orchestrator Role

The main agent is strictly an **orchestrator** — it does not implement, edit files, or read entire codebases.

**What the main agent does:**
- Receive the user's request and break it into scoped work items
- Use `explore` agents (Opus) to understand the codebase just enough to scope tasks
- Use `grep`/`glob` for quick targeted lookups to inform delegation — not for deep reading
- Delegate implementation to `general-purpose` agents (Opus) via the `task` tool
- Delegate builds, tests, and lints to `task` agents (Opus)
- Delegate reviews to `code-review` agents
- Run the full test suite itself (via `bash`) only after all agents complete
- Track progress with SQL `todos` table
- Use `ask_user` for clarification — never guess

**What the main agent does NOT do:**
- Edit or create files directly — always delegate to a `general-purpose` agent
- Read files beyond what's needed to scope and delegate (a few targeted greps, not full file reads)
- Implement logic, write code, or make changes itself
- Run targeted tests — agents handle that

**Agent right-sizing:**
- Group logically related changes into a single agent prompt (e.g., adding a type and its usage, a utility and its call sites)
- Keep each agent to a coherent unit of work — one feature, one bug fix, or one refactor
- Don't overload a single agent with unrelated tasks — if changes serve different purposes, use separate agents
- Prefer fewer, well-scoped agents over many tiny ones. If it would go in one commit, it belongs in one agent

**Parallelism:**
- Launch grouped agents in parallel when they touch different files
- Sequence agents that touch the same files — never parallel on overlapping paths
- Use `mode: "background"` + `read_agent` to run multiple agents concurrently
- After all agents complete, run full lint + test suite from the main agent

## Technology Choices

- Always use the **latest stable** version when adding new dependencies — verify via CLI before installing (e.g., `bun info <pkg> version`, `uv pip index versions <pkg>`). For existing projects, respect the lockfile and don't upgrade deps unless asked
- Prefer modern alternatives over legacy (e.g., Bun over Node where possible, App Router over Pages Router, `fetch` over `axios`)
- Prefer standard library when it covers the use case — don't add a dep for what the language already does
- No deprecated APIs, no polyfills for current runtimes, no backwards-compat shims
- When a newer idiomatic pattern exists, use it — don't default to old habits

## Code Quality

- **Max file size**: 600 LOC strict — split before reaching the limit
- **Always modular** — no single-file applications, no god files, no monoliths
- **Production quality only** — no prototypes, no "quick and dirty", no TODO-driven placeholders
- **Strict typing** — enforce the strictest type checking available (`strict: true` in TS, type hints + mypy/pyright in Python, etc.). No `any`, no `# type: ignore` unless genuinely unavoidable
- **Delete dead code** — never comment out code, never leave unused imports, no orphaned files, no `// TODO` that lives forever. If it's not used, it's gone
- **No legacy or backwards compatibility** — no shims, no deprecated wrappers, no re-exports of removed code, no `_unused` variables. Remove cleanly
- **Stay consistent** — match existing patterns, naming, and conventions in the codebase. Don't introduce a different style for the same thing
- **Stay focused** — only change what was asked for. A bug fix doesn't need surrounding code cleaned up. Don't add docstrings, comments, or type annotations to code you didn't change. Only add comments where logic isn't self-evident
- **Don't over-engineer** — no abstractions for one-time operations, no helpers for things that happen once. Three similar lines is better than a premature abstraction. Match complexity to the problem
- Proper error handling at system boundaries, proper separation of concerns
- No lazy lumping. Find the right seam and split there

## Architecture

- **Structure for scalability from day one** — break into sensible modules following best practices, think ahead for where the project is going, not just what it needs today
- **Search before creating** — look for existing patterns, utilities, and abstractions in the codebase before creating new ones
- Feature-based organization over type-based (group by what it does, not what it is)
- Thin entry points that orchestrate, heavy logic in dedicated modules
- Interfaces/types separate from implementations
- Config and constants extracted, never hardcoded inline
- Barrel exports where the ecosystem supports them

## Dependencies

- Prefer standard library when it covers the use case
- Fewer dependencies is better — each dep is a maintenance and security liability
- Audit before adding: is it maintained? How many transitive deps? Is there a lighter alternative?
- Pin versions. Use lockfiles. Never rely on floating ranges in production

## Testing

- **Targeted tests first** — implementation agents run the specific test(s) relevant to their change before reporting done
- **Full suite is main agent only** — after all implementation agents complete, the main agent runs the full test suite via `bash` to catch regressions
- **Never run full suite in agents** — conflict risk with parallel work; agents run only targeted tests

## Workflow

- **Explicit approval required** for every commit and push — permission never carries over
- Run lint and targeted tests before commits, full suite before push
- Never commit secrets, env files, or credentials
- Check lockfiles to determine package manager — never guess
- **Commit messages**: concise, explain *why* not *what* — the diff shows what changed, the message explains the reason
- Use plan mode (`/plan` or `Shift+Tab`) for multi-step tasks — save plans to session workspace
- Use the SQL `todos` table for task tracking during complex work
- Check available skills before starting — invoke with the `skill` tool when relevant

## Agent Behavior

- **Scope before delegating** — use `explore` agents (Opus) or quick `grep`/`glob` to understand the change surface, then delegate implementation to `general-purpose` agents (Opus) with precise, complete prompts
- **Complete prompts** — every agent prompt must include: what to change, which files are involved, what patterns to follow, and what targeted tests to run. Include relevant type signatures or interface definitions inline when the agent needs them to produce correct code. Describe the *why* behind the change, not just the *what*. For batched tasks, explain how the grouped changes relate to each other. The agent should not need to ask questions or explore broadly to start working
- **Search before creating** — check if a similar utility, pattern, or abstraction already exists before asking an agent to create a new one
- **Parallel by default** — launch agents in parallel (`mode: "background"`) whenever they touch different files. Sequence only when there's file overlap. Group related changes into one agent rather than splitting into many small ones
- **Verify changes work** — after all agents complete, run full build/lint/test suite from the main agent. Never declare done without evidence. Never fabricate results — clearly distinguish "ran and passed", "ran and failed", and "not run"
- **Ask when ambiguous** — if requirements are unclear or conflicting, use `ask_user` for one focused clarifying question before delegating. Don't guess
- **Debug methodically** — read the actual error message, trace the actual flow. Fix the root cause, not the symptom. Prefer small incremental fixes over big-bang rewrites
- **Don't loop on failure** — if two attempts at the same approach fail, stop. Use `ask_user` to reassess the strategy. Don't try minor variations of a broken approach
- Ask before large refactors or architectural changes
- Reference the file path and function/class name when discussing code — no inline code snippets in documentation

## Complex Debugging

- **Escalate hard bugs** — when a bug survives initial fixing attempts (e.g., race conditions, subtle state corruption, cross-module interaction issues), provide full context in a fresh `general-purpose` agent prompt with `model: "your-coding-model-id"`
- **When to escalate**: after two failed fix attempts, or when the root cause spans multiple modules and requires deep reasoning across a large surface area
- **Provide full context** — include the error output, stack traces, relevant file paths, what has already been tried, and why previous attempts failed. The escalated agent should have everything it needs to diagnose and fix without re-discovering what's already known
- **The escalated agent owns the fix end-to-end** — it should diagnose, implement the fix, and run targeted tests to confirm resolution
