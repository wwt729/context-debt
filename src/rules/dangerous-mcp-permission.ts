import type { Issue, RuleModule, ScanContext } from "../core/types.js";
import { parseMcpConfig } from "../parsers/mcp.js";
import { buildMcpIssue, getMcpRiskFindings } from "../utils/mcp-risk.js";

export const dangerousMcpPermissionRule: RuleModule = {
  id: "dangerous-mcp-permission",
  check(context: ScanContext): Issue[] {
    const issues: Issue[] = [];

    for (const file of context.contextFiles.filter(
      (entry) => entry.kind === "mcp",
    )) {
      for (const server of parseMcpConfig(file.path, file.content)) {
        for (const finding of getMcpRiskFindings(server)) {
          issues.push(
            buildMcpIssue(
              file.path,
              file.kind,
              server,
              finding.capability,
              finding.confidence,
            ),
          );
        }
      }
    }

    return issues;
  },
};
