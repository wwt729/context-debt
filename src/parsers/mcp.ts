export type ParsedMcpServer = {
  allowlists: string[];
  capabilityHints: string[];
  description?: string;
  file: string;
  line?: number;
  name: string;
};

type GenericRecord = Record<string, unknown>;

const descriptionKeys = [
  "description",
  "reason",
  "rationale",
  "notes",
  "comment",
];
const allowlistKeys = [
  "roots",
  "root",
  "allowedPaths",
  "allowlist",
  "allowedCommands",
  "allowedDomains",
  "include",
];

export function parseMcpConfig(
  file: string,
  content: string,
): ParsedMcpServer[] {
  const parsed = JSON.parse(content) as unknown;
  const root = isRecord(parsed) ? parsed : {};
  const serverContainer = getServerContainer(root);

  if (!serverContainer) {
    return [];
  }

  return Object.entries(serverContainer)
    .filter(([, value]) => isRecord(value))
    .map(([name, value]) => buildServer(file, content, name, value));
}

function buildServer(
  file: string,
  content: string,
  name: string,
  value: GenericRecord,
): ParsedMcpServer {
  return {
    allowlists: extractAllowlists(value),
    capabilityHints: extractCapabilityHints(name, value),
    description: extractDescription(value),
    file,
    line: findServerLine(content, name),
    name,
  };
}

function getServerContainer(root: GenericRecord): GenericRecord | null {
  const candidate = root.mcpServers ?? root.servers;
  return isRecord(candidate) ? candidate : null;
}

function extractAllowlists(server: GenericRecord): string[] {
  const values: string[] = [];

  for (const key of allowlistKeys) {
    pushUnknownAsStrings(values, server[key]);
  }

  return values;
}

function extractCapabilityHints(name: string, server: GenericRecord): string[] {
  const values = [name];

  pushUnknownAsStrings(values, server.command);
  pushUnknownAsStrings(values, server.args);

  if (isRecord(server.env)) {
    values.push(...Object.keys(server.env));
  }

  return values.map((value) => value.toLowerCase());
}

function extractDescription(server: GenericRecord): string | undefined {
  for (const key of descriptionKeys) {
    const value = server[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function findServerLine(content: string, name: string): number | undefined {
  const index = content.indexOf(`"${name}"`);
  if (index === -1) {
    return undefined;
  }

  return content.slice(0, index).split("\n").length;
}

function pushUnknownAsStrings(output: string[], value: unknown): void {
  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") {
        output.push(entry);
      }
    }
  }
}

function isRecord(value: unknown): value is GenericRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
