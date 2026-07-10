# clients/feishu/OCA-ARCH — 模块架构

> 本文档定义 clients/feishu 模块内部的目录结构和 3W 拆分细则。
> 项目级架构（四层架构总览、依赖方向图、架构原则、技术栈）见 [../../OCA-ARCH.md](../../OCA-ARCH.md)。

## 模块概览

飞书消息的监听和渲染器。独立 package 因为它是一个长驻 Node.js 服务进程，负责飞书 API 对接（WebSocket 长连接 + 卡片渲染 + 图片上传），通过 WebSocket 连接 gateway 转发消息。与 CLI 客户端平级，都是独立的可执行程序。

## 目录结构

```
clients/feishu/
├── package.json          # bin: { "oca-feishu": "./dist/main.js" }
├── tsconfig.json
├── tsdown.config.ts      # tsdown (单 entry, Node.js service)
└── src/
    ├── main.ts            # Entry: 连接飞书 + 连接 gateway WebSocket
    ├── ws-client.ts       # WebSocket client → gateway (与 oca-cli 类似)
    ├── feishu-client.ts   # 飞书 API 客户端 (认证 + WebSocket 长连接)
    ├── feishu-card.ts     # AgentEvent → 飞书卡片 JSON
    ├── card-updater.ts    # 流式卡片更新 (rate-limited)
    └── image-helper.ts    # 图片上传发送
```

## 3W 拆分细则

- **Why**: 飞书消息的监听和渲染器。独立 package 因为它是一个长驻 Node.js 服务进程，负责飞书 API 对接（WebSocket 长连接 + 卡片渲染 + 图片上传），通过 WebSocket 连接 gateway 转发消息。与 CLI 客户端平级，都是独立的可执行程序。
- **What**: 飞书 WebSocket 长连接客户端 + 飞书卡片构建 + 流式卡片更新 + 图片上传。接收飞书消息 → 转发给 gateway → 收到 AgentEvent → 渲染为飞书卡片 → 发回飞书。
- **When**: 修改飞书消息处理、卡片样式、图片功能时。与 gateway 通过 WebSocket 通信，不直接 import gateway 代码。
