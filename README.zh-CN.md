# context-debt

[English](./README.md) | [简体中文](./README.zh-CN.md)

面向 AI 编码指令上下文的“技术债扫描器”。

`context-debt` 是一个可发布到 npm 的 CLI，专门用静态分析扫描仓库里的 AI 指令上下文，在它们演变成失效指令、错误引导、安全风险或 token 浪费之前把问题找出来。

你的代码会积累技术债，你的 AI 上下文也会积累上下文债。

## 项目概览

`context-debt` 把 AI 指令文件当成可以被 lint 的工程资产。

它适合已经在仓库里维护下列内容的团队：

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/*.mdc`
- `.github/copilot-instructions.md`
- Codex / Windsurf 指令文件
- `README.md`
- `package.json`
- `.mcp.json`、`.cursor/mcp.json`、`.claude/mcp.json`

## 为什么做这个工具

现在很多仓库都把 AI 指令写进代码库本身，但它们会很快“腐化”：

- 文档里写的命令已经不能执行
- 引用的路径已经被重命名或删除
- 不同文件对包管理器给出互相冲突的建议
- 大段重复规则持续浪费上下文窗口
- MCP 权限逐步失控但没人回头校准

`context-debt` 用可测试、可复现、可进 CI 的静态分析方式处理这些问题，而不是依赖运行时模型“猜”出来。

## 设计原则

- 静态分析优先
- MVP 不依赖外部 LLM API
- 不做遥测
- 默认不依赖网络
- 规则必须确定且可测试
- 同时提供适合人读的终端输出和适合机器消费的 JSON 输出

## 安装

```bash
pnpm add -D context-debt
```

或者：

```bash
npm install -D context-debt
```

要求：

- Node.js `>= 20`
- 本仓库开发推荐使用 `pnpm`

## 基本用法

```bash
context-debt scan .
context-debt scan . --strict
context-debt scan . --format json
context-debt doctor .
context-debt fix .
context-debt fix . --write
```

典型工作流：

1. 本地修改 AI 指令时先跑一次 `context-debt scan .`
2. 在 CI 中加上 `context-debt scan . --strict`
3. 当你怀疑扫描范围或配置异常时，用 `context-debt doctor .` 排查
4. 用 `context-debt fix .` 先预览高置信度修复，再决定是否写入
5. 当你既要看发现诊断又要看当前问题依据时，用 `context-debt doctor . --verbose`

## 扫描对象

`context-debt` 当前会扫描项目元数据和指令类文件：

- `AGENTS.md`、`CLAUDE.md`、Cursor rules、Copilot 指令、Codex 文件、Windsurf 文件
- `README.md`
- `package.json` 和 Node 锁文件
- `pyproject.toml`、`poetry.lock`、`uv.lock`
- `.mcp.json`、`.cursor/mcp.json`、`.claude/mcp.json` 等 MCP 配置

它围绕命令引用、本地路径引用、包管理器指引、MCP 能力提示、重复指令块和过大上下文文件等结构化信号做检测。

## 命令说明

### `scan`

```bash
context-debt scan [path]
```

扫描指定仓库，并输出文本或 JSON 结果。

常用选项：

- `--json` 或 `--format json`：输出机器可读 JSON
- `--strict`：将 `HIGH` 和高置信度 `MEDIUM` 视为失败
- `--no-color`：关闭彩色输出
- `--verbose`：显示 explanation 和额外问题元数据
- `--config <path>`：指定自定义配置文件
- `--max-issues <count>`：限制显示的问题数量，但保留完整汇总
- `--root <path>`：将扫描范围限制到仓库相对根目录，可重复传入多个
- `--include <glob>` / `--exclude <glob>`：追加发现范围 glob

### `doctor`

```bash
context-debt doctor [path]
```

输出发现诊断：配置状态、实际 include/exclude、规则覆盖项、发现到的上下文文件、MCP 文件、项目元数据和文件类型统计。

### `fix`

```bash
context-debt fix [path]
context-debt fix [path] --write
```

预览或应用保守的高置信度修复：

- 删除引用缺失本地文件的行
- 删除完全重复的指令单元
- 从规范指令块生成 `context-debt.compact.md`

### `init`

```bash
context-debt init
```

在当前目录生成默认 `context-debt.config.json`。

## 输出示例

```text
Context Debt Report

HIGH (1)
  missing-test-script - Referenced test command has no matching script
    File: CLAUDE.md:3
    Confidence: high (0.98)
    Evidence: pnpm test was referenced, but package.json has no "test" script.
    Recommendation: Add scripts.test to package.json or update the instruction to the correct test command.

MEDIUM (1)
  referenced-file-missing - Referenced local file does not exist
    File: AGENTS.md:7
    Confidence: medium (0.78)
    Evidence: docs/release-playbook.md was referenced, but /repo/docs/release-playbook.md does not exist.
    Recommendation: Create the referenced file or update the instruction to point at an existing path.

Summary: 1 HIGH, 1 MEDIUM, 0 LOW, 0 INFO
```

严重级别解释：

- `HIGH`：大概率已经失效或存在明显风险
- `MEDIUM`：冲突、过期或过大的上下文
- `LOW`：信息质量或 token 效率问题
- `INFO`：信息性提示

## JSON 输出示例

```json
{
  "schemaVersion": "1.1",
  "tool": "context-debt",
  "version": "0.1.0",
  "displayedIssues": 1,
  "scannedPath": ".",
  "summary": {
    "HIGH": 1,
    "MEDIUM": 0,
    "LOW": 0,
    "INFO": 0
  },
  "strictFailureCount": 0,
  "totalIssues": 1,
  "issues": [
    {
      "id": "missing-test-script",
      "ruleId": "missing-test-script",
      "title": "Referenced test command has no matching script",
      "severity": "HIGH",
      "file": "CLAUDE.md",
      "line": 3,
      "evidence": "pnpm test was referenced, but package.json has no \"test\" script.",
      "explanation": "AI instructions point to a Node test command that cannot be resolved in package.json.",
      "recommendation": "Add scripts.test to package.json or update the instruction to the correct test command.",
      "sourceKind": "claude",
      "confidence": 0.98,
      "confidenceLabel": "high",
      "autofixAvailable": true
    }
  ]
}
```

常用 JSON 字段包括 `summary`、`displayedIssues`、`totalIssues`、`strictFailureCount`、`confidence`、`confidenceLabel`、`autofixAvailable`、`sourceKind`、`resolvedPath` 和 `relatedFiles`。

## 配置

创建 `context-debt.config.json`：

```json
{
  "ruleSettings": {
    "missing-lint-script": {
      "level": "off"
    },
    "repeated-negative-rules": {
      "level": "warn"
    }
  },
  "rules": {
    "referencedFileMissing": {
      "ignorePaths": ["docs/generated/known-gap.md"],
      "ignoreGlobs": ["docs/archive/**/*.md"],
      "ignorePatterns": ["^storage/logs/.+\\.log$"]
    }
  },
  "scan": {
    "include": [".cursor/**/*.mdc"],
    "exclude": ["node_modules", "dist", "coverage", "tmp"],
    "roots": ["packages/app"]
  },
  "thresholds": {
    "duplicateInstructionSimilarity": 0.72,
    "oversizedContextChars": 12000,
    "tokenWasteMinWords": 40
  }
}
```

完整配置和 MCP 说明见 [docs/rules.zh-CN.md](docs/rules.zh-CN.md)。

## 规则列表

当前规则：

- `missing-ai-context`
- `missing-test-script`
- `missing-python-test-command`
- `missing-python-lint-command`
- `missing-build-script`
- `missing-lint-script`
- `conflicting-package-manager`
- `dangerous-mcp-permission`
- `referenced-file-missing`
- `contradictory-build-command`
- `contradictory-lint-command`
- `contradictory-test-command`
- `stale-reference`
- `oversized-context-file`
- `duplicate-instructions`
- `too-many-global-rules`
- `token-waste`
- `repeated-negative-rules`

规则严重级别、触发条件、配置键和 MCP 示例见 [docs/rules.zh-CN.md](docs/rules.zh-CN.md)。

## CI 示例

最小 GitHub Actions 步骤：

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm exec context-debt scan . --strict
```

