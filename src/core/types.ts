export type Severity = "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type ConfidenceLabel = "high" | "medium" | "low";
export type RuleLevel = "off" | "warn" | "error";

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
  confidenceLabel?: ConfidenceLabel;
  resolvedPath?: string;
  relatedFiles?: string[];
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

export type PackageManagerName =
  | "npm"
  | "pnpm"
  | "yarn"
  | "uv"
  | "poetry"
  | "pip";

export type ParsedPackageJson = {
  path: string;
  scripts: Record<string, string>;
  packageManager?: string;
};

export type ExtractedCommand = {
  category: "test" | "build" | "lint";
  command: string;
  commandKind: "node-script" | "python-test" | "python-lint";
  scriptName: string;
  manager?: PackageManagerName;
  file: string;
  line: number;
  selfContained?: boolean;
  sourceKind: ContextFileKind;
};

export type ExtractedPathReference = {
  value: string;
  file: string;
  line: number;
  referenceType: "markdown-link" | "inline-code" | "instruction-text";
  candidateKind: PathCandidateKind;
  sourceKind: ContextFileKind;
};

export type PathCandidateKind =
  | "local-file"
  | "example-path"
  | "glob-pattern"
  | "package-reference"
  | "command-argument"
  | "generated-file"
  | "url"
  | "unknown";

export type PackageManagerEvidence = {
  manager: PackageManagerName;
  file: string;
  line?: number;
  evidence: string;
  source: "instruction" | "lockfile" | "package-json";
  sourceKind: ContextFileKind;
};

export type ToolingFamily = "node" | "python";

export type PackageManagerFamilySummary = {
  family: ToolingFamily;
  managers: PackageManagerName[];
  evidenceByManager: Map<PackageManagerName, PackageManagerEvidence[]>;
};

export type ProjectToolingAnalysis = {
  packageJsonByDirectory: Map<string, ParsedPackageJson>;
  packageManagersByName: Map<PackageManagerName, PackageManagerEvidence[]>;
  packageManagerFamilies: PackageManagerFamilySummary[];
  pythonTestTooling: {
    evidenceFiles: string[];
    hasPytest: boolean;
  };
  pythonLintTooling: {
    evidenceFiles: string[];
    hasRuff: boolean;
  };
};

export type ScanConfig = {
  include: string[];
  exclude: string[];
  roots: string[];
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
  level?: RuleLevel;
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
  packageJsons: ParsedPackageJson[];
  commands: ExtractedCommand[];
  pathReferences: ExtractedPathReference[];
  packageManagers: PackageManagerEvidence[];
  discoveredPaths: Set<string>;
  config: ContextDebtConfig;
  tooling: ProjectToolingAnalysis;
};

export type ScanSummary = Record<Severity, number>;

export type ScanResult = {
  displayedIssues: number;
  issues: Issue[];
  summary: ScanSummary;
  scannedPath: string;
  strictFailureCount: number;
  totalIssues: number;
};

export type AutofixSession = {
  readFile: (path: string, fallback?: string) => string;
  replaceFile: (
    path: string,
    fallback: string | undefined,
    after: string,
    reason: string,
  ) => void;
  updateFile: (
    path: string,
    fallback: string | undefined,
    updater: (content: string) => string,
    reason: string,
  ) => void;
};

export type RuleModule = {
  autofix?: (
    context: ScanContext,
    issues: Issue[],
    session: AutofixSession,
  ) => void;
  check: (context: ScanContext) => Issue[];
  id: string;
};

export type ReportOptions = {
  color: boolean;
  verbose?: boolean;
};

export type ScanOptions = {
  configPath?: string;
  exclude?: string[];
  include?: string[];
  maxIssues?: number;
  roots?: string[];
};

export type DoctorRuleOverride = {
  enabled?: boolean;
  label?: string;
  level?: RuleLevel;
  ruleId: string;
  severity?: Severity;
};

export type DoctorResult = {
  configPath: string;
  configStatus: "invalid" | "missing" | "valid";
  discoveredCount: number;
  discoveredFiles: string[];
  kindCounts: Record<ContextFileKind, number>;
  mcpFiles: string[];
  packageJsonPresent: boolean;
  path: string;
  pnpmVersion: string | null;
  primaryContextFiles: string[];
  scanExclude: string[];
  scanInclude: string[];
  scanRoots: string[];
  ruleOverrides: DoctorRuleOverride[];
};

export type DoctorReportOptions = {
  findingPreview?: Pick<
    ScanResult,
    "displayedIssues" | "issues" | "summary"
  > | null;
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
