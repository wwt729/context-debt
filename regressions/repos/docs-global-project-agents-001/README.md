# Global Agent Instructions for AI Coding Tools

Shared global instruction files, custom commands, and agent configurations for four AI coding CLI tools -- used to maintain consistent behavior across all of them.

## Supported Tools

| Tool | Global Config Location | Instructions File |
|------|----------------------|-------------------|
| [Factory (Droid)](https://factory.ai) | `~/.factory/` | `AGENTS.md` |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `~/.claude/` | `CLAUDE.md` |
| [OpenCode](https://opencode.ai) | `~/.config/opencode/` | `AGENTS.md` |
| [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli) | `~/.copilot/` | `copilot-instructions.md` |

## How It Works

### Two-layer instruction system

**Global** instructions live in your home directory and apply to every project. They cover universal rules: coding standards, toolchain preferences, workflow, testing philosophy, agent behavior.

**Project** instructions live in the repo root and cover only what's unique to that project: domain concepts, critical patterns, stack, non-standard commands. They never duplicate global rules.

The `/init-agents` command (or skill, depending on the tool) analyzes a codebase and generates the project-level file automatically.

### What each tool calls things

| Concept | Factory | Claude Code | OpenCode | Copilot CLI |
|---------|---------|-------------|----------|-------------|
| Global instructions | `~/.factory/AGENTS.md` | `~/.claude/CLAUDE.md` | `~/.config/opencode/AGENTS.md` | `~/.copilot/copilot-instructions.md` |
| Project instructions | `.factory/AGENTS.md` | `CLAUDE.md` | `AGENTS.md` | `.github/copilot-instructions.md` |
| Custom commands | `~/.factory/commands/*.md` | `~/.claude/commands/*.md` | `~/.config/opencode/commands/*.md` | N/A (uses skills instead) |
| Subagents / droids | `~/.factory/droids/*.md` | N/A (built-in) | `~/.config/opencode/agents/*.md` | `~/.copilot/skills/*/SKILL.md` |

## Repository Structure

```
.
├── factory/                        # Factory (Droid)
│   ├── AGENTS.md                   #   Global instructions
│   ├── commands/
│   │   ├── init-agents.md          #   /init-agents — generate project AGENTS.md
│   │   └── init-docs.md            #   /init-docs — generate modular docs with parallel droids
│   └── droids/
│       └── example-droid.md        #   Example custom droid (subagent)
│
├── claude-code/                    # Claude Code
│   ├── CLAUDE.md                   #   Global instructions
│   └── commands/
│       ├── init-agents.md          #   /init-agents — generate project CLAUDE.md
│       └── init-docs.md            #   /init-docs — generate modular docs with parallel subagents
│
├── opencode/                       # OpenCode
│   ├── AGENTS.md                   #   Global instructions
│   ├── commands/
│   │   ├── init-agents.md          #   /init-agents — generate project AGENTS.md
│   │   └── init-docs.md            #   /init-docs — generate modular docs with parallel subagents
│   └── agents/
│       └── example-agent.md        #   Example custom agent (subagent)
│
├── github-copilot/                 # GitHub Copilot CLI
│   ├── copilot-instructions.md     #   Global instructions
│   └── skills/
│       ├── init-agents/
│       │   └── SKILL.md            #   init-agents skill (equivalent to /init-agents command)
│       └── init-docs/
│           └── SKILL.md            #   init-docs skill (equivalent to /init-docs command)
│
└── README.md
```

## Installation

Copy the files to their respective locations:

```bash
# Factory (Droid)
cp factory/AGENTS.md ~/.factory/AGENTS.md
cp factory/commands/*.md ~/.factory/commands/
cp factory/droids/*.md ~/.factory/droids/

# Claude Code
cp claude-code/CLAUDE.md ~/.claude/CLAUDE.md
cp claude-code/commands/*.md ~/.claude/commands/

# OpenCode
cp opencode/AGENTS.md ~/.config/opencode/AGENTS.md
cp opencode/commands/*.md ~/.config/opencode/commands/
cp opencode/agents/*.md ~/.config/opencode/agents/

# GitHub Copilot CLI
cp github-copilot/copilot-instructions.md ~/.copilot/copilot-instructions.md
cp -r github-copilot/skills/* ~/.copilot/skills/
```

## Key Commands

### `/init-agents`

Available in: Factory, Claude Code, OpenCode, Copilot CLI (as skill)

Analyzes the current codebase and generates a project-level instructions file. The generated file is lean (~40 lines) and covers only project-specific concerns: purpose, stack, domain concepts, critical patterns, and modularization. Everything universal stays in the global file.

### `/init-docs`

Available in: Factory, Claude Code, OpenCode, Copilot CLI (as skill)

Generates comprehensive modular documentation by launching parallel subagents (one per doc file). Creates a `docs/INDEX.md` as an entry point and cross-references it in the project's instructions file.

## Customization

These files are templates with dummy paths and model IDs. To adapt:

1. **Toolchain table** -- update runtimes and paths in each instructions file to match your system
2. **Package managers** -- swap `bun`/`uv` for your preferred tools
3. **Code quality rules** -- adjust LOC limits, typing strictness, etc.
4. **Agent behavior** -- tune subagent parallelism, debugging strategies
5. **Models** -- the Copilot file references placeholder model IDs; replace with your actual model access
6. **Droids / agents** -- update the example subagent files with your actual model provider and ID

The core philosophy (global rules + project-specific overrides, no duplication, commands for scaffolding) transfers regardless of specific tool choices.

## Philosophy

- **Global handles universal, project handles specific** -- no duplication between layers
- **Commands automate scaffolding** -- `/init-agents` and `/init-docs` eliminate manual project setup
- **Same rules, four tools** -- consistent behavior whether using Factory, Claude Code, OpenCode, or Copilot
- **Lean project files** -- global rules mean project instructions stay under 200 lines
- **Parallel subagents** -- documentation and multi-file changes are delegated to concurrent agents for speed
