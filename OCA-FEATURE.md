# OCA-FEATURE — 功能清单

> 本文档记录 OpenCrossAgent 项目提供的主要功能和运行时架构。
> 架构设计见 [OCA-ARCH.md](./OCA-ARCH.md)（含技术栈），接口契约见 [OCA-API.md](./OCA-API.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 包命名与 bin 命令

| 目录 | 包名 | bin 命令 |
|------|------|---------|
| gateway/ | @oca/oca-gateway | oca-gateway |
| clients/cli/ | @oca/oca-cli | oca-cli |
| clients/feishu/ | @oca/oca-feishu | oca-feishu |
| installer/ | @oca/oca-installer | oca-installer |

## 项目功能清单

> 各模块详细功能清单见对应模块级 OCA-FEATURE：
> - [gateway/OCA-FEATURE.md](./gateway/OCA-FEATURE.md)
> - [clients/cli/OCA-FEATURE.md](./clients/cli/OCA-FEATURE.md)
> - [clients/feishu/OCA-FEATURE.md](./clients/feishu/OCA-FEATURE.md)
> - [installer/OCA-FEATURE.md](./installer/OCA-FEATURE.md)

## 运行时架构

```
用户终端
├── oca-cli               → TUI 进程 (bun/node)
│   │                       │ WebSocket ws://127.0.0.1:PORT/ws/cli
│   └───────────────────────┤
│                           ▼
├── oca-feishu             → 飞书监听进程 (node)
│   │  飞书平台 ←WebSocket   │ WebSocket ws://127.0.0.1:PORT/ws/feishu
│   └───────────────────────┤
│                           ▼
├── oca-gateway start      → Gateway 进程 (node)
│                           ├── HTTP + WS Server
│                           │     ├── /ws/cli ← oca-cli
│                           │     └── /ws/feishu ← oca-feishu
│                           ├── MCP Server (stdio sidecar)
│                           └── codely-cli (子进程)
│
└── oca-installer          → 安装脚本 (一次性运行)
```

## 版本管理

- 统一版本号：四个 package 同步 bump
- 当前阶段：暂不发布，仅本地构建
- 未来开启发布时配置 publishConfig.registry

## 构建概览

```bash
# 安装依赖
pnpm install

# 构建全部 package
pnpm -r build

# 单独构建
pnpm --filter @oca/oca-gateway build
pnpm --filter @oca/oca-cli build
pnpm --filter @oca/oca-feishu build
pnpm --filter @oca/oca-installer build

# shared/ 测试（独立运行，不需要构建）
cd shared && npx vitest run

# 本地开发
pnpm dev          # 一键启动 gateway + cli
```

## 配置模板结构

配置模板位于 `gateway/config/gateway.json`，使用 `${ENV_VAR}` 占位符，运行时由 `config-loader.ts` 展开：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "${FEISHU_APP_ID}",
      "appSecret": "${FEISHU_APP_SECRET}",
      "maxConcurrentPerChat": 3
    },
    "cli": { "enabled": true }
  },
  "providers": [
    { "name": "codely", "type": "codely", "options": { "model": "codely/codely-core", "workspace": "${WORKSPACE_DIR}" } },
    { "name": "opencode", "type": "opencode", "options": { "workspace": "${WORKSPACE_DIR}" } }
  ],
  "defaultProvider": "codely",
  "gateway": { "port": 18789, "host": "0.0.0.0" },
  "logDir": "~/.oca/logs"
}
```

运行时配置生成到 `~/.oca/gateway.json`，由 `oca-installer` 或 `oca-gateway setup` 创建。
飞书配置 (`appId`, `appSecret`) 由 `oca-feishu` 读取 `~/.oca/gateway.json` 获取。
