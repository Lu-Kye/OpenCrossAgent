# gateway/OCA-ARCH — 模块架构

> 本文档定义 gateway 模块内部的目录结构、3W 拆分细则和内部依赖流。
> 项目级架构（四层架构总览、依赖方向图、架构原则、技术栈）见 [../../OCA-ARCH.md](../../OCA-ARCH.md)。
> 接口契约见 [OCA-API.md](./OCA-API.md)，功能清单见 [OCA-FEATURE.md](./OCA-FEATURE.md)，模块规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 模块概览

Gateway 是 OpenCrossAgent 的核心部署单元，承载 README 四层架构的全部实现。一个进程内运行 HTTP+WS 服务器 + MCP sidecar。

## 目录结构

```
gateway/
├── package.json
├── tsconfig.json            # extends ../../tsconfig.base.json
├── tsdown.config.ts         # 3 entries (entry/cli/mcp) + onSuccess asset copy
├── vitest.config.ts
├── gateway.mjs              # Bootstrap: Node version check → import dist/entry.js
│
├── config/
│   └── gateway.json         # Config template (${ENV_VAR} placeholders)
│
└── src/
    │
    ├── entry.ts             # Service entry: load config, start HTTP+WS
    ├── main.ts              # Env-var fallback entry
    ├── cli.ts               # CLI management (start/stop/restart/status)
    │
    ├── channel/             # ─── Channel Layer ───
    │   ├── types.ts         # IChannel, IChannelBridge (thin WebSocket relay)
    │   ├── cli/             # CLI Channel (thin WebSocket handler at /ws/cli)
    │   │   ├── cli-channel.ts
    │   │   └── cli-ws-server.ts
    │   └── feishu/          # Feishu Channel (thin WebSocket handler at /ws/feishu)
    │       └── feishu-channel.ts   # relay only — card rendering 在 clients/feishu/
    │
    ├── core/                # ─── Gateway Core ───
    │   ├── router.ts        # Message Router: /command → Command, 自然语言 → Orchestrator
    │   │
    │   ├── command/         # Command System
    │   │   ├── scanner.ts       # CommandScanner (4级目录扫描)
    │   │   ├── executor.ts      # CommandExecutor (节点图引擎: topo sort + sequential exec)
    │   │   ├── templates.ts     # Template engine ($args, $node.id.json.field)
    │   │   └── nodes/          # Node type implementations
    │   │       ├── agentrun.ts
    │   │       ├── script.ts
    │   │       ├── condition.ts
    │   │       ├── set.ts
    │   │       └── loop.ts
    │   │
    │   ├── orchestrator/    # Orchestrator
    │   │   ├── dispatcher-orchestrator.ts   # DispatcherOrchestrator (dispatch engine)
    │   │   ├── dispatch-pipeline.ts    # DispatchPipeline
    │   │   ├── prompt-builder.ts       # Budget-aware prompt building
    │   │   └── skill-injector.ts       # Skill injection
    │   │
    │   ├── infra/           # Infrastructure (shared by Command + Orchestrator + MCP)
    │   │   ├── session-store.ts        # SessionStore: name, workspaceDir, channel binding
    │   │   ├── session-queue.ts        # SessionQueue: serial dispatch, max 10 queued
    │   │   ├── json-file-store.ts      # Base JSON persistence (atomic write)
    │   │   ├── logger.ts               # Tagged logger → ~/.oca/logs/
    │   │   └── scheduler.ts            # Scheduled task execution
    │   │
    │   └── mcp/             # MCP Tool Server (Gateway sidecar)
    │       ├── mcp-server.ts           # stdio → Backend, HTTP REST → Core
    │       └── tools/                  # MCP tool implementations
    │           ├── current-context.ts
    │           ├── list-sessions.ts
    │           ├── list-providers.ts
    │           └── send-image.ts
    │
    ├── provider/            # ─── Agent Provider Layer (Abstraction) ───
    │   ├── types.ts         # IAgentProvider interface
    │   ├── registry.ts      # ProviderRegistry: register, get, resolve
    │   └── events.ts        # AgentEvent types + AsyncGenerator
    │
    ├── backend/            # ─── Agent Backend Layer (Implementations) ───
    │   ├── codely/          # CodelyCli Provider
    │   │   ├── codely-provider.ts     # IAgentProvider impl
    │   │   ├── acp-transport.ts       # ACP Protocol (JSON-RPC, persistent process)
    │   │   ├── session-manager.ts     # --resume-session, auto-saves
    │   │   └── event-parser.ts        # ACP event → AgentEvent
    │   └── opencode/       # OpenCode Provider
    │       ├── opencode-provider.ts   # IAgentProvider impl
    │       ├── session-runner.ts     # SessionV2 API + SessionRunner
    │       ├── event-source.ts       # SQLite + event sourcing
    │       └── tool-schema.ts        # Tool schema + plugin ecosystem
    │
    ├── commands/            # JSON command definitions (node graphs)
    │   ├── builtin/         # /session /model /agent /stop /help
    │   └── custom/          # /push /bump /merge
    │
    ├── skills/              # Skill .md files (injected into agent prompts)
    │
    ├── types/               # Shared type definitions
    │   ├── config.ts       # Config schema
    │   ├── session.ts      # Session, ProviderSession types
    │   └── common.ts       # Common shared types
    │
    └── utils/              # Shared utilities
        ├── config-loader.ts           # ${ENV} expansion
        └── process.ts                 # Process lifecycle helpers
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

## 内部依赖流

允许的依赖方向详见 [../../OCA-ARCH.md](../../OCA-ARCH.md) §依赖方向。

gateway 内部四层依赖流：

```
channel/ ──→ core/ ──→ provider/ ←── backend/
   │           │          ↑
   │           │          │ implements
   │           │          │
   └─────→ types/    types/
              ↑
           utils/
```

- `channel/` → `core/`（Channel 调用 Router）、`types/`
- `core/` → `provider/`（Orchestrator 调用 IAgentProvider）、`types/`、`utils/`
- `backend/` → `provider/`（实现 IAgentProvider）、`types/`、`utils/`
- `provider/` → `types/`（纯抽象层，最稳定）

禁止的依赖方向详见 [../../OCA-RULE.md](../../OCA-RULE.md) §依赖方向红线。
