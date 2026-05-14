import { createMissingPythonCommandRule } from "./python-command-rule.js";

export const missingPythonLintCommandRule = createMissingPythonCommandRule({
  id: "missing-python-lint-command",
  title: "Referenced Python lint command has no matching tooling signal",
  tool: "ruff",
  explanation:
    "AI instructions point to a Python ruff command, but repository metadata does not show a local ruff dependency or configuration.",
  recommendation:
    "Add ruff configuration or dependencies to pyproject.toml or lockfiles, or update the instruction to the correct Python lint command.",
});
