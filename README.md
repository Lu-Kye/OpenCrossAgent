# OpenCrossAgent

Cross-agent orchestration gateway with multi-channel support (CLI + Feishu).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Channel Layer                                   │
│                                                                          │
│  对接前端：接收用户消息 + 回传 agent 执行过程中的事件给前端渲染            │
│                                                                          │
│  ┌─────────────────────────┐    ┌─────────────────────────┐             │
│  │   CLI Channel           │    │   Feishu Channel        │             │
│  │                         │    │                         │             │
│  │  WebSocket (localhost)  │    │  Feishu WebSocket       │             │
│  │  recv: user_input,     │    │  recv: 飞书消息, @bot    │             │
│  │        slash_command    │    │  send: 流式卡片更新      │             │
│  │  send: agent_event 流  │    │                         │             │
│  │        (TUI 渲染)       │    │                         │             │
│  └───────────┬─────────────┘    └───────────┬─────────────┘             │
└──────────────┼───────────────────────────────┼───────────────────────────┘
               │           bidirectional        │  bidirectional
               └───────────────┬───────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Gateway Core                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Message Router                                                   │   │
│  │  /command ──► Command System    自然语言 ──► Orchestrator          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  Command System                 │  │  Orchestrator                 │   │
│  │                                 │  │                               │   │
│  │  CommandScanner (4级目录扫描)    │  │  AgentOrchestrator            │   │
│  │  builtin: /session /model       │  │  ├ direct  (直接执行)         │   │
│  │           /agent /stop /help    │  │  ├ plan    (只读分析规划)      │   │
│  │  JSON: /push /bump /merge       │  │  └ enhance (技能增强提示词)    │   │
│  │                                 │  │                               │   │
│  │  CommandExecutor (节点图引擎)    │  │  UnifiedDispatchPipeline      │   │
│  │  ├ topo sort, sequential exec   │  │  ├ prompt building (budget)   │   │
│  │  ├ nodes: agentrun, script,     │  │  ├ skill injection            │   │
│  │  │  condition, set, loop        │  │  └ AgentEvent stream          │   │
│  │  └ templates: $args $node.json  │  │                               │   │
│  │                                 │  │  agentrun 节点回调 ──► pipeline │   │
│  └────────────────────────────────┘  └──────────────────────────────┘   │
│                                          │                               │
│                    ┌─────────────────────┴──────────────────────┐      │
│                    ▼                                            ▼      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Infrastructure (shared by Command + Orchestrator + MCP)         │  │
│  │                                                                  │  │
│  │  SessionStore                                                    │  │
│  │  ├ session name, workspaceDir, channel binding                    │  │
│  │  └ providerSessionId cache (from Backend)                        │  │
│  │  SessionQueue: serial dispatch, max 10 queued                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                    │                                                   │
│                    │ createSession /                                   │
│                    │ resumeSession                                     │
│                    ▼                                                   │
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
│  │  --resume-session             │  │  SessionV2 API + SessionRunner│     │
│  │  session: auto-saves          │  │  session: SQLite + event src   │     │
│  │  MCP + Extension ecosystem    │  │  Tool schema + Plugin ecosystem│     │
│  └──────────┬───────────────────┘  └──────────┬───────────────────┘      │
│             │                                  │                          │
│             │ providerSessionId returned       │ providerSessionId returned│
│             └──────────┬───────────────────────┘                          │
│                        │                                                  │
│             AgentEvent stream ──► IAgentProvider                           │
└─────────────────────────────────────────────────────────────────────────┘
             │                                  │
             └──────────┬───────────────────────┘
                        │ stdio
                        ▼
                  MCP Tool Server (sidecar in Gateway Core)
```

## License

MIT
