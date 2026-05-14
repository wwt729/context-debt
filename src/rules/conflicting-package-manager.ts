import type { Issue, RuleModule, ScanContext } from "../core/types.js";

export const conflictingPackageManagerRule: RuleModule = {
  id: "conflicting-package-manager",
  check(context: ScanContext): Issue[] {
    return context.tooling.packageManagerFamilies
      .filter((family) => family.managers.length >= 2)
      .map((family) => ({
        id: "conflicting-package-manager",
        ruleId: "conflicting-package-manager",
        title: "Conflicting package manager guidance detected",
        severity: "HIGH" as const,
        file: ".",
        evidence: family.managers
          .map((manager) =>
            formatManagerEvidence(
              manager,
              family.evidenceByManager.get(manager) ?? [],
            ),
          )
          .join("; "),
        explanation:
          "Different files or project metadata recommend different package managers for the same repository.",
        recommendation:
          "Choose one package manager and align AI instructions, lockfiles, and project metadata.",
        sourceKind: "project-meta" as const,
        confidence: 0.95,
        relatedFiles: family.managers.flatMap((manager) =>
          (family.evidenceByManager.get(manager) ?? []).map(
            (entry) => entry.file,
          ),
        ),
      }));
  },
};

function formatManagerEvidence(
  manager: ScanContext["packageManagers"][number]["manager"],
  sources: ScanContext["packageManagers"],
): string {
  const locations = sources
    .map((source) => `${source.file}${source.line ? `:${source.line}` : ""}`)
    .join(", ");

  return `${manager} -> ${locations}`;
}
