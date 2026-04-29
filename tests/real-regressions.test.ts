import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  findForbiddenRegressionIssues,
  findUntriagedRegressionIssues,
  loadRegressionManifest,
  normalizeRegressionResult,
  scanRepository,
} from "../src/index.js";
import { projectRoot } from "./helpers.js";

const manifest = loadRegressionManifest(projectRoot);

describe("real repository regressions", () => {
  for (const repo of manifest.repos) {
    test(`${repo.id} matches golden snapshot`, async () => {
      const result = await scanRepository(
        resolve(projectRoot, repo.fixturePath),
      );
      const snapshot = JSON.parse(
        readFileSync(resolve(projectRoot, repo.snapshotPath), "utf8"),
      ) as unknown;

      expect(normalizeRegressionResult(repo.id, result)).toEqual(snapshot);
    });

    test(`${repo.id} has no untriaged issues`, async () => {
      const result = await scanRepository(
        resolve(projectRoot, repo.fixturePath),
      );
      const normalized = normalizeRegressionResult(repo.id, result);

      expect(findUntriagedRegressionIssues(repo, normalized.issues)).toEqual(
        [],
      );
    });

    test(`${repo.id} blocks must-not-appear regressions`, async () => {
      const result = await scanRepository(
        resolve(projectRoot, repo.fixturePath),
      );
      const normalized = normalizeRegressionResult(repo.id, result);

      expect(findForbiddenRegressionIssues(repo, normalized.issues)).toEqual(
        [],
      );
    });
  }
});
