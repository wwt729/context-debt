export type Severity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type Issue = {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  file: string;
  line?: number;
  evidence: string;
  explanation: string;
  recommendation: string;
  sourceKind: ContextFileKind;
  confidence: number;
  resolvedPath?: string;
  serverName?: string;
  autofixAvailable?: boolean;
};

export type ContextFileKind =
  | "agents"
  | "claude"
  | "cursor-rule"
  | "copilot"
  | "codex"
  | "windsurf"
  | "readme"
  | "package-json"
  | "mcp"
  | "project-meta";

export type ContextFile = {
  path: string;
  kind: ContextFileKind;
  content: string;
};

export type PackageManagerName = "npm" | "pnpm" | "yarn";

export type ParsedPackageJson = {
  path: string;
  scripts: Record<string, string>;
  packageManager?: string;
};

export type ExtractedCommand = {
  category: "test" | "build" | "lint";
  command: string;
  manager: PackageManagerName;
  scriptName: string;
  file: string;
  line: number;
  sourceKind: ContextFileKind;
};

export type ExtractedPathReference = {
  value: string;
  file: string;
  line: number;
  referenceType: "markdown-link" | "inline-code" | "instruction-text";
  sourceKind: ContextFileKind;
};

export type PackageManagerEvidence = {
  manager: PackageManagerName;
  file: string;
  line?: number;
  evidence: string;
  source: "instruction" | "lockfile" | "package-json";
  sourceKind: ContextFileKind;
};

export type ScanConfig = {
  include: string[];
  exclude: string[];
};

export type ThresholdConfig = {
  duplicateInstructionSimilarity: number;
  oversizedContextChars: number;
  tokenWasteMinWords: number;
};

export type ReferencedFileMissingRuleConfig = {
  ignoreGlobs: string[];
  ignorePaths: string[];
  ignorePatterns: string[];
};

export type RuleSetting = {
  enabled?: boolean;
  severity?: Severity;
};

export type RulesConfig = {
  referencedFileMissing: ReferencedFileMissingRuleConfig;
};

export type ContextDebtConfig = {
  ruleSettings: Record<string, RuleSetting>;
  rules: RulesConfig;
  scan: ScanConfig;
  thresholds: ThresholdConfig;
};

export type ScanContext = {
  rootDir: string;
  contextFiles: ContextFile[];
  packageJson?: ParsedPackageJson;
  commands: ExtractedCommand[];
  pathReferences: ExtractedPathReference[];
  packageManagers: PackageManagerEvidence[];
  discoveredPaths: Set<string>;
  config: ContextDebtConfig;
};

export type ScanSummary = Record<Severity, number>;

export type ScanResult = {
  displayedIssues: number;
  issues: Issue[];
  summary: ScanSummary;
  scannedPath: string;
  totalIssues: number;
};

export type RuleModule = {
  check: (context: ScanContext) => Issue[];
  id: string;
};

export type ReportOptions = {
  color: boolean;
};

export type ScanOptions = {
  configPath?: string;
  exclude?: string[];
  include?: string[];
  maxIssues?: number;
};

export type DoctorResult = {
  configStatus: "invalid" | "missing" | "valid";
  discoveredCount: number;
  kindCounts: Record<ContextFileKind, number>;
  mcpFiles: string[];
  packageJsonPresent: boolean;
  path: string;
  pnpmVersion: string | null;
  primaryContextFiles: string[];
};

export type FixEdit = {
  action: "create" | "update";
  after: string;
  before?: string;
  path: string;
  reason: string;
};

export type FixResult = {
  edits: FixEdit[];
  generatedCompactPath: string;
  issueSummary: ScanSummary;
  scannedPath: string;
};
