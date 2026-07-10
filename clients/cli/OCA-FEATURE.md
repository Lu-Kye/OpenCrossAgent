# clients/cli/OCA-FEATURE — 模块功能

> 本文档记录 clients/cli 模块的功能清单、构建配置和产物结构。
> 项目级功能清单见 [../../OCA-FEATURE.md](../../OCA-FEATURE.md)。
> 模块架构见 [OCA-ARCH.md](./OCA-ARCH.md)，接口契约见 [OCA-API.md](./OCA-API.md)，模块规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| TUI 客户端 (oca-cli) | 📋 计划中 | @opentui/react + React 19，全功能 |
| 主题系统 | 📋 计划中 | JSON 主题 + OKLCH 颜色 |
| Vim 模式 | 📋 计划中 | insert/normal/visual/command |
| WebSocket 重连 | 📋 计划中 | 指数退避 + jitter |
| Slash 命令 | 📋 计划中 | /theme /model /vim /spinner /stop |

## 构建配置

| 维度 | 配置 |
|------|------|
| 构建工具 | bun build |
| Externalize | native modules (@opentui/core-*) |
