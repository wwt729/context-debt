import { describe, expect, test } from "vitest";

import {
  extractCommands,
  extractPackageManagers,
  extractPathReferences,
} from "../src/parsers/markdown.js";
import { parseMcpConfig } from "../src/parsers/mcp.js";
import { parsePackageJson } from "../src/parsers/package-json.js";

describe("parsePackageJson", () => {
  test("reads scripts and packageManager", () => {
    const parsed = parsePackageJson(
      "package.json",
      JSON.stringify({
        packageManager: "pnpm@10.33.0",
        scripts: {
          test: "vitest run",
        },
      }),
    );

    expect(parsed.packageManager).toBe("pnpm@10.33.0");
    expect(parsed.scripts).toEqual({ test: "vitest run" });
  });
});

describe("markdown extraction", () => {
  const content = [
    "# Guide",
    "",
    "Use pnpm for all commands.",
    "Run `pnpm test` before changes.",
    "Run `npm run build` only in legacy docs.",
    "Read `docs/testing.md` first.",
    "See [Spec](./docs/spec.md).",
  ].join("\n");

  test("extracts commands", () => {
    expect(extractCommands("AGENTS.md", content)).toEqual([
      {
        category: "test",
        command: "pnpm test",
        commandKind: "node-script",
        manager: "pnpm",
        scriptName: "test",
        file: "AGENTS.md",
        line: 4,
        sourceKind: "readme",
      },
      {
        category: "build",
        command: "npm run build",
        commandKind: "node-script",
        manager: "npm",
        scriptName: "build",
        file: "AGENTS.md",
        line: 5,
        sourceKind: "readme",
      },
    ]);
  });

  test("extracts command variants", () => {
    const variantContent = [
      "Run `pnpm run test:unit` before merge.",
      "Run `yarn build:prod` before release.",
      "Legacy docs still mention `npm run test:e2e`.",
      "Run `pnpm lint:fix` before commit.",
    ].join("\n");

    expect(extractCommands("README.md", variantContent)).toEqual([
      {
        category: "test",
        command: "pnpm run test:unit",
        commandKind: "node-script",
        manager: "pnpm",
        scriptName: "test:unit",
        file: "README.md",
        line: 1,
        sourceKind: "readme",
      },
      {
        category: "build",
        command: "yarn build:prod",
        commandKind: "node-script",
        manager: "yarn",
        scriptName: "build:prod",
        file: "README.md",
        line: 2,
        sourceKind: "readme",
      },
      {
        category: "test",
        command: "npm run test:e2e",
        commandKind: "node-script",
        manager: "npm",
        scriptName: "test:e2e",
        file: "README.md",
        line: 3,
        sourceKind: "readme",
      },
      {
        category: "lint",
        command: "pnpm lint:fix",
        commandKind: "node-script",
        manager: "pnpm",
        scriptName: "lint:fix",
        file: "README.md",
        line: 4,
        sourceKind: "readme",
      },
    ]);
  });

  test("extracts python test commands", () => {
    const pythonCommandContent = [
      "Run `pytest -q` before changes.",
      "Run `poetry run pytest tests/` for the packaged environment.",
      "Run `uv run --with pytest --with requests pytest -q tests/` for ephemeral checks.",
    ].join("\n");

    expect(extractCommands("AGENTS.md", pythonCommandContent)).toEqual([
      {
        category: "test",
        command: "pytest -q",
        commandKind: "python-test",
        file: "AGENTS.md",
        line: 1,
        scriptName: "pytest",
        sourceKind: "readme",
      },
      {
        category: "test",
        command: "poetry run pytest tests/",
        commandKind: "python-test",
        file: "AGENTS.md",
        line: 2,
        manager: "poetry",
        scriptName: "pytest",
        sourceKind: "readme",
      },
      {
        category: "test",
        command: "uv run --with pytest --with requests pytest -q tests/",
        commandKind: "python-test",
        file: "AGENTS.md",
        line: 3,
        manager: "uv",
        scriptName: "pytest",
        selfContained: true,
        sourceKind: "readme",
      },
    ]);
  });

  test("extracts python lint commands", () => {
    const pythonLintContent = [
      "Run `ruff check .` before changes.",
      "Run `poetry run ruff check src tests` for the packaged environment.",
      "Run `uv run --with ruff ruff check .` for ephemeral checks.",
    ].join("\n");

    expect(extractCommands("AGENTS.md", pythonLintContent)).toEqual([
      {
        category: "lint",
        command: "ruff check .",
        commandKind: "python-lint",
        file: "AGENTS.md",
        line: 1,
        scriptName: "ruff",
        sourceKind: "readme",
      },
      {
        category: "lint",
        command: "poetry run ruff check src tests",
        commandKind: "python-lint",
        file: "AGENTS.md",
        line: 2,
        manager: "poetry",
        scriptName: "ruff",
        sourceKind: "readme",
      },
      {
        category: "lint",
        command: "uv run --with ruff ruff check .",
        commandKind: "python-lint",
        file: "AGENTS.md",
        line: 3,
        manager: "uv",
        scriptName: "ruff",
        selfContained: true,
        sourceKind: "readme",
      },
    ]);
  });

  test("extracts path references", () => {
    expect(extractPathReferences("AGENTS.md", content)).toEqual([
      {
        candidateKind: "local-file",
        value: "docs/testing.md",
        file: "AGENTS.md",
        line: 6,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
      {
        candidateKind: "local-file",
        value: "./docs/spec.md",
        file: "AGENTS.md",
        line: 7,
        referenceType: "markdown-link",
        sourceKind: "readme",
      },
    ]);
  });

  test("ignores catalog-style path lists in docs", () => {
    const catalogContent = [
      "Supported files such as:",
      "",
      "- `AGENTS.md`",
      "- `.github/copilot-instructions.md`",
      "- `.cursor/mcp.json`",
      "",
      "The scanner currently scans instruction files, including `CLAUDE.md` and `.claude/mcp.json`.",
    ].join("\n");

    expect(extractPathReferences("README.md", catalogContent)).toEqual([]);
  });

  test("keeps actionable references even when examples are mentioned", () => {
    const actionableContent = [
      "Read files such as `docs/testing.md` and `docs/spec.md` before changes.",
    ].join("\n");

    expect(extractPathReferences("README.md", actionableContent)).toEqual([
      {
        candidateKind: "local-file",
        value: "docs/spec.md",
        file: "README.md",
        line: 1,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
      {
        candidateKind: "local-file",
        value: "docs/testing.md",
        file: "README.md",
        line: 1,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
    ]);
  });

  test("ignores absolute docs routes described as site links", () => {
    const docsRouteContent = [
      "When linking internally, prefer absolute doc paths like `/overview/quickstart`.",
    ].join("\n");

    expect(extractPathReferences("AGENTS.md", docsRouteContent)).toEqual([]);
  });

  test("ignores scheme-like placeholders inside markdown links", () => {
    const mdcLinkContent = [
      "Please read [CONTRIBUTING.md](mdc:CONTRIBUTING.md) for details.",
    ].join("\n");

    expect(extractPathReferences("README.md", mdcLinkContent)).toEqual([]);
  });

  test("ignores path references inside example code fences", () => {
    const fencedExampleContent = [
      "Below is a minimal example of an AGENTS.md file:",
      "",
      "```markdown",
      "Read `docs/missing.md` before changes.",
      "See [Spec](./docs/example-spec.md).",
      "```",
      "",
      "Read `docs/testing.md` before changes.",
    ].join("\n");

    expect(extractPathReferences("README.md", fencedExampleContent)).toEqual([
      {
        candidateKind: "local-file",
        value: "docs/testing.md",
        file: "README.md",
        line: 8,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
    ]);
  });

  test("classifies non-local path candidates without treating them as local files", () => {
    const noisyContent = [
      "Use `spatie/laravel-permission`.",
      "Expose the route under `/ai`.",
      "A failed API request may hit `/api/v1/settings`.",
      "Use `Http/Controllers/{Module}/` as a placeholder.",
      "Run tests with --config configs/vitest.unit.json.",
      "Use src/example.ts as an example.",
      "Read `docs/testing.md` first.",
    ].join("\n");

    expect(extractPathReferences("AGENTS.md", noisyContent)).toEqual([
      {
        candidateKind: "package-reference",
        value: "spatie/laravel-permission",
        file: "AGENTS.md",
        line: 1,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
      {
        candidateKind: "glob-pattern",
        value: "Http/Controllers/{Module}/",
        file: "AGENTS.md",
        line: 4,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
      {
        candidateKind: "command-argument",
        value: "configs/vitest.unit.json",
        file: "AGENTS.md",
        line: 5,
        referenceType: "instruction-text",
        sourceKind: "readme",
      },
      {
        candidateKind: "example-path",
        value: "src/example.ts",
        file: "AGENTS.md",
        line: 6,
        referenceType: "instruction-text",
        sourceKind: "readme",
      },
      {
        candidateKind: "local-file",
        value: "docs/testing.md",
        file: "AGENTS.md",
        line: 7,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
    ]);
  });

  test("extracts package manager hints", () => {
    expect(extractPackageManagers("AGENTS.md", content)).toEqual([
      {
        manager: "pnpm",
        file: "AGENTS.md",
        line: 3,
        evidence: "Use pnpm",
        source: "instruction",
        sourceKind: "readme",
      },
      {
        manager: "pnpm",
        file: "AGENTS.md",
        line: 4,
        evidence: "pnpm test",
        source: "instruction",
        sourceKind: "readme",
      },
      {
        manager: "npm",
        file: "AGENTS.md",
        line: 5,
        evidence: "npm run build",
        source: "instruction",
        sourceKind: "readme",
      },
    ]);
  });

  test("extracts python package manager hints", () => {
    const pythonContent = [
      "Use uv for local workflows.",
      "For packaged releases, prefer poetry.",
      "If you need a manual environment, install with pip.",
    ].join("\n");

    expect(extractPackageManagers("AGENTS.md", pythonContent)).toEqual([
      {
        manager: "uv",
        file: "AGENTS.md",
        line: 1,
        evidence: "Use uv",
        source: "instruction",
        sourceKind: "readme",
      },
      {
        manager: "poetry",
        file: "AGENTS.md",
        line: 2,
        evidence: "prefer poetry",
        source: "instruction",
        sourceKind: "readme",
      },
      {
        manager: "pip",
        file: "AGENTS.md",
        line: 3,
        evidence: "install with pip",
        source: "instruction",
        sourceKind: "readme",
      },
    ]);
  });
});

describe("parseMcpConfig", () => {
  test("extracts MCP server metadata", () => {
    const servers = parseMcpConfig(
      ".mcp.json",
      JSON.stringify({
        mcpServers: {
          filesystem: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem"],
            roots: ["docs"],
            description: "Restricted docs access",
          },
        },
      }),
    );

    expect(servers).toEqual([
      {
        allowlists: ["docs"],
        capabilityHints: [
          "filesystem",
          "npx",
          "-y",
          "@modelcontextprotocol/server-filesystem",
        ],
        description: "Restricted docs access",
        file: ".mcp.json",
        line: 1,
        name: "filesystem",
      },
    ]);
  });
});
