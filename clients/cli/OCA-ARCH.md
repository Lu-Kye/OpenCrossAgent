# clients/cli/OCA-ARCH — 模块架构

> 本文档定义 clients/cli 模块内部的目录结构和 3W 拆分细则。
> 项目级架构（四层架构总览、依赖方向图、架构原则、技术栈）见 [../../OCA-ARCH.md](../../OCA-ARCH.md)。

## 模块概览

CLI Channel 的前端渲染器。独立 package 因为依赖栈完全不同（@opentui/react + React 19 vs Node.js 服务端），且构建工具不同（bun build vs tsdown）。

## 目录结构

```
clients/cli/
├── package.json          # bin: { "oca-cli": "./dist/main.js" }
├── tsconfig.json
├── build.ts              # bun build (externalize native modules)
├── vitest.config.ts
└── src/
    ├── main.tsx          # Entry point
    ├── App.tsx           # Root component (REPL)
    ├── ws-client.ts      # WebSocket reconnect client → gateway
    ├── commands.ts       # Client-side slash command handling
    ├── theme/            # Theme system (JSON themes)
    ├── components/       # UI components (InputBar, StatusBar, MessageView...)
    └── hooks/             # React hooks
```

## 3W 拆分细则

- **Why**: CLI Channel 的前端渲染器。独立 package 因为依赖栈完全不同（@opentui/react + React 19 vs Node.js 服务端），且构建工具不同（bun build vs tsdown）。
- **What**: React + OpenTUI 的 TUI 应用，通过 WebSocket 连接 gateway，含主题系统、UI 组件、客户端 slash 命令。
- **When**: 修改终端 UI、主题、输入交互时。与 gateway 通过 WebSocket 通信，不直接 import gateway 代码。
