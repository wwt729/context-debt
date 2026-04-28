import type { ParsedPackageJson } from "../core/types.js";

type RawPackageJson = {
  packageManager?: string;
  scripts?: Record<string, string>;
};

export function parsePackageJson(
  path: string,
  content: string,
): ParsedPackageJson {
  const parsed = JSON.parse(content) as RawPackageJson;

  return {
    path,
    scripts: parsed.scripts ?? {},
    packageManager: parsed.packageManager,
  };
}
