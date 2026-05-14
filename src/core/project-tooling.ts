import { dirname } from "node:path";

import type {
  ContextFile,
  PackageManagerEvidence,
  PackageManagerFamilySummary,
  PackageManagerName,
  ParsedPackageJson,
  ProjectToolingAnalysis,
  PythonCommandCategory,
  PythonCommandKind,
  PythonToolName,
  ToolingFamily,
} from "./types.js";

const packageManagerFamilies = {
  node: ["npm", "pnpm", "yarn"],
  python: ["uv", "poetry", "pip"],
} as const satisfies Record<ToolingFamily, PackageManagerName[]>;

const lockfileManagers = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "package-lock.json", manager: "npm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "poetry.lock", manager: "poetry" },
  { file: "uv.lock", manager: "uv" },
] as const satisfies ReadonlyArray<{
  file: string;
  manager: PackageManagerName;
}>;

const supportedManagers = new Set<PackageManagerName>(
  Object.values(packageManagerFamilies).flat(),
);

const pythonToolDescriptors = [
  {
    category: "test",
    commandKind: "python-test",
    matchers: [
      /\bpytest(?:[-_][a-z0-9]+)?\b/iu,
      /\[tool\.pytest(?:\.ini_options)?\]/iu,
    ],
    tool: "pytest",
  },
  {
    category: "lint",
    commandKind: "python-lint",
    matchers: [/\bruff\b/iu, /\[tool\.ruff(?:\.[a-z-]+)?\]/iu],
    tool: "ruff",
  },
] as const satisfies ReadonlyArray<{
  category: PythonCommandCategory;
  commandKind: PythonCommandKind;
  matchers: readonly RegExp[];
  tool: PythonToolName;
}>;

export function isSupportedPackageManager(
  value: string,
): value is PackageManagerName {
  return supportedManagers.has(value as PackageManagerName);
}

export function getPackageManagerFamily(
  manager: PackageManagerName,
): ToolingFamily {
  if (packageManagerFamilies.node.includes(manager)) {
    return "node";
  }

  return "python";
}

export function collectProjectMetaPackageManagers(
  discoveredPaths: Set<string>,
): PackageManagerEvidence[] {
  return lockfileManagers
    .filter((entry) => discoveredPaths.has(entry.file))
    .map((entry) => ({
      manager: entry.manager,
      file: entry.file,
      evidence: entry.file,
      source: "lockfile" as const,
      sourceKind: "project-meta" as const,
    }));
}

export function buildProjectTooling(
  contextFiles: ContextFile[],
  packageJsons: ParsedPackageJson[],
  packageManagers: PackageManagerEvidence[],
): ProjectToolingAnalysis {
  const packageJsonByDirectory = new Map(
    packageJsons.map((packageJson) => [dirname(packageJson.path), packageJson]),
  );
  const packageManagersByName = groupPackageManagers(packageManagers);

  return {
    packageJsonByDirectory,
    packageManagersByName,
    packageManagerFamilies: buildFamilySummaries(packageManagersByName),
    pythonTooling: buildPythonTooling(contextFiles),
  };
}

function groupPackageManagers(
  packageManagers: PackageManagerEvidence[],
): Map<PackageManagerName, PackageManagerEvidence[]> {
  const grouped = new Map<PackageManagerName, PackageManagerEvidence[]>();

  for (const evidence of packageManagers) {
    const existing = grouped.get(evidence.manager) ?? [];
    existing.push(evidence);
    grouped.set(evidence.manager, existing);
  }

  return grouped;
}

function buildFamilySummaries(
  packageManagersByName: Map<PackageManagerName, PackageManagerEvidence[]>,
): PackageManagerFamilySummary[] {
  return Object.entries(packageManagerFamilies).map(([family, managers]) => ({
    family: family as ToolingFamily,
    managers: managers.filter((manager) => packageManagersByName.has(manager)),
    evidenceByManager: new Map(
      managers
        .filter((manager) => packageManagersByName.has(manager))
        .map((manager) => [manager, packageManagersByName.get(manager) ?? []]),
    ),
  }));
}

function buildPythonTooling(
  contextFiles: ContextFile[],
): ProjectToolingAnalysis["pythonTooling"] {
  return Object.fromEntries(
    pythonToolDescriptors.map((descriptor) => [
      descriptor.tool,
      detectPythonTooling(contextFiles, descriptor),
    ]),
  ) as ProjectToolingAnalysis["pythonTooling"];
}

function detectPythonTooling(
  contextFiles: ContextFile[],
  descriptor: (typeof pythonToolDescriptors)[number],
): ProjectToolingAnalysis["pythonTooling"][PythonToolName] {
  const evidenceFiles = contextFiles
    .filter((file) => isPythonToolingFile(file.path))
    .filter((file) => hasPythonToolSignal(file.content, descriptor.matchers))
    .map((file) => file.path)
    .sort((left, right) => left.localeCompare(right));

  return {
    category: descriptor.category,
    commandKind: descriptor.commandKind,
    evidenceFiles,
    present: evidenceFiles.length > 0,
    tool: descriptor.tool,
  };
}

function isPythonToolingFile(path: string): boolean {
  return (
    path === "pyproject.toml" || path === "uv.lock" || path === "poetry.lock"
  );
}

function hasPythonToolSignal(
  content: string,
  matchers: readonly RegExp[],
): boolean {
  return matchers.some((matcher) => matcher.test(content));
}
