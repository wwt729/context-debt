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
        manager: "pnpm",
        scriptName: "test",
        file: "AGENTS.md",
        line: 4,
        sourceKind: "readme",
      },
      {
        category: "build",
        command: "npm run build",
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
        manager: "pnpm",
        scriptName: "test:unit",
        file: "README.md",
        line: 1,
        sourceKind: "readme",
      },
      {
        category: "build",
        command: "yarn build:prod",
        manager: "yarn",
        scriptName: "build:prod",
        file: "README.md",
        line: 2,
        sourceKind: "readme",
      },
      {
        category: "test",
        command: "npm run test:e2e",
        manager: "npm",
        scriptName: "test:e2e",
        file: "README.md",
        line: 3,
        sourceKind: "readme",
      },
      {
        category: "lint",
        command: "pnpm lint:fix",
        manager: "pnpm",
        scriptName: "lint:fix",
        file: "README.md",
        line: 4,
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

  test("classifies non-local path candidates without treating them as local files", () => {
    const noisyContent = [
      "Use `spatie/laravel-permission`.",
      "Expose the route under `/ai`.",
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
        line: 3,
        referenceType: "inline-code",
        sourceKind: "readme",
      },
      {
        candidateKind: "command-argument",
        value: "configs/vitest.unit.json",
        file: "AGENTS.md",
        line: 4,
        referenceType: "instruction-text",
        sourceKind: "readme",
      },
      {
        candidateKind: "example-path",
        value: "src/example.ts",
        file: "AGENTS.md",
        line: 5,
        referenceType: "instruction-text",
        sourceKind: "readme",
      },
      {
        candidateKind: "local-file",
        value: "docs/testing.md",
        file: "AGENTS.md",
        line: 6,
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
