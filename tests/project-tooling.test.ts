import { describe, expect, test } from "vitest";

import {
  buildProjectTooling,
  collectProjectMetaPackageManagers,
  getPackageManagerFamily,
  isSupportedPackageManager,
} from "../src/core/project-tooling.js";

describe("project tooling analysis", () => {
  test("detects supported package managers and their families", () => {
    expect(isSupportedPackageManager("pnpm")).toBe(true);
    expect(isSupportedPackageManager("uv")).toBe(true);
    expect(isSupportedPackageManager("bundler")).toBe(false);
    expect(getPackageManagerFamily("yarn")).toBe("node");
    expect(getPackageManagerFamily("poetry")).toBe("python");
  });

  test("collects lockfile package managers from discovered paths", () => {
    const packageManagers = collectProjectMetaPackageManagers(
      new Set(["pnpm-lock.yaml", "poetry.lock", "README.md"]),
    );

    expect(packageManagers).toEqual([
      {
        manager: "pnpm",
        file: "pnpm-lock.yaml",
        evidence: "pnpm-lock.yaml",
        source: "lockfile",
        sourceKind: "project-meta",
      },
      {
        manager: "poetry",
        file: "poetry.lock",
        evidence: "poetry.lock",
        source: "lockfile",
        sourceKind: "project-meta",
      },
    ]);
  });

  test("builds package manager family summaries and package directory index", () => {
    const tooling = buildProjectTooling(
      [
        {
          path: "AGENTS.md",
          kind: "agents",
          content: "Use pnpm for Node and pytest for Python.",
        },
        {
          path: "pyproject.toml",
          kind: "project-meta",
          content:
            '[tool.pytest.ini_options]\naddopts = "-q"\n[tool.ruff]\nline-length = 100\n',
        },
      ],
      [
        {
          path: "package.json",
          packageManager: "pnpm@10.33.0",
          scripts: { test: "vitest run" },
        },
        {
          path: "packages/app/package.json",
          scripts: { build: "tsup" },
        },
      ],
      [
        {
          manager: "pnpm",
          file: "AGENTS.md",
          line: 3,
          evidence: "Use pnpm",
          source: "instruction",
          sourceKind: "agents",
        },
        {
          manager: "poetry",
          file: "poetry.lock",
          evidence: "poetry.lock",
          source: "lockfile",
          sourceKind: "project-meta",
        },
      ],
    );

    expect(tooling.packageJsonByDirectory.get(".")?.scripts.test).toBe(
      "vitest run",
    );
    expect(
      tooling.packageJsonByDirectory.get("packages/app")?.scripts.build,
    ).toBe("tsup");
    expect(tooling.packageManagersByName.get("pnpm")?.[0]?.file).toBe(
      "AGENTS.md",
    );
    expect(tooling.packageManagerFamilies).toEqual([
      {
        family: "node",
        managers: ["pnpm"],
        evidenceByManager: new Map([
          [
            "pnpm",
            [
              {
                manager: "pnpm",
                file: "AGENTS.md",
                line: 3,
                evidence: "Use pnpm",
                source: "instruction",
                sourceKind: "agents",
              },
            ],
          ],
        ]),
      },
      {
        family: "python",
        managers: ["poetry"],
        evidenceByManager: new Map([
          [
            "poetry",
            [
              {
                manager: "poetry",
                file: "poetry.lock",
                evidence: "poetry.lock",
                source: "lockfile",
                sourceKind: "project-meta",
              },
            ],
          ],
        ]),
      },
    ]);
    expect(tooling.pythonTestTooling).toEqual({
      evidenceFiles: ["pyproject.toml"],
      hasPytest: true,
    });
    expect(tooling.pythonLintTooling).toEqual({
      evidenceFiles: ["pyproject.toml"],
      hasRuff: true,
    });
  });
});
