import { createContradictoryCommandRule } from "./contradictory-command.js";

export const contradictoryBuildCommandRule = createContradictoryCommandRule({
  category: "build",
  ruleId: "contradictory-build-command",
  title: "Different files recommend incompatible build commands",
  explanation:
    "Multiple AI instruction files point to different build scripts, which can send agents down inconsistent build paths.",
  recommendation:
    "Align repository guidance on a single primary build command or clearly separate when each build command should be used.",
});
