import { createMissingPythonCommandRule } from "./python-command-rule.js";

export const missingPythonTestCommandRule = createMissingPythonCommandRule({
  id: "missing-python-test-command",
  title: "Referenced Python test command has no matching tooling signal",
  tool: "pytest",
  explanation:
    "AI instructions point to a Python pytest command, but repository metadata does not show a local pytest dependency or configuration.",
  recommendation:
    "Add pytest configuration or dependencies to pyproject.toml or lockfiles, or update the instruction to the correct Python test command.",
});
