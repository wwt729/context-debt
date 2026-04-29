export const knownRootSegments = new Set([
  ".github",
  ".cursor",
  ".codex",
  ".windsurf",
  "app",
  "src",
  "lib",
  "docs",
  "routes",
  "database",
  "storage",
  "config",
  "tests",
  "packages",
  "public",
  "resources",
  "scripts",
  "bin",
  "cmd",
  "examples",
]);

export function hasKnownFileExtension(value: string): boolean {
  return /\.(md|mdc|json|toml|yml|yaml|txt|js|ts|tsx|jsx|php|py|rs|go|java|sh|log)$/u.test(
    value,
  );
}
