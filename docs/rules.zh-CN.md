# 规则与配置

本文是 `context-debt` 的规则、配置和 MCP 风险扫描参考手册。

## 配置参考

在仓库根目录创建 `context-debt.config.json`：

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

| Key | 含义 |
| --- | --- |
| `ruleSettings.<rule-id>.enabled` | 完全禁用某条规则 |
| `ruleSettings.<rule-id>.level` | 稳定别名：`off`、`warn` 或 `error` |
| `ruleSettings.<rule-id>.severity` | 覆盖规则严重级别 |
| `rules.referencedFileMissing.ignorePaths` | 需要忽略的精确原始路径或仓库相对路径 |
| `rules.referencedFileMissing.ignoreGlobs` | 需要忽略的仓库相对 glob |
| `rules.referencedFileMissing.ignorePatterns` | 需要忽略的正则模式 |
| `scan.include` | 额外 include globs |
| `scan.exclude` | 额外 exclude globs |
| `scan.roots` | 将发现范围限制到仓库相对目录；会被 CLI `--root` 覆盖 |
| `thresholds.duplicateInstructionSimilarity` | `duplicate-instructions` 相似度阈值 |
| `thresholds.oversizedContextChars` | `oversized-context-file` 字符数阈值 |
| `thresholds.tokenWasteMinWords` | `token-waste` 触发前的最少重复词数 |

规则 level 语义：

- `off`：禁用规则
- `warn`：将该规则命中强制降为 `LOW`
- `error`：将该规则命中强制升为 `HIGH`
- `severity`：显式严重级别覆盖，优先级高于 `level`

## 规则

| Rule | Severity | 检查内容 |
| --- | --- | --- |
| `missing-ai-context` | `LOW` | 仓库没有主 AI 上下文文件 |
| `missing-test-script` | `HIGH` | AI 文档引用了 `package.json` 中不存在的 Node test 命令 |
| `missing-python-test-command` | `HIGH` | AI 文档引用了 Python `pytest` 命令，但仓库没有匹配的本地 pytest tooling 信号 |
| `missing-python-lint-command` | `HIGH` | AI 文档引用了 Python `ruff` 命令，但仓库没有匹配的本地 ruff tooling 信号 |
| `missing-build-script` | `HIGH` | AI 文档引用了 `package.json` 中不存在的 build 命令 |
| `missing-lint-script` | `HIGH` | AI 文档引用了 `package.json` 中不存在的 lint 命令 |
| `conflicting-package-manager` | `HIGH` | 指令、锁文件和元数据在 npm/pnpm/yarn/uv/poetry/pip 选择上互相冲突 |
| `dangerous-mcp-permission` | `HIGH` | MCP server 暗示了宽泛能力但缺少足够范围约束 |
| `referenced-file-missing` | `HIGH` / `MEDIUM` | AI 文档指向缺失的本地文件，严重级别取决于置信度 |
| `contradictory-build-command` | `MEDIUM` | 不同文件推荐互相冲突的 build 命令 |
| `contradictory-lint-command` | `MEDIUM` | 不同文件推荐互相冲突的 lint 命令 |
| `contradictory-test-command` | `MEDIUM` | 不同文件推荐互相冲突的 test 命令 |
| `stale-reference` | `MEDIUM` | 某个旧路径缺失，但仓库中存在可能的新路径 |
| `oversized-context-file` | `MEDIUM` | 上下文文件过大，不利于高效提示使用 |
| `duplicate-instructions` | `MEDIUM` | 多个文件里的指令块高度重复 |
| `too-many-global-rules` | `MEDIUM` | 一个全局文件承载了过多策略 |
| `token-waste` | `LOW` | 长重复文本浪费上下文预算 |
| `repeated-negative-rules` | `LOW` | 重复的“do not”规则降低信号质量 |

## JSON 字段

JSON 输出使用 schema version `1.1`。

常用字段：

- `summary`：按严重级别统计的问题总数
- `displayedIssues` 与 `totalIssues`：受 `--max-issues` 影响
- `schemaVersion`：稳定 JSON report schema 版本
- `strictFailureCount`：会在 `--strict` 下失败的问题数量
- `confidence`：规则置信度分数
- `confidenceLabel`：`--strict` 使用的稳定置信度分层
- `autofixAvailable`：`context-debt fix` 是否能提出该规则的修复
- `sourceKind`：问题来源类型
- `resolvedPath`：可用时提供标准化后的解析路径
- `relatedFiles`：多文件问题涉及的其他文件

## MCP 扫描

`context-debt` 默认扫描这些 MCP 配置位置：

- `.mcp.json`
- `mcp.json`
- `.vscode/mcp.json`
- `.cursor/mcp.json`
- `.claude/mcp.json`

高风险配置示例：

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

典型结果：

- 当 server 暗示宽泛 filesystem、command 或 network 范围，但没有明确 allowlist 或说明时，触发 `dangerous-mcp-permission`

更安全的 MCP 配置通常同时包含：

- 人类可读的 `description` 或理由
- 窄范围 allowlist，例如 `roots`、`allowedPaths`、`allowedCommands` 或 `allowedDomains`

## Autofix 范围

`context-debt fix` 有意保持保守。当前支持：

- 删除引用缺失本地文件的行
- 删除完全重复的指令单元
- 从规范指令块生成 `context-debt.compact.md`

先预览：

```bash
context-debt fix .
```

显式写入：

```bash
context-debt fix . --write
```
