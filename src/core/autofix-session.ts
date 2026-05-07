import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AutofixSession, FixEdit } from "./types.js";

type MutableEdit = {
  after: string;
  before: string;
  path: string;
  reasons: Set<string>;
};

export function createAutofixSession(rootDir: string): {
  edits: () => FixEdit[];
  session: AutofixSession;
} {
  const state = new Map<string, MutableEdit>();

  return {
    edits: () =>
      [...state.values()]
        .filter((edit) => edit.before !== edit.after)
        .map((edit) => ({
          action: edit.before.length === 0 ? "create" : "update",
          after: edit.after,
          before: edit.before,
          path: edit.path,
          reason: [...edit.reasons].join("; "),
        })),
    session: {
      readFile(path, fallback = "") {
        return (
          state.get(path)?.after ?? getOriginalContent(rootDir, path, fallback)
        );
      },
      replaceFile(path, fallback, after, reason) {
        upsertEdit(
          state,
          path,
          getOriginalContent(rootDir, path, fallback),
          after,
          reason,
        );
      },
      updateFile(path, fallback, updater, reason) {
        const current =
          state.get(path)?.after ?? getOriginalContent(rootDir, path, fallback);
        upsertEdit(
          state,
          path,
          state.get(path)?.before ??
            getOriginalContent(rootDir, path, fallback),
          updater(current),
          reason,
        );
      },
    },
  };
}

function upsertEdit(
  edits: Map<string, MutableEdit>,
  path: string,
  before: string,
  after: string,
  reason: string,
): void {
  const existing = edits.get(path);

  if (existing) {
    existing.after = after;
    existing.reasons.add(reason);
    return;
  }

  edits.set(path, {
    after,
    before,
    path,
    reasons: new Set([reason]),
  });
}

function getOriginalContent(
  rootDir: string,
  path: string,
  fallback = "",
): string {
  try {
    return readFileSync(resolve(rootDir, path), "utf8");
  } catch {
    return fallback;
  }
}
