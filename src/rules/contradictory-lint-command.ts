import { createContradictoryCommandRule } from "./contradictory-command.js";

export const contradictoryLintCommandRule = createContradictoryCommandRule({
  category: "lint",
  ruleId: "contradictory-lint-command",
  title: "Different files recommend incompatible lint commands",
  explanation:
    "Multiple AI instruction files point to different lint scripts, which can send agents down inconsistent quality-check paths.",
  recommendation:
    "Align repository guidance on a single primary lint command or clearly separate when each lint command should be used.",
});
