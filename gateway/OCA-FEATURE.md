# gateway/OCA-FEATURE — 模块功能

> 本文档记录 gateway 模块的功能清单、构建配置和产物结构。
> 项目级功能清单见 [../../OCA-FEATURE.md](../../OCA-FEATURE.md)。
> 模块架构见 [OCA-ARCH.md](./OCA-ARCH.md)，接口契约见 [OCA-API.md](./OCA-API.md)，模块规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| HTTP + WebSocket 服务器 | 📋 计划中 | 网关服务入口，提供 REST API 和 WebSocket 端点 |
| CLI Channel | 📋 计划中 | Thin WebSocket handler (/ws/cli)，对接 oca-cli |
| Feishu Channel | 📋 计划中 | Thin WebSocket handler (/ws/feishu)，对接 oca-feishu |
| Dispatcher Orchestrator | 📋 计划中 | 自然语言 → Provider 调度（最小版，不含 prompt-builder/skill-injector） |
| Command System | ❌ 不实现 | 用户后续重新架构 |
| MCP Tool Server | 📋 计划中 | 最小框架 + current_context 工具 |
| CodelyCli Provider | 📋 计划中 | ACP 协议对接 codely-cli |
| OpenCode Provider | 📋 计划中 | SessionV2 API + SQLite 事件源 |
| Session 管理 | 📋 计划中 | 持久化 session + 队列 + 定时任务 |

## 构建配置

| 维度 | 配置 |
|------|------|
| 构建工具 | tsdown (rolldown-based) |
| Entries | 3 entries (entry/cli/mcp) |
| Code splitting | 启用 |
| onSuccess | asset copy (commands/*.json + skills/*.md → dist) |
