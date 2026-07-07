# OpenCrossAgent

Cross-agent orchestration gateway with multi-channel support (CLI + Feishu).

## Architecture

```mermaid
graph TB
    subgraph Users
        U1[CLI User]
        U2[Feishu User]
    end

    subgraph ChannelLayer [Channel Layer]
        CLI[CLI Channel<br/>WebSocket localhost<br/>recv: user_input, slash_command<br/>send: agent_event stream TUI]
        FS[Feishu Channel<br/>Feishu WebSocket<br/>recv: Feishu msg, @bot<br/>send: streaming card updates]
    end

    subgraph GatewayCore [Gateway Core]
        ROUTER[Message Router<br/>/command - to - Command System<br/>natural lang - to - Orchestrator]
        CS[Command System<br/>CommandScanner 4-level scan<br/>builtin: /session /model /agent /stop /help<br/>JSON: /push /bump /merge]
        EXEC[CommandExecutor Node Graph Engine<br/>topological sort, sequential exec<br/>nodes: agentrun, script, condition, set, loop]
        ORC[Orchestrator<br/>AgentOrchestrator: direct, plan, enhance<br/>UnifiedDispatchPipeline<br/>prompt building + skill injection]
        INFRA[Infrastructure<br/>SessionStore: persist + providerSessionId map<br/>SessionQueue: serial dispatch max 10<br/>shared by Command, Orchestrator, MCP]
        MCP[MCP Tool Server sidecar<br/>current_context, list_sessions<br/>list_providers, send_image]
    end

    subgraph ProviderLayer [Agent Provider Layer]
        REG[ProviderRegistry<br/>register, get, resolve]
        IAP[IAgentProvider Interface<br/>dispatch - AsyncGenerator AgentEvent<br/>listModels, createSession, resumeSession]
    end

    subgraph BackendLayer [Agent Backend Layer]
        CLP[CodelyCli Provider<br/>ACP Protocol JSON-RPC<br/>persistent process, --resume-session<br/>MCP + Extension ecosystem]
        OCP[OpenCode Provider<br/>OpenCode Protocol<br/>SessionV2 API + SessionRunner<br/>Tool schema + Plugin ecosystem]
    end

    U1 -->|WebSocket| CLI
    U2 -->|Feishu WS| FS

    CLI <-->|user msg up / agent_event down| ROUTER
    FS <-->|Feishu msg up / card update down| ROUTER

    ROUTER -->|/command| CS
    CS --> EXEC
    EXEC -->|agentrun callback| ORC
    ROUTER -->|natural lang| ORC

    CS --> INFRA
    ORC --> INFRA
    MCP --> INFRA
    ORC --> REG

    REG --> IAP

    IAP --> CLP
    IAP --> OCP

    CLP -.->|stdio| MCP
    MCP -.->|HTTP REST| ROUTER
```

## License

MIT
