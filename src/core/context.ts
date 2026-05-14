import { readFileSync } from "node:fs";

import { parseMarkdownContext } from "../parsers/markdown.js";
import { parsePackageJson } from "../parsers/package-json.js";
import {
  classifyContextFile,
  discoverPaths,
  toAbsolutePath,
} from "./discovery.js";
import {
  buildProjectTooling,
  collectProjectMetaPackageManagers,
  isSupportedPackageManager,
} from "./project-tooling.js";
import type {
  ContextDebtConfig,
  ContextFile,
  PackageManagerEvidence,
  ParsedPackageJson,
  ScanContext,
} from "./types.js";

export async function buildScanContext(
  rootDir: string,
  config: ContextDebtConfig,
): Promise<ScanContext> {
  const discovered = await discoverPaths(rootDir, config);
  const contextFiles: ContextFile[] = [];
  const commands: ScanContext["commands"] = [];
  const pathReferences: ScanContext["pathReferences"] = [];
  const packageJsons: ParsedPackageJson[] = [];
  const packageManagers: PackageManagerEvidence[] = [];
  const discoveredPaths = new Set(discovered);
  let packageJson: ScanContext["packageJson"];

  for (const relativePath of discovered) {
    const absolutePath = toAbsolutePath(rootDir, relativePath);
    const content = readFileSync(absolutePath, "utf8");
    const kind = classifyContextFile(relativePath);

    contextFiles.push({ path: relativePath, kind, content });

    if (kind === "package-json") {
      const parsedPackageJson = parsePackageJson(relativePath, content);
      packageJsons.push(parsedPackageJson);

      if (relativePath === "package.json") {
        packageJson = parsedPackageJson;
      }

      if (relativePath === "package.json" && parsedPackageJson.packageManager) {
        const [manager] = parsedPackageJson.packageManager.split("@");
        if (isSupportedPackageManager(manager)) {
          packageManagers.push({
            manager,
            file: relativePath,
            evidence: parsedPackageJson.packageManager,
            source: "package-json",
            sourceKind: "package-json",
          });
        }
      }
      continue;
    }

    if (isInstructionLike(kind)) {
      const parsed = parseMarkdownContext(relativePath, content);
      commands.push(
        ...parsed.commands.map((command) => ({ ...command, sourceKind: kind })),
      );
      pathReferences.push(
        ...parsed.pathReferences.map((reference) => ({
          ...reference,
          sourceKind: kind,
        })),
      );
      packageManagers.push(
        ...parsed.packageManagers.map((evidence) => ({
          ...evidence,
          sourceKind: kind,
        })),
      );
    }
  }
  packageManagers.push(...collectProjectMetaPackageManagers(discoveredPaths));

  return {
    rootDir,
    contextFiles,
    packageJson,
    packageJsons,
    commands,
    pathReferences,
    packageManagers,
    discoveredPaths,
    config,
    tooling: buildProjectTooling(contextFiles, packageJsons, packageManagers),
  };
}

function isInstructionLike(kind: ContextFile["kind"]): boolean {
  return (
    kind === "agents" ||
    kind === "claude" ||
    kind === "cursor-rule" ||
    kind === "copilot" ||
    kind === "codex" ||
    kind === "windsurf" ||
    kind === "readme"
  );
}
