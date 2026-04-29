import { describe, expect, test } from "vitest";

import { extractCommands } from "../src/parsers/markdown.js";

describe("markdown command extraction heuristics", () => {
  test("ignores commands inside example code fences", () => {
    const content = [
      "Below is a minimal example of an AGENTS.md file:",
      "",
      "```markdown",
      "- Run `pnpm test` before merging.",
      "- Run `pnpm lint` before merging.",
      "```",
      "",
      "Run `pnpm build` locally.",
    ].join("\n");

    expect(extractCommands("README.md", content)).toEqual([
      {
        category: "build",
        command: "pnpm build",
        file: "README.md",
        line: 8,
        manager: "pnpm",
        scriptName: "build",
        sourceKind: "readme",
      },
    ]);
  });

  test("ignores optional commands in recap tables", () => {
    const content = [
      "| Command | Purpose |",
      "| --- | --- |",
      "| `npm run test` | Execute the test suite (if present). |",
      "| `npm run build` | Build the app. |",
    ].join("\n");

    expect(extractCommands("AGENTS.md", content)).toEqual([
      {
        category: "build",
        command: "npm run build",
        file: "AGENTS.md",
        line: 4,
        manager: "npm",
        scriptName: "build",
        sourceKind: "readme",
      },
    ]);
  });

  test("ignores structured command fields inside rule format blocks", () => {
    const content = [
      "## Rule Format",
      "```json",
      '{"command":"npm test"}',
      '{"command":"npm run build"}',
      "```",
      "",
      "## Workflow Steps",
      "- Execute the test suite using `npm test`.",
    ].join("\n");

    expect(extractCommands(".cursor/rules/workflow.mdc", content)).toEqual([
      {
        category: "test",
        command: "npm test",
        file: ".cursor/rules/workflow.mdc",
        line: 8,
        manager: "npm",
        scriptName: "test",
        sourceKind: "readme",
      },
    ]);
  });

  test("ignores commands inside example subsections", () => {
    const content = [
      "## Examples",
      "",
      "### Feature Development",
      "```bash",
      "npm test",
      "npm run build",
      "```",
      "",
      "## Workflow Steps",
      "- Execute the test suite using `npm test`.",
    ].join("\n");

    expect(extractCommands(".cursor/rules/workflow.mdc", content)).toEqual([
      {
        category: "test",
        command: "npm test",
        file: ".cursor/rules/workflow.mdc",
        line: 10,
        manager: "npm",
        scriptName: "test",
        sourceKind: "readme",
      },
    ]);
  });
});
