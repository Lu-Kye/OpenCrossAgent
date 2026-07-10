# clients/feishu/OCA-FEATURE — 模块功能

> 本文档记录 clients/feishu 模块的功能清单、构建配置和产物结构。
> 项目级功能清单见 [../../OCA-FEATURE.md](../../OCA-FEATURE.md)。
> 模块架构见 [OCA-ARCH.md](./OCA-ARCH.md)，接口契约见 [OCA-API.md](./OCA-API.md)，模块规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| 飞书客户端 (oca-feishu) | 📋 计划中 | 飞书 WebSocket 长连接 + 卡片渲染 + 流式更新 |
| 飞书卡片构建 | 📋 计划中 | AgentEvent → 飞书卡片 JSON |
| 流式卡片更新 | 📋 计划中 | rate-limited 批量更新 |
| 图片上传发送 | 📋 计划中 | 飞书图片 API |

## 构建配置

| 维度 | 配置 |
|------|------|
| 构建工具 | tsdown |
| Entry | 单 entry (Node.js service) |
