import { createContradictoryCommandRule } from "./contradictory-command.js";

export const contradictoryTestCommandRule = createContradictoryCommandRule({
  category: "test",
  ruleId: "contradictory-test-command",
  title: "Different files recommend incompatible test commands",
  explanation:
    "Multiple AI instruction files point to different test scripts, which can send agents down inconsistent execution paths.",
  recommendation:
    "Align repository guidance on a single primary test command or clearly separate when each test command should be used.",
});
