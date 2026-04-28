import type { Issue } from "../core/types.js";
import type { ParsedMcpServer } from "../parsers/mcp.js";

type RiskCapability =
  | "filesystem"
  | "shell"
  | "browser"
  | "network"
  | "environment";

const riskyMatchers: Record<RiskCapability, RegExp> = {
  filesystem:
    /\b(filesystem|file-system|file system|path|directory|workspace)\b/iu,
  shell: /\b(shell|exec|terminal|command|bash|zsh|powershell|cmd)\b/iu,
  browser: /\b(browser|playwright|chrome|chromium|puppeteer)\b/iu,
  network: /\b(network|fetch|http|https|web|remote|curl)\b/iu,
  environment: /\b(env|dotenv|secret|secrets|credential|credentials|\.env)\b/iu,
};

const allowlistMatchers: Record<RiskCapability, RegExp> = {
  filesystem: /\b(path|paths|root|roots|workspace|dir|directory|docs|src)\b/iu,
  shell: /\b(command|commands|script|scripts)\b/iu,
  browser: /\b(domain|domains|localhost|127\.0\.0\.1)\b/iu,
  network: /\b(domain|domains|host|hosts|url|urls|localhost|127\.0\.0\.1)\b/iu,
  environment: /\b(env|vars|keys|variable|variables)\b/iu,
};

export function getMcpRiskFindings(server: ParsedMcpServer): Array<{
  capability: RiskCapability;
  confidence: number;
}> {
  const findings: Array<{ capability: RiskCapability; confidence: number }> =
    [];

  for (const capability of Object.keys(riskyMatchers) as RiskCapability[]) {
    if (!hasCapability(server, capability)) {
      continue;
    }

    if (hasMitigation(server, capability)) {
      continue;
    }

    findings.push({
      capability,
      confidence: getConfidence(capability),
    });
  }

  return findings;
}

export function buildMcpIssue(
  file: string,
  sourceKind: Issue["sourceKind"],
  server: ParsedMcpServer,
  capability: RiskCapability,
  confidence: number,
): Issue {
  return {
    id: "dangerous-mcp-permission",
    ruleId: "dangerous-mcp-permission",
    title: "Potentially risky MCP permission without explanation or allowlist",
    severity: "HIGH",
    file,
    line: server.line,
    evidence: `${server.name} appears to expose ${capability} capability without a nearby description or explicit allowlist.`,
    explanation:
      "MCP servers with broad local or remote capabilities should document why they are needed and, when possible, restrict access through an allowlist.",
    recommendation:
      "Add a description/rationale for this MCP server and restrict its scope with explicit allowlists such as roots, allowedPaths, allowedCommands, or allowedDomains.",
    sourceKind,
    confidence,
    serverName: server.name,
  };
}

function hasCapability(
  server: ParsedMcpServer,
  capability: RiskCapability,
): boolean {
  return server.capabilityHints.some((hint) =>
    riskyMatchers[capability].test(hint),
  );
}

function hasMitigation(
  server: ParsedMcpServer,
  capability: RiskCapability,
): boolean {
  if (server.description) {
    return true;
  }

  return server.allowlists.some((entry) =>
    allowlistMatchers[capability].test(entry),
  );
}

function getConfidence(capability: RiskCapability): number {
  if (capability === "filesystem" || capability === "shell") {
    return 0.92;
  }

  if (capability === "browser" || capability === "network") {
    return 0.86;
  }

  return 0.8;
}
