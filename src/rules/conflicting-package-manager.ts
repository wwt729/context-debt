import type {
  Issue,
  PackageManagerName,
  RuleModule,
  ScanContext,
} from "../core/types.js";

export const conflictingPackageManagerRule: RuleModule = {
  id: "conflicting-package-manager",
  check(context: ScanContext): Issue[] {
    const managers = summarizeManagers(context);
    const activeManagers = (
      ["npm", "pnpm", "yarn"] as PackageManagerName[]
    ).filter((manager) => managers.get(manager)?.length);

    if (activeManagers.length < 2) {
      return [];
    }

    const evidence = activeManagers
      .map((manager) => {
        const sources = managers.get(manager) ?? [];
        const first = sources[0];
        return `${manager} (${first.file}${first.line ? `:${first.line}` : ""})`;
      })
      .join(", ");

    return [
      {
        id: "conflicting-package-manager",
        ruleId: "conflicting-package-manager",
        title: "Conflicting package manager guidance detected",
        severity: "HIGH",
        file: ".",
        evidence,
        explanation:
          "Different files or project metadata recommend different package managers for the same repository.",
        recommendation:
          "Choose one package manager and align AI instructions, lockfiles, and package.json packageManager.",
        sourceKind: "project-meta",
        confidence: 0.95,
        relatedFiles: activeManagers.flatMap((manager) =>
          (managers.get(manager) ?? []).map((entry) => entry.file),
        ),
      },
    ];
  },
};

function summarizeManagers(context: ScanContext) {
  const map = new Map<PackageManagerName, ScanContext["packageManagers"]>();

  for (const evidence of context.packageManagers) {
    const existing = map.get(evidence.manager) ?? [];
    existing.push(evidence);
    map.set(evidence.manager, existing);
  }

  return map;
}
