# OCA-ARCH — 工程架构设计

> 本文档定义 OpenCrossAgent 的四层架构、目录结构和依赖方向。
> 功能清单见 [OCA-FEATURE.md](./OCA-FEATURE.md)，接口契约见 [OCA-API.md](./OCA-API.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 背景与目的

OpenCrossAgent 是一个跨 Agent 编排网关，支持多渠道接入（CLI + Feishu）。README 架构图定义了四层架构：Channel Layer → Gateway Core → Agent Provider Layer → Agent Backend Layer。

项目刚起步（仅有 README + .gitignore + LICENSE），需要设计工程目录结构来指导后续开发。参考 TeamCodelyClaw 项目的成熟实践（pnpm monorepo + tsdown + vitest + ESM），结合 OpenCrossAgent 自身特点（显式 Provider 抽象 + 多 Backend 实现）进行设计。

## 架构设计约束

- 按 README 四层架构划分目录，每层边界清晰
- gateway 内部四层通过目录划分，不拆子 package
- 依赖方向：`channel → core → provider ← backend`（backend 实现 provider 接口，不直接被 core 引用）
- clients/ 目录预留多 client 扩展能力

功能清单和状态见 [OCA-FEATURE.md](./OCA-FEATURE.md)。

## 技术栈

| 维度 | 选型 | 说明 |
|------|------|------|
| 语言 | TypeScript (>= 5.5) | target: es2023, strict: true |
| 运行时 | Node.js >= 22 | gateway/installer; clients/cli 用 bun 运行 |
| 包管理 | pnpm workspaces | monorepo，3 个顶层 package |
| 构建 — gateway | tsdown (rolldown-based) | 3 entries + codeSplitting + onSuccess asset copy |
| 构建 — clients/cli | bun build | externalize native modules (@opentui/core-*) |
| 构建 — installer | tsdown | 单 entry |
| 模块系统 | ESM + NodeNext | module: NodeNext, moduleResolution: NodeNext |
| 测试 | vitest | *.test.ts 就近放置 |
| 包 scope | @oca/* | OpenCrossAgent 缩写 |

构建命令和产物结构见 [OCA-FEATURE.md](./OCA-FEATURE.md) §构建概览。

## 目录总览

```
OpenCrossAgent/
├── pnpm-workspace.yaml
├── package.json                # Root: devDeps, workspace scripts
├── .npmrc
├── tsconfig.base.json           # Shared TS config (target/module/strict)
├── README.md
├── .gitignore
│
├── shared/                      # 跨 package 共享代码（非独立 package，相对路径 import）
│   ├── fs.ts                    # ensureDir + atomicWrite + pathExists
│   ├── logger.ts                # createTagLogger + initLogger + setLogSuffix + closeLogger
│   ├── fs.test.ts               # fs 单元测试
│   ├── logger.test.ts           # logger 单元测试
│   └── vitest.config.ts         # shared 独立测试配置
│
├── gateway/                     # @oca/oca-gateway — 网关核心服务
│   ├── package.json
│   ├── tsconfig.json            # extends ../../tsconfig.base.json
│   ├── tsdown.config.ts         # 3 entries (entry/cli/mcp) + onSuccess asset copy
│   ├── vitest.config.ts
│   ├── gateway.mjs              # Bootstrap: Node version check → import dist/entry.js
│   │
│   ├── config/
│   │   └── gateway.json         # Config template (${ENV_VAR} placeholders)
│   │
│   └── src/
│       │
│       ├── entry.ts             # Service entry: load config, start HTTP+WS
│       ├── main.ts              # Env-var fallback entry
│       ├── cli.ts               # CLI management (start/stop/restart/status)
│       │
│       ├── channel/             # ─── Channel Layer ───
│       │   ├── types.ts         # IChannel, IChannelBridge (thin WebSocket relay)
│       │   ├── cli/             # CLI Channel (thin WebSocket handler at /ws/cli)
│       │   │   ├── cli-channel.ts
│       │   │   └── cli-ws-server.ts
│       │   └── feishu/          # Feishu Channel (thin WebSocket handler at /ws/feishu)
│       │       └── feishu-channel.ts   # relay only — card rendering 在 clients/feishu/
│       │
│       ├── core/                # ─── Gateway Core ───
│       │   ├── router.ts        # Message Router: /command → Command, 自然语言 → Orchestrator
│       │   │
│       │   ├── command/         # Command System
│       │   │   ├── scanner.ts       # CommandScanner (4级目录扫描)
│       │   │   ├── executor.ts      # CommandExecutor (节点图引擎: topo sort + sequential exec)
│       │   │   ├── templates.ts     # Template engine ($args, $node.id.json.field)
│       │   │   └── nodes/          # Node type implementations
│       │   │       ├── agentrun.ts
│       │   │       ├── script.ts
│       │   │       ├── condition.ts
│       │   │       ├── set.ts
│       │   │       └── loop.ts
│       │   │
│       │   ├── orchestrator/    # Orchestrator
│       │   │   ├── dispatcher-orchestrator.ts   # DispatcherOrchestrator (dispatch engine)
│       │   │   ├── dispatch-pipeline.ts    # DispatchPipeline
│       │   │   ├── prompt-builder.ts       # Budget-aware prompt building
│       │   │   └── skill-injector.ts       # Skill injection
│       │   │
│       │   ├── infra/           # Infrastructure (shared by Command + Orchestrator + MCP)
│       │   │   ├── session-store.ts        # SessionStore: name, workspaceDir, channel binding
│       │   │   ├── session-queue.ts        # SessionQueue: serial dispatch, max 10 queued
│       │   │   ├── json-file-store.ts      # Base JSON persistence (atomic write)
│       │   │   ├── logger.ts               # Tagged logger → ~/.oca/logs/
│       │   │   └── scheduler.ts            # Scheduled task execution
│       │   │
│       │   └── mcp/             # MCP Tool Server (Gateway sidecar)
│       │       ├── mcp-server.ts           # stdio → Backend, HTTP REST → Core
│       │       └── tools/                  # MCP tool implementations
│       │           ├── current-context.ts
│       │           ├── list-sessions.ts
│       │           ├── list-providers.ts
│       │           └── send-image.ts
│       │
│       ├── provider/            # ─── Agent Provider Layer (Abstraction) ───
│       │   ├── types.ts         # IAgentProvider interface
│       │   ├── registry.ts      # ProviderRegistry: register, get, resolve
│       │   └── events.ts        # AgentEvent types + AsyncGenerator
│       │
│       ├── backend/            # ─── Agent Backend Layer (Implementations) ───
│       │   ├── codely/          # CodelyCli Provider
│       │   │   ├── codely-provider.ts     # IAgentProvider impl
│       │   │   ├── acp-transport.ts       # ACP Protocol (JSON-RPC, persistent process)
│       │   │   ├── session-manager.ts     # --resume-session, auto-saves
│       │   │   └── event-parser.ts        # ACP event → AgentEvent
│       │   └── opencode/       # OpenCode Provider
│       │       ├── opencode-provider.ts   # IAgentProvider impl
│       │       ├── session-runner.ts     # SessionV2 API + SessionRunner
│       │       ├── event-source.ts       # SQLite + event sourcing
│       │       └── tool-schema.ts        # Tool schema + plugin ecosystem
│       │
│       ├── commands/            # JSON command definitions (node graphs)
│       │   ├── builtin/         # /session /model /agent /stop /help
│       │   └── custom/          # /push /bump /merge
│       │
│       ├── skills/              # Skill .md files (injected into agent prompts)
│       │
│       ├── types/               # Shared type definitions
│       │   ├── config.ts       # Config schema
│       │   ├── session.ts      # Session, ProviderSession types
│       │   └── common.ts       # Common shared types
│       │
│       └── utils/              # Shared utilities
│           ├── config-loader.ts           # ${ENV} expansion
│           ├── fs.ts                      # File system helpers
│           └── process.ts                 # Process lifecycle helpers
│
├── clients/                      # 所有 client 的父目录
│   ├── cli/                      # @oca/oca-cli — TUI 客户端
│   │   ├── package.json          # bin: { "oca-cli": "./dist/main.js" }
│   │   ├── tsconfig.json
│   │   ├── build.ts              # bun build (externalize native modules)
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── main.tsx          # Entry point
│   │       ├── App.tsx           # Root component (REPL)
│   │       ├── ws-client.ts      # WebSocket reconnect client → gateway
│   │       ├── commands.ts       # Client-side slash command handling
│   │       ├── theme/            # Theme system (JSON themes)
│   │       ├── components/       # UI components (InputBar, StatusBar, MessageView...)
│   │       └── hooks/             # React hooks
│   │
│   └── feishu/                   # @oca/oca-feishu — 飞书客户端
│       ├── package.json          # bin: { "oca-feishu": "./dist/main.js" }
│       ├── tsconfig.json
│       ├── tsdown.config.ts      # tsdown (单 entry, Node.js service)
│       └── src/
│           ├── main.ts            # Entry: 连接飞书 + 连接 gateway WebSocket
│           ├── ws-client.ts       # WebSocket client → gateway (与 oca-cli 类似)
│           ├── feishu-client.ts   # 飞书 API 客户端 (认证 + WebSocket 长连接)
│           ├── feishu-card.ts     # AgentEvent → 飞书卡片 JSON
│           ├── card-updater.ts    # 流式卡片更新 (rate-limited)
│           └── image-helper.ts    # 图片上传发送
│
├── installer/                   # @oca/oca-installer — 跨平台安装器
│   ├── package.json
│   ├── tsdown.config.ts
│   ├── tsconfig.json
│   └── install.mjs              # Cross-platform installer script
│
├── scripts/                     # Dev/release scripts
│   ├── dev.ts                   # Build/link/publish
│   ├── cli.ts                   # Start/stop/restart gateway
│   ├── dev.bat / dev.sh         # Platform wrappers
│   └── release.bat / release.sh
│
└── tests/                       # E2E/integration tests
    └── e2e/
```

未来扩展：

```
clients/
├── cli/          # TUI 客户端（当前）
├── feishu/       # 飞书客户端（当前）
├── desktop-app/  # 桌面客户端（未来）
└── mobile-app/   # 移动客户端（未来）
```

## 3W 拆分细则

### 1. `gateway/` — 网关核心服务

- **Why**: OpenCrossAgent 的核心部署单元，承载 README 四层架构的全部实现。一个进程内运行 HTTP+WS 服务器 + MCP sidecar。
- **What**: 包含 Channel Layer、Gateway Core、Provider Layer、Backend Layer 四大模块，以及 commands/skills 资产文件、config 模板、构建配置。
- **When**: 任何涉及网关功能的开发都在此 package 内进行。新增 Channel / Backend / Command / Skill 时在此 package 内操作。

### 2. `gateway/src/channel/` — Channel Layer

- **Why**: 对接前端层。不同前端（CLI 终端 / 飞书）有完全不同的协议和渲染方式，必须隔离。Gateway 侧的 channel 是 thin WebSocket relay，不做渲染转换。
- **What**: 共享接口定义（`types.ts`）+ 各 channel 子目录。`cli/` 实现 localhost WebSocket 服务器（`/ws/cli`），`feishu/` 实现 thin WebSocket handler（`/ws/feishu`）。卡片渲染、飞书 API 对接等逻辑在 `clients/feishu/` 中。
- **When**: 新增渠道时在 `channel/` 下新建 `<name>/` 子目录（thin WS handler）；同时在 `clients/<name>/` 下新建对应客户端。

### 3. `gateway/src/core/` — Gateway Core

- **Why**: 网关的中枢大脑。Message Router 做路由决策，Command System 执行节点图编排，Orchestrator 调度 Agent 执行，Infrastructure 提供共享基础设施，MCP Server 暴露工具给 Agent Backend。
- **What**:

  **3.1 `router.ts`** — Message Router
  - **Why**: 统一入口，决定消息走 Command System 还是 Orchestrator。
  - **What**: 接收来自 Channel 的消息，判断 `/command` → Command System，自然语言 → Orchestrator。
  - **When**: 修改路由规则时。通常很少改动。

  **3.2 `command/`** — Command System
  - **Why**: `/command` 触发的结构化操作，由 JSON 定义节点图驱动，不需要写代码。
  - **What**: `scanner.ts`（4 级目录扫描自动发现命令）、`executor.ts`（节点图引擎：topo sort + 顺序执行）、`templates.ts`（模板引擎解析 `$args` / `$node.id.json.field`）、`nodes/`（五种节点类型实现：agentrun / script / condition / set / loop）。
  - **When**: 新增节点类型时在 `nodes/` 下新增文件 + 在 `executor.ts` 注册；修改扫描规则时动 `scanner.ts`。

  **3.3 `orchestrator/`** — Dispatcher Orchestrator
  - **Why**: 网关内部的调度引擎（Dispatcher）。接收用户消息，resolve 外部 agent provider，通过 pipeline 调度执行并产出 AgentEvent 流。Dispatcher 是 high-level 编排，Agent 是 low-level 外部工具。
  - **What**: `dispatcher-orchestrator.ts`（调度引擎）、`dispatch-pipeline.ts`（调度管道）、`prompt-builder.ts`（Budget-aware prompt 构建）、`skill-injector.ts`（读取 `skills/*.md` 注入 prompt）。
  - **When**: 修改 prompt 策略动 `prompt-builder.ts`；修改 skill 注入动 `skill-injector.ts`；新增调度阶段扩展 `dispatch-pipeline.ts`。

  **3.4 `infra/`** — Infrastructure
  - **Why**: 被 Command System、Orchestrator、MCP Server 共享的基础设施。
  - **What**: Session 管理（`session-store.ts`）、消息队列（`session-queue.ts`）、JSON 持久化基类（`json-file-store.ts`）、Tagged logger（`logger.ts`）、定时任务（`scheduler.ts`）。
  - **When**: 修改 session 生命周期或队列策略时；新增持久化存储需求时继承 `json-file-store.ts`。

  **3.5 `mcp/`** — MCP Tool Server (Gateway sidecar)
  - **Why**: Agent Backend 通过 MCP 协议调用网关能力，是 Agent ↔ Gateway 的桥梁。
  - **What**: `mcp-server.ts`（MCP Server 入口，stdio 连 Backend，HTTP REST 连 Core）+ `tools/`（每个工具一个文件）。
  - **When**: 新增 MCP 工具时在 `tools/` 下新增文件 + 在 `mcp-server.ts` 注册。

### 4. `gateway/src/provider/` — Agent Provider Layer (Abstraction)

- **Why**: OpenCrossAgent 的核心差异化设计。有多个 Backend（CodelyCli / OpenCode），需要抽象层隔离网关核心与具体 Backend 实现。依赖倒置：core 依赖接口，不依赖实现。
- **What**: `types.ts`（IAgentProvider 接口）、`registry.ts`（ProviderRegistry 注册表）、`events.ts`（AgentEvent 类型 + 事件流类型）。
- **When**: 修改 Agent 调度接口时。通常很少改动，是稳定的抽象层。

### 5. `gateway/src/backend/` — Agent Backend Layer (Implementations)

- **Why**: 每个 Backend 有完全不同的协议（ACP JSON-RPC vs OpenCode API）和 session 管理机制，必须隔离。
- **What**:
  - `codely/` — CodelyCli Provider：ACP 协议传输、session 管理、ACP 事件解析。
  - `opencode/` — OpenCode Provider：SessionV2 API、SQLite 事件源、Tool schema 适配。
- **When**: 新增 Backend 时在 `backend/` 下新建 `<name>/` 子目录，实现 IAgentProvider，启动时注册到 ProviderRegistry。

### 6. `gateway/src/commands/` — JSON 命令定义

- **Why**: 命令以 JSON 节点图定义，不写代码。与源码分离，构建时复制到 dist。
- **What**: `builtin/`（`/session` `/model` `/agent` `/stop` `/help`）、`custom/`（`/push` `/bump` `/merge` 等）。每个命令是一个 `<command-name>/command.json`。
- **When**: 新增/修改命令时操作 JSON 文件，不碰 TypeScript 代码。

### 7. `gateway/src/skills/` — Skill 文件

- **Why**: Skill 以 `.md` 文件定义，运行时由 `skill-injector.ts` 注入到 agent prompt 中。与源码分离，构建时复制到 dist。
- **What**: 每个 skill 是一个 `.md` 文件，包含指导 LLM 行为的 prompt 片段。
- **When**: 新增/修改 skill 时操作 `.md` 文件，不碰代码。

### 8. `gateway/src/types/` + `utils/` — Gateway 专属类型与工具

- **Why**: Gateway 四层共用的类型定义和工具函数。仅 gateway 内部使用，不跨 package。
- **What**: `types/`（config / session / common 类型定义）、`utils/`（config-loader 配置加载、process 进程管理）。fs 和 logger 直接从 `shared/` import，不在 gateway 中重复。
- **When**: 新增 gateway 内部共享类型或工具函数时。只放真正被多层共用的代码，层内私有工具不放在这里。

### 8b. `shared/` — 跨 package 共享代码

- **Why**: logger 和 fs 工具被所有可执行程序（gateway / cli / feishu / installer）共用。不能放在 gateway 中（OCA-RULE 禁止 clients/ import gateway/ 源码）。
- **What**: `fs.ts`（ensureDir / atomicWrite / pathExists）、`logger.ts`（createTagLogger / initLogger / setLogSuffix / closeLogger）。不是独立 package，通过相对路径 import。构建时被 tsdown/bun build 打包进各 package 的 dist 中。
- **When**: 新增跨 package 共用的工具函数时。仅放真正被多个 package 使用的代码，gateway 专属工具不放这里。

### 9. `clients/cli/` — TUI 客户端

- **Why**: CLI Channel 的前端渲染器。独立 package 因为依赖栈完全不同（@opentui/react + React 19 vs Node.js 服务端），且构建工具不同（bun build vs tsdown）。
- **What**: React + OpenTUI 的 TUI 应用，通过 WebSocket 连接 gateway，含主题系统、UI 组件、客户端 slash 命令。
- **When**: 修改终端 UI、主题、输入交互时。与 gateway 通过 WebSocket 通信，不直接 import gateway 代码。

### 9b. `clients/feishu/` — 飞书客户端

- **Why**: 飞书消息的监听和渲染器。独立 package 因为它是一个长驻 Node.js 服务进程，负责飞书 API 对接（WebSocket 长连接 + 卡片渲染 + 图片上传），通过 WebSocket 连接 gateway 转发消息。与 CLI 客户端平级，都是独立的可执行程序。
- **What**: 飞书 WebSocket 长连接客户端 + 飞书卡片构建 + 流式卡片更新 + 图片上传。接收飞书消息 → 转发给 gateway → 收到 AgentEvent → 渲染为飞书卡片 → 发回飞书。
- **When**: 修改飞书消息处理、卡片样式、图片功能时。与 gateway 通过 WebSocket 通信，不直接 import gateway 代码。

### 10. `installer/` — 跨平台安装器

- **Why**: 一键安装/配置 OpenCrossAgent（gateway + clients/cli），降低上手门槛。
- **What**: 跨平台 Node.js 脚本：检查前置依赖、安装 packages、生成配置目录（`~/.oca/`）、复制配置模板。
- **When**: 发布新版本、修改安装流程时。

### 11. `scripts/` — 开发/发布脚本

- **Why**: 统一管理 dev/release 工作流，跨平台兼容。
- **What**: `dev.ts`（构建/链接/发布）、`cli.ts`（启停网关）、平台 wrapper（`.bat` / `.sh`）。
- **When**: 修改开发工作流、CI/CD 流程时。

### 12. `tests/` — E2E/集成测试

- **Why**: 跨 package 的端到端测试，验证 gateway + client 完整链路。
- **What**: E2E 测试脚本，模拟用户输入 → 验证 agent 输出。
- **When**: 发布前验证、回归测试时。

## 依赖方向

```
channel/ ──→ core/ ──→ provider/ ←── backend/
   │           │          ↑
   │           │          │ implements
   │           │          │
   └─────→ types/    types/
              ↑
           utils/

跨 package:
gateway/ ──→ shared/ (fs, logger)
clients/ ──→ shared/ (fs, logger)
installer/ ──→ shared/ (fs, logger)
```

允许的依赖方向：

- `channel/` → `core/`（Channel 调用 Router）、`types/`
- `core/` → `provider/`（Orchestrator 调用 IAgentProvider）、`types/`、`utils/`
- `backend/` → `provider/`（实现 IAgentProvider）、`types/`、`utils/`
- `provider/` → `types/`（纯抽象层，最稳定）

禁止的依赖方向详见 [OCA-RULE.md](./OCA-RULE.md)。

## 架构原则

1. **目录即架构** — 目录结构直接映射 README 架构图四层，开发者看目录即理解架构。
