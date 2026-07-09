# OpenCrossAgent

Cross-agent orchestration gateway with multi-channel support (CLI + Feishu + extensible clients).

## Purpose

OpenCrossAgent 的开发初衷是**社区共建一个通用 AI Agent 框架**。

- **兼容各种通用 Agent** — 通过 Provider 抽象层，快速接入 CodelyCli、OpenCode 等不同后端 Agent，配置即切换。
- **支持多种 Client** — CLI / 飞书 / 桌面应用 / 移动应用，同一套网关核心，多端接入。
- **易于 Fork 定制** — 清晰的四层架构 + 资产与代码分离，社区开发者可以低成本 fork 出个性化 Agent 工具：
  - 定制 Agent 编排流程（commands/skills 资产文件，不改代码）
  - 快速配置切换底层通用 Agent（Provider Registry）
  - 按需定制各端 Client（clients/ 下独立扩展）
- **场景示例** — 辅助学习的课程 Agent、辅助开发的编码 Agent、辅助写作的创作 Agent……同一套框架，不同定制。

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Channel Layer                                   │
│                                                                          │
│  对接前端：接收用户消息 + 回传 agent 执行过程中的事件给前端渲染            │
│  所有 channel 都是 thin WebSocket relay，渲染逻辑在各自 client 中          │
│                                                                          │
│  ┌─────────────────────────┐    ┌─────────────────────────┐             │
│  │   CLI Channel            │    │   Feishu Channel         │             │
│  │   (thin WS relay)        │    │   (thin WS relay)       │             │
│  │  /ws/cli                 │    │  /ws/feishu             │             │
│  │  ← oca-cli (TUI)         │    │  ← oca-feishu           │             │
│  │  recv: user_input       │    │  recv: user_input       │             │
│  │  send: agent_event 流   │    │  send: agent_event 流   │             │
│  └───────────┬─────────────┘    └───────────┬─────────────┘             │
└──────────────┼───────────────────────────────┼───────────────────────────┘
                               ▲
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Gateway Core                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Message Router                                                   │   │
│  │  /command ──► Command System    自然语言 ──► Dispatcher          │   │
│  └───────────────┬──────────────────────────────┬────────────────────┘   │
│                  │                              │                         │
│                  ▼                              ▼                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Command System                                                   │   │
│  │                                                                  │   │
│  │  CommandScanner (4级目录扫描)                                      │   │
│  │  builtin: /session /model /agent /stop /help                      │   │
│  │  JSON:    /push /bump /merge                                      │   │
│  │                                                                  │   │
│  │  CommandExecutor (节点图引擎)                                      │   │
│  │  ├ topo sort, sequential exec                                     │   │
│  │  ├ nodes: agentrun, script, condition, set, loop                  │   │
│  │  ├ templates: $args $node.id.json.field                            │   │
│  │  │                                                                │   │
│  │  └─ agentrun 节点 ──► Dispatcher                                │   │
│  │                                                                  │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│                                 │                                        │
│                                 ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Dispatcher Orchestrator                                         │   │
│  │                                                                  │   │
│  │  DispatcherOrchestrator                                          │   │
│  │  └ dispatch engine                                               │   │
│  │                                                                  │   │
│  │  DispatchPipeline                                               │   │
│  │  ├ prompt building (budget-aware)                                │   │
│  │  ├ skill injection                                               │   │
│  │  └ AgentEvent stream production                                  │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│                ┌────────────────┴────────────────┐                     │
│                ▼                                 ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Infrastructure (shared by Command + Dispatcher + MCP)          │  │
│  │                                                                  │  │
│  │  SessionStore                                                    │  │
│  │  ├ session name, workspaceDir, channel binding                    │  │
│  │  └ providerSessionId cache (from Backend)                        │  │
│  │  SessionQueue: serial dispatch, max 10 queued                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                       │
│                                 │ createSession /                       │
│                                 │ resumeSession                         │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  MCP Tool Server (Gateway sidecar)                                │  │
│  │  current_context, list_sessions, list_providers, send_image       │  │
│  │  stdio ──► Agent Backend    HTTP REST ──► Gateway Core             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Agent Provider Layer (Abstraction)                      │
│                                                                          │
│  IAgentProvider Interface                                                │
│  ├ dispatch(prompt, options): AsyncGenerator<AgentEvent>                 │
│  ├ createSession, resumeSession, stopSession                            │
│  └ listModels, dispose                                                   │
│                                                                          │
│  ProviderRegistry: register, get, resolve                                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                 │ resolve
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Agent Backend Layer (Implementations)                   │
│                                                                          │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐      │
│  │  CodelyCli Provider           │  │  OpenCode Provider            │      │
│  │                               │  │                               │      │
│  │  ACP Protocol (JSON-RPC)      │  │  OpenCode Protocol            │      │
│  │  persistent process           │  │  Effect.js service            │      │
│  │  --resume-session             │  │  SessionV2 API + SessionRunner│      │
│  │  session: auto-saves          │  │  session: SQLite + event src   │      │
│  │  MCP + Extension ecosystem    │  │  Tool schema + Plugin ecosystem│      │
│  └──────────┬───────────────────┘  └──────────┬───────────────────┘      │
│             │                                  │                          │
│             │ providerSessionId returned       │ providerSessionId returned│
│             └──────────┬───────────────────────┘                          │
│                        │                                                  │
│             AgentEvent stream ──► IAgentProvider                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## License

MIT
