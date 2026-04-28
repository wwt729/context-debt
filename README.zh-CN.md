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

## 扫描对象

`context-debt` 当前会扫描项目元数据和指令类文件，包括：

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/` 下的 Cursor rules
- Copilot 指令文件
- Codex 相关指令文件
- Windsurf 相关指令文件
- `README.md`
- `package.json`
- MCP 配置文件

它不是做“全文语义理解”，而是围绕这些结构化信号做检测：

- command references
- local file/path references
- package manager guidance
- MCP capability hints and allowlists
- duplicated or oversized instruction blocks
- rule density and repeated negative rules

## 命令说明

### `scan`

```bash
context-debt scan [path]
```

扫描指定仓库，并输出文本或 JSON 结果。

选项：

- `--json`：便捷 JSON 输出开关
- `--format <text|json>`：显式指定输出格式
- `--strict`：将 `HIGH` 和高置信度 `MEDIUM` 视为失败
- `--no-color`：关闭彩色输出
- `--config <path>`：指定自定义配置文件
- `--max-issues <count>`：限制显示的问题数量，但保留完整汇总
- `--include <glob>`：追加 include glob
- `--exclude <glob>`：追加 exclude glob

示例：

```bash
context-debt scan .
context-debt scan . --strict
context-debt scan . --format json --max-issues 20
context-debt scan . --config ./context-debt.config.json
```

### `doctor`

```bash
context-debt doctor [path]
```

输出仓库扫描发现与配置诊断信息：

- config path
- config status
- 实际生效的 include / exclude globs
- 已配置的规则覆盖项
- package.json presence
- discovered primary context files
- detected MCP files
- discovered paths
- discovered file counts by kind

适合排查：

- 为什么某个文件没有被扫描到
- 为什么自定义配置没生效
- MCP 文件是否被正确发现

### `fix`

```bash
context-debt fix [path]
context-debt fix [path] --write
```

`fix` 的原则是保守，只做高置信度修复。

当前支持：

- 删除引用缺失文件的行
- 删除完全重复的指令块
- 生成聚合版 `context-debt.compact.md`

### `init`

```bash
context-debt init
```

在当前目录生成默认 `context-debt.config.json`。

## 输出示例

```text
Context Debt Report

HIGH (2)
  missing-test-script - Referenced test command has no matching script
    File: CLAUDE.md:3
    Evidence: pnpm test was referenced, but package.json has no "test" script.
    Recommendation: Add scripts.test to package.json or update the instruction to the correct test command.
  referenced-file-missing - Referenced local file does not exist
    File: AGENTS.md:7
    Evidence: docs/release-playbook.md was referenced, but /repo/docs/release-playbook.md does not exist.
    Recommendation: Create the referenced file or update the instruction to point at an existing path.

MEDIUM (1)
  stale-reference - Referenced file path appears stale after a rename
    File: README.md:12
    Evidence: docs/legacy-ci.md was referenced, but docs/ci.md exists instead.
    Recommendation: Update the instruction to the current path so agents follow the right file.

LOW (1)
  token-waste - Repeated long instruction blocks waste context budget
    File: AGENTS.md
    Evidence: 91 duplicated words were repeated across AGENTS.md and CLAUDE.md.
    Recommendation: Keep one canonical instruction block and reference it from the other files.

Summary: 2 HIGH, 1 MEDIUM, 1 LOW, 0 INFO
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
  "displayedIssues": 2,
  "scannedPath": ".",
  "summary": {
    "HIGH": 2,
    "MEDIUM": 1,
    "LOW": 1,
    "INFO": 0
  },
  "strictFailureCount": 1,
  "totalIssues": 4,
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
      "confidenceLabel": "high"
    },
    {
      "id": "referenced-file-missing",
      "ruleId": "referenced-file-missing",
      "title": "Referenced local file does not exist",
      "severity": "MEDIUM",
      "file": "AGENTS.md",
      "line": 7,
      "evidence": "docs/release-playbook.md was referenced, but /repo/docs/release-playbook.md does not exist.",
      "explanation": "AI instructions refer to a local file or path that is not present in the repository.",
      "recommendation": "Create the referenced file or update the instruction to point at an existing path.",
      "sourceKind": "agents",
      "confidence": 0.78,
      "confidenceLabel": "medium",
      "resolvedPath": "docs/release-playbook.md"
    }
  ]
}
```

关键字段：

- `summary`：各级别问题汇总
- `displayedIssues` 与 `totalIssues`：可能受 `--max-issues` 影响
- `schemaVersion`：稳定的 JSON 报告 schema 版本
- `strictFailureCount`：开启 `--strict` 时会失败的问题数量
- `confidence`：规则命中置信度
- `confidenceLabel`：供 `--strict` 使用的稳定置信度分层
- `sourceKind`：问题来源文件类型
- `resolvedPath`：归一化后的解析路径
- `relatedFiles`：多文件问题涉及的其它文件

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
    },
    "too-many-global-rules": {
      "severity": "INFO"
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
    "exclude": ["node_modules", "dist", "coverage", "tmp"]
  },
  "thresholds": {
    "duplicateInstructionSimilarity": 0.72,
    "oversizedContextChars": 12000,
    "tokenWasteMinWords": 40
  }
}
```

