import { dirname, extname, relative, resolve } from "node:path";

export function resolveReference(
  rootDir: string,
  sourceFile: string,
  value: string,
): string {
  if (value.startsWith("/")) {
    return resolve(rootDir, `.${value}`);
  }

  return resolve(rootDir, dirname(sourceFile), value);
}

export function normalizeResolvedPath(
  rootDir: string,
  resolvedPath: string,
): string {
  return relative(rootDir, resolvedPath).replaceAll("\\", "/");
}

export function isGeneratedRuntimePath(value: string): boolean {
  return extname(value) === ".log";
}

export function isDeprecatedPath(value: string): boolean {
  return /(?:^|\/)(legacy|old|deprecated|tmp|backup)(?:\/|$)/iu.test(value);
}
