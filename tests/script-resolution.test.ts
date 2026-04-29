import { describe, expect, test } from "vitest";

import { scanRepository } from "../src/index.js";
import { fixturePath } from "./helpers.js";

describe("nested package script resolution", () => {
  test("matches scripts from hinted subproject package.json files", async () => {
    const result = await scanRepository(fixturePath("nested-package-scripts"));
    const missingScriptIssues = result.issues.filter((issue) =>
      issue.ruleId.startsWith("missing-"),
    );

    expect(missingScriptIssues).toEqual([]);
  });
});
