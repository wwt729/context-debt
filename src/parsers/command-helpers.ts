import type { ExtractedCommand, PackageManagerName } from "../core/types.js";

export const commandPatterns = [
  /\bnpm\s+run\s+(?<script>(?:test|build|lint)(?::[a-z0-9:_-]+)?)\b/giu,
  /\bnpm\s+(?<script>test|build|lint)\b/giu,
  /\b(?<manager>pnpm|yarn)\s+(?:run\s+)?(?<script>(?:test|build|lint)(?::[a-z0-9:_-]+)?)\b/giu,
];

export function getCommandCategory(
  scriptName: string,
): ExtractedCommand["category"] {
  if (scriptName.startsWith("test")) {
    return "test";
  }

  if (scriptName.startsWith("build")) {
    return "build";
  }

  return "lint";
}

export function getCommandManager(command: string): PackageManagerName | null {
  if (command.startsWith("npm ")) {
    return "npm";
  }

  if (command.startsWith("pnpm ")) {
    return "pnpm";
  }

  if (command.startsWith("yarn ")) {
    return "yarn";
  }

  return null;
}