含义：

- `HIGH` 会让 CI 失败
- `--strict` 下，高置信度 `MEDIUM` 也会失败
- `LOW` 和 `INFO` 默认不阻塞

本仓库也包含完整 workflow：[.github/workflows/ci.yml](.github/workflows/ci.yml)，覆盖 lint、Node 20/22 测试、build 和 package smoke test。

## Package Smoke Test

发布校验应测试真实打包产物，而不只是本地源码树。

```bash
pnpm build
pnpm smoke:package
```

smoke 脚本会打包 CLI、检查包内容、在 clean fixture 上运行打包后的二进制，并从另一个工作目录验证 CLI 路径行为。

## Exit Codes

- `0`：没有问题，或只有 `LOW` / `INFO`
- `1`：存在 `HIGH`，或 `--strict` 下存在高置信度 `MEDIUM`
- `2`：运行时或配置错误

## 使用场景

适合在这些情况下使用 `context-debt`：

- 保持 `AGENTS.md` 和 `CLAUDE.md` 一致
- 在 agent 浪费时间前发现失效路径
- 统一文档里的包管理器指引
- 控制仓库内 MCP 配置风险
- 减少跨工具重复指令块
- 把 AI 上下文检查纳入 CI

## Roadmap

- 增加更多 autofix 能力
- 补充更完整的规则级文档与示例
- 增加真实仓库回归 fixture，持续校准误报

真实仓库回归覆盖会在 CI 中验证。每条已发布规则都必须有第三方回归 triage 覆盖，或者在 `regressions/manifest.json` 中明确记录覆盖缺口原因。

## Release Notes

- [CHANGELOG.md](CHANGELOG.md)
- [docs/releasing.md](docs/releasing.md)
