# OCA-FEATURE — 功能清单

> 本文档记录 OpenCrossAgent 项目提供的主要功能和运行时架构。
> 架构设计见 [OCA-ARCH.md](./OCA-ARCH.md)（含技术栈），接口契约见 [OCA-API.md](./OCA-API.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 包命名与 bin 命令

| 目录 | 包名 | bin 命令 |
|------|------|---------|
| gateway/ | @oca/oca-gateway | oca-gateway |
| clients/cli/ | @oca/oca-cli | oca-cli |
| installer/ | @oca/oca-installer | oca-installer |

## 项目功能清单

### Gateway 功能

| 功能 | 状态 | 说明 |
|------|------|------|
| HTTP + WebSocket 服务器 | 📋 计划中 | 网关服务入口，提供 REST API 和 CLI WebSocket |
| CLI Channel | 📋 计划中 | localhost WebSocket 服务器，对接 oca-cli |
| Feishu Channel | 📋 计划中 | 飞书 WebSocket 长连接 + 卡片渲染 + 流式更新 |
| Agent Orchestrator | 📋 计划中 | 自然语言 → Provider 调度（最小版，不含 prompt-builder/skill-injector） |
| Command System | ❌ 不实现 | 用户后续重新架构 |
| MCP Tool Server | 📋 计划中 | 最小框架 + current_context 工具 |
| CodelyCli Provider | 📋 计划中 | ACP 协议对接 codely-cli |
| OpenCode Provider | 📋 计划中 | SessionV2 API + SQLite 事件源 |
| Session 管理 | 📋 计划中 | 持久化 session + 队列 + 定时任务 |

### Client 功能

| 功能 | 状态 | 说明 |
|------|------|------|
| TUI 客户端 (oca-cli) | 📋 计划中 | @opentui/react + React 19，全功能 |
| 主题系统 | 📋 计划中 | JSON 主题 + OKLCH 颜色 |
| Vim 模式 | 📋 计划中 | insert/normal/visual/command |
| WebSocket 重连 | 📋 计划中 | 指数退避 + jitter |
| Slash 命令 | 📋 计划中 | /theme /model /vim /spinner /stop |

### Installer 功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 一键安装 | 📋 计划中 | 检查依赖 → 安装 → 配置 → link bins |
| 配置向导 | 📋 计划中 | 交互式生成 ~/.oca/gateway.json |
| 更新 | 📋 计划中 | 拉取最新 + 重新构建 |

## 运行时架构

```
用户终端
├── oca-cli               → TUI 进程 (bun/node)
│   │                       │ WebSocket ws://127.0.0.1:PORT
│   └───────────────────────┤
│                           ▼
├── oca-gateway start      → Gateway 进程 (node)
│                           ├── HTTP + WS Server
│                           ├── MCP Server (stdio sidecar)
│                           └── codely-cli (子进程)
│
└── oca-installer          → 安装脚本 (一次性运行)
```

## 版本管理

- 统一版本号：三个 package 同步 bump
- 当前阶段：暂不发布，仅本地构建
- 未来开启发布时配置 publishConfig.registry

## 构建概览

```bash
# 安装依赖
pnpm install

# 构建全部
pnpm -r build

# 单独构建
pnpm --filter @oca/oca-gateway build
pnpm --filter @oca/oca-cli build
pnpm --filter @oca/oca-installer build

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
