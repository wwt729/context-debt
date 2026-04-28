# Regression Fixture

## 核心模块

### 1. 测评模块 (Evaluation)

- **路径**: `app/Http/Controllers/Evaluation/`
- **关键文件**:
  - `EvaluationQuestionsController.php`
  - `EvaluationAnswerController.php`
  - `EvaluationReportController.php`
  - `routes/evaluation.php`

### 2. 权限管理模块

- **包**: `spatie/laravel-permission`

### 3. AI 模块

- **集成**: 通过路由前缀 `/ai` 访问

## 开发规范

- 控制器按模块分组：`Http/Controllers/{Module}/`
- 服务类按业务分组：`Services/{Module}/`
- 模型按数据表分组：`Models/{Module}/`

### 日志位置

- 应用日志：`storage/logs/laravel.log`
- 队列日志：`storage/logs/queue.log`

## 相关文档

- [测评开发文档](docs/测评开发文档_2025-04-28.md)
- [数据同步模块文档](docs/DataSyncModule.md)
- [API 示例](api_response_examples.md)
