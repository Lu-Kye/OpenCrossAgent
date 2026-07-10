# installer/OCA-FEATURE — 模块功能

> 本文档记录 installer 模块的功能清单、构建配置和产物结构。
> 项目级功能清单见 [../OCA-FEATURE.md](../OCA-FEATURE.md)。
> 模块架构见 [OCA-ARCH.md](./OCA-ARCH.md)，接口契约见 [OCA-API.md](./OCA-API.md)，模块规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| 一键安装 | 📋 计划中 | 检查依赖 → 安装 → 配置 → link bins |
| 配置向导 | 📋 计划中 | 交互式生成 ~/.oca/gateway.json |
| 更新 | 📋 计划中 | 拉取最新 + 重新构建 |

## 构建配置

| 维度 | 配置 |
|------|------|
| 构建工具 | tsdown |
| Entry | 单 entry |