配置说明：

| Key | 中文说明 |
| --- | --- |
| `ruleSettings.<rule-id>.enabled` | 完全关闭某条规则 |
| `ruleSettings.<rule-id>.level` | 稳定别名：`off`、`warn`、`error` |
| `ruleSettings.<rule-id>.severity` | 覆盖规则默认严重级别 |
| `rules.referencedFileMissing.ignorePaths` | 忽略精确路径 |
| `rules.referencedFileMissing.ignoreGlobs` | 忽略 glob 模式 |
| `rules.referencedFileMissing.ignorePatterns` | 忽略正则模式 |
| `scan.include` | 追加扫描包含模式 |
| `scan.exclude` | 追加扫描排除模式 |
| `thresholds.duplicateInstructionSimilarity` | 重复指令相似度阈值 |
| `thresholds.oversizedContextChars` | 上下文文件过大阈值 |
| `thresholds.tokenWasteMinWords` | token 浪费最小重复词数 |

`level` 语义：

- `off`：关闭该规则
- `warn`：将该规则的结果统一降为 `LOW`
- `error`：将该规则的结果统一提升为 `HIGH`
- `severity`：显式严重级别覆盖，优先级高于 `level`

## 规则列表

| Rule | Severity | 中文说明 |
| --- | --- | --- |
| `missing-test-script` | `HIGH` | AI 文档引用了 `package.json` 中不存在的测试脚本 |
| `missing-build-script` | `HIGH` | AI 文档引用了不存在的构建脚本 |
| `missing-lint-script` | `HIGH` | AI 文档引用了不存在的 lint 脚本 |
| `conflicting-package-manager` | `HIGH` | 指令、锁文件与元数据对包管理器给出冲突信息 |
| `dangerous-mcp-permission` | `HIGH` | MCP 服务权限过宽且缺少足够范围限制 |
| `referenced-file-missing` | `HIGH` / `MEDIUM` | AI 文档引用了不存在的本地文件，严重级别取决于置信度 |
| `contradictory-test-command` | `MEDIUM` | 不同文件推荐了互相冲突的测试命令 |
| `stale-reference` | `MEDIUM` | 引用路径看起来已经过期或被重命名 |
| `oversized-context-file` | `MEDIUM` | 单个上下文文件过大，不适合高效提示 |
| `duplicate-instructions` | `MEDIUM` | 多个文件存在高重叠指令块 |
| `too-many-global-rules` | `MEDIUM` | 全局规则文件承担了过多策略 |
| `token-waste` | `LOW` | 长段重复文本浪费上下文预算 |
| `repeated-negative-rules` | `LOW` | 重复的否定规则拉低信息密度 |
| `missing-ai-context` | `LOW` | 仓库缺少主 AI 上下文文件 |

## MCP 扫描示例

`context-debt` 默认扫描这些 MCP 配置位置：

- `.mcp.json`
- `mcp.json`
- `.vscode/mcp.json`
- `.cursor/mcp.json`
- `.claude/mcp.json`

风险示例：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "roots": ["/"]
    }
  }
}
```

运行：

```bash
context-debt scan . --format json
```

典型结果：

- 当服务暗示了较宽的文件系统、命令或网络访问范围，但没有明确 allowlist 或说明时，会触发 `dangerous-mcp-permission`

更安全的 MCP 配置通常同时具备：

- 可读的用途说明
- 较窄的路径、命令或域名白名单

## CI 集成示例

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

- `HIGH` 直接让 CI 失败
- `--strict` 下高置信度 `MEDIUM` 也会失败
- 默认允许 `LOW` 和 `INFO` 通过

当前仓库还提供了完整工作流 [.github/workflows/ci.yml](.github/workflows/ci.yml)，包含：

- `lint`
- Node 20 / 22 上的 `test`
- `build`
- macOS / Linux package smoke tests

## 打包冒烟测试

发布校验应该测试真实打包产物，而不是只测试本地源码目录。

```bash
pnpm build
pnpm smoke:package
```

这个 smoke 脚本会：

- 执行 `pnpm pack`
- 解压 tarball 并检查打包文件
- 用打包后的 CLI 跑干净 fixture
- 从不同工作目录验证 CLI 路径行为

## 退出码

- `0`：只有 `LOW` / `INFO`，或者无问题
- `1`：存在 `HIGH`，或 `--strict` 下存在高置信度 `MEDIUM`
- `2`：运行时错误或配置错误

## 适用场景

当你希望做到这些时，可以用 `context-debt`：

- 保持 `AGENTS.md` 和 `CLAUDE.md` 一致
- 在 agent 浪费时间之前抓出失效路径
- 统一文档中的包管理器指引
- 管控仓库内 MCP 配置风险
- 减少多工具间重复指令块
- 把 AI 上下文检查稳定接入 CI

## 路线图

- 提供更多 autofixer，而不止是精确重复和缺失引用清理
- 补充更丰富的规则文档与示例
- 增加更多真实仓库回归 fixture，持续校准误报

## 发布说明

- [CHANGELOG.md](CHANGELOG.md)
- [docs/releasing.md](docs/releasing.md)
