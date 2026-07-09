# OCA-API — 模块接口契约

> 本文档定义 OpenCrossAgent 各层导出的公共接口、类型签名和调用方式。
> 供 LLM 编写依赖某模块的其他模块时查阅，实现接口复用。
> 架构设计见 [OCA-ARCH.md](./OCA-ARCH.md)，开发规范见 [OCA-DEV.md](./OCA-DEV.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## Channel Layer (`channel/`)

### `channel/types.ts`

三个核心接口，所有 channel 实现必须实现：

```typescript
/** 消息接收者 — 接收前端用户输入 */
interface IChannel {
  readonly name: string
  start(): Promise<void>
  stop(): Promise<void>
  onMessage(handler: (msg: ChannelMessage) => void): void
  send(sessionId: string, event: AgentEvent): Promise<void>
}

/** 网关↔通道桥接 — 将 channel 接入 gateway 生命周期 */
interface IChannelBridge {
  bind(sessionId: string, channel: IChannel): void
  unbind(sessionId: string): void
  forwardToChannel(sessionId: string, event: AgentEvent): void
}

/** 事件渲染器 — 将 AgentEvent 转换为前端可渲染的格式 */
interface IChannelRenderer {
  render(event: AgentEvent): ChannelRenderResult
}

/** 前端用户消息 */
interface ChannelMessage {
  sessionId: string
  type: 'user_input' | 'slash_command'
  content: string
  args?: string[]
}
```

### CLI Channel (`channel/cli/`)

- `cli-ws-server.ts` — localhost WebSocket 服务器，监听 `/ws/cli` 路径
- `cli-channel.ts` — 实现 `IChannel`，接收 `user_input` / `slash_command`，回传 `agent_event` 流

### Feishu Channel (`channel/feishu/`)

- `feishu-client.ts` — 飞书 WebSocket 长连接客户端
- `feishu-channel.ts` — 实现 `IChannel`，接收飞书消息和 @bot 事件
- `feishu-card.ts` — 实现 `IChannelRenderer`，将 AgentEvent 转为飞书卡片 JSON
- `card-updater.ts` — 流式卡片更新器，支持增量更新卡片内容

---

## Gateway Core (`core/`)

### `core/router.ts` — Message Router

```typescript
interface MessageRouter {
  /** 判断消息类型并路由到对应子系统 */
  route(message: ChannelMessage): Promise<RouteResult>
}

type RouteResult =
  | { type: 'command'; commandName: string; args: string[] }
  | { type: 'natural_language'; prompt: string }
```

### `core/command/` — Command System

#### `command/scanner.ts`

```typescript
class CommandScanner {
  /**
   * 4 级目录扫描:
   * commands/ → builtin|custom/ → <command-name>/ → <version>/command.json
   */
  scan(basePath: string): Promise<CommandDefinition[]>
}

interface CommandDefinition {
  name: string
  version: string
  category: 'builtin' | 'custom'
  nodes: CommandNode[]
  edges: CommandEdge[]
  args?: CommandArg[]
}
```

#### `command/executor.ts`

```typescript
class CommandExecutor {
  /** 节点图引擎: topological sort + 顺序执行 */
  execute(
    definition: CommandDefinition,
    args: Record<string, string>,
    context: ExecutionContext
  ): AsyncGenerator<CommandResult>
}

interface ExecutionContext {
  sessionId: string
  workspaceDir: string
  channel: IChannel
}
```

#### `command/templates.ts`

```typescript
/** 模板引擎: 解析占位符 */
function resolveTemplate(
  template: string,
  vars: {
    args: Record<string, string>
    node: Record<string, unknown>  // $node.id.json.field
  }
): string
```

#### `command/nodes/` — 节点类型

每种节点类型实现统一接口：

```typescript
interface NodeHandler {
  readonly type: 'agentrun' | 'script' | 'condition' | 'set' | 'loop'
  execute(node: CommandNode, ctx: ExecutionContext): Promise<NodeResult>
}

interface NodeResult {
  nodeId: string
  output: unknown
  nextNodeIds: string[]
}
```

- `agentrun.ts` — 触发 Agent 执行（→ Orchestrator）
- `script.ts` — 执行 Shell 脚本
- `condition.ts` — 条件分支判断
- `set.ts` — 设置变量
- `loop.ts` — 循环执行

### `core/orchestrator/` — Orchestrator

#### `orchestrator/agent-orchestrator.ts`

```typescript
class AgentOrchestrator {
  /** 直接执行模式: 接收用户输入 → 启动 dispatch pipeline */
  execute(
    prompt: string,
    sessionId: string,
    options?: OrchestratorOptions
  ): AsyncGenerator<AgentEvent>
}

interface OrchestratorOptions {
  skillNames?: string[]
  maxTokens?: number
  providerName?: string
}
```

#### `orchestrator/dispatch-pipeline.ts`

```typescript
class UnifiedDispatchPipeline {
  /**
   * 统一调度管道:
   * prompt building → skill injection → provider dispatch → event stream production
   */
  run(input: DispatchInput): AsyncGenerator<AgentEvent>
}

interface DispatchInput {
  prompt: string
  sessionId: string
  skills: string[]
  budget: TokenBudget
  provider: IAgentProvider
}
```

#### `orchestrator/prompt-builder.ts`

```typescript
/** Budget-aware prompt 构建，控制 token 预算 */
function buildPrompt(
  userPrompt: string,
  skills: string[],
  budget: TokenBudget
): Promise<string>

interface TokenBudget {
  maxInputTokens: number
  reservedForOutput: number
}
```

#### `orchestrator/skill-injector.ts`

```typescript
/** 读取 skills/*.md 并注入到 prompt 中 */
function injectSkills(
  prompt: string,
  skillNames: string[],
  skillsDir: string
): Promise<string>
```

### `core/infra/` — Infrastructure

#### `infra/session-store.ts`

```typescript
class SessionStore extends JsonFileStore<SessionRecord> {
  createSession(params: CreateSessionParams): Promise<Session>
  getSession(name: string): Promise<Session | null>
  resumeSession(name: string): Promise<Session>
  deleteSession(name: string): Promise<void>
  listSessions(): Promise<Session[]>
}

interface Session {
  id: string
  name: string
  workspaceDir: string
  channelType: 'cli' | 'feishu'
  providerSessionId?: string  // 缓存从 Backend 返回的 session ID
  createdAt: number
  updatedAt: number
}

interface CreateSessionParams {
  name: string
  workspaceDir: string
  channelType: 'cli' | 'feishu'
}
```

#### `infra/session-queue.ts`

```typescript
class SessionQueue {
  /** Session 级消息队列: 串行调度，最多 10 条排队 */
  enqueue(sessionId: string, task: QueuedTask): Promise<void>
  dequeue(sessionId: string): Promise<QueuedTask | null>
  getQueueSize(sessionId: string): number
}

interface QueuedTask {
  id: string
  type: 'dispatch' | 'command'
  payload: unknown
  createdAt: number
}
```

#### `infra/json-file-store.ts`

```typescript
/** JSON 文件持久化基类: 原子写入 (temp→rename) */
abstract class JsonFileStore<T> {
  constructor(filePath: string)
  load(): Promise<T>
  save(data: T): Promise<void>  // 原子写入: 写临时文件 → rename
  update(patch: Partial<T>): Promise<T>
}
```

#### `infra/logger.ts`

```typescript
/** Tagged logger: 按 tag 路由到 ~/.oca/logs/*.log */
function createTagLogger(tag: string): {
  info(msg: string, ...args: unknown[]): void
  warn(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
  debug(msg: string, ...args: unknown[]): void
}
```

#### `infra/scheduler.ts`

```typescript
class Scheduler {
  schedule(cron: string, task: ScheduledTask): string  // returns task ID
  cancel(taskId: string): void
  listTasks(): ScheduledTask[]
}

interface ScheduledTask {
  id: string
  cron: string
  action: () => Promise<void>
  enabled: boolean
}
```

### `core/mcp/` — MCP Tool Server

#### `mcp/mcp-server.ts`

```typescript
class McpServer {
  /** stdio → Agent Backend, HTTP REST → Gateway Core */
  start(): Promise<void>
  stop(): Promise<void>
  registerTool(tool: McpTool): void
}

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: unknown) => Promise<unknown>
}
```

#### `mcp/tools/` — 工具实现

| 文件 | 工具名 | 功能 |
|------|--------|------|
| `current-context.ts` | `current_context` | 返回当前 session 的 workspace、channel、provider 信息 |
| `list-sessions.ts` | `list_sessions` | 列出所有活跃 session |
| `list-providers.ts` | `list_providers` | 列出已注册的 Agent Backend 及其状态 |
| `send-image.ts` | `send_image` | 向当前 session 绑定的 channel 发送图片 |

---

## Provider Layer (`provider/`)

### `provider/types.ts` — IAgentProvider 接口

```typescript
/** Agent Backend 抽象接口 — 所有 Backend 实现此接口 */
interface IAgentProvider {
  readonly name: string

  /** 分发 prompt 到 Agent，返回事件流 */
  dispatch(prompt: string, options: DispatchOptions): AsyncGenerator<AgentEvent>

  /** 创建新 session */
  createSession(params: CreateProviderSessionParams): Promise<ProviderSession>

  /** 恢复已有 session */
  resumeSession(sessionId: string): Promise<ProviderSession>

  /** 停止 session */
  stopSession(sessionId: string): Promise<void>

  /** 列出可用模型 */
  listModels(): Promise<ModelInfo[]>

  /** 释放资源 */
  dispose(): Promise<void>
}

interface DispatchOptions {
  sessionId: string
  model?: string
  maxTokens?: number
  systemPrompt?: string
}

interface CreateProviderSessionParams {
  workspaceDir: string
  model?: string
}

interface ProviderSession {
  id: string          // providerSessionId，缓存到 SessionStore
  model: string
  createdAt: number
}
```

### `provider/registry.ts` — ProviderRegistry

```typescript
class ProviderRegistry {
  /** 注册 Backend 实现 */
  register(name: string, provider: IAgentProvider): void

  /** 按名称获取 Backend */
  get(name: string): IAgentProvider

  /** 按配置解析合适的 Backend */
  resolve(config: { provider?: string }): IAgentProvider

  /** 列出所有已注册的 Backend */
  list(): { name: string; provider: IAgentProvider }[]
}
```

### `provider/events.ts` — AgentEvent 类型

```typescript
/** Agent 执行过程中的事件流 */
type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; toolName: string; input: unknown }
  | { type: 'tool_result'; toolName: string; output: unknown }
  | { type: 'thinking'; content: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'session_created'; sessionId: string }
  | { type: 'done'; summary?: string }

/** 事件流类型 */
type AgentEventStream = AsyncGenerator<AgentEvent>
```

---

## Backend Layer (`backend/`)

每个 Backend 目录必须导出一个实现 `IAgentProvider` 的类，并在启动时注册到 `ProviderRegistry`。

### `backend/codely/` — CodelyCli Provider

| 文件 | 导出 | 说明 |
|------|------|------|
| `codely-provider.ts` | `CodelyProvider` (implements `IAgentProvider`) | 主入口，实现全部接口方法 |
| `acp-transport.ts` | `AcpTransport` | ACP 协议传输层：JSON-RPC over stdio，管理持久化进程 |
| `session-manager.ts` | `CodelySessionManager` | session 管理：`--resume-session`、auto-saves 目录 |
| `event-parser.ts` | `parseAcpEvent(raw: unknown): AgentEvent` | ACP 事件 → AgentEvent 转换 |

### `backend/opencode/` — OpenCode Provider

| 文件 | 导出 | 说明 |
|------|------|------|
| `opencode-provider.ts` | `OpenCodeProvider` (implements `IAgentProvider`) | 主入口，实现全部接口方法 |
| `session-runner.ts` | `SessionRunner` | SessionV2 API + 会话生命周期管理 |
| `event-source.ts` | `EventSource` | SQLite 事件源 + event sourcing |
| `tool-schema.ts` | `adaptToolSchema(tools: unknown): McpTool[]` | OpenCode tool schema → MCP tool 适配 |

### 新增 Backend 契约

新增 Backend（如 Claude Code）时需满足：

1. 在 `backend/` 下新建 `<name>/` 子目录
2. 导出一个实现 `IAgentProvider` 的类
3. 实现 session 管理（create/resume/stop）
4. 实现事件转换（Backend 原始事件 → `AgentEvent`）
5. 在启动流程中注册到 `ProviderRegistry`

---

## 共享层 (`types/` + `utils/`)

### `types/config.ts`

```typescript
interface GatewayConfig {
  port: number
  host: string
  providers: ProviderConfig[]
  defaultProvider: string
  skillsDir: string
  commandsDir: string
  logDir: string
}

interface ProviderConfig {
  name: string
  type: 'codely' | 'opencode'
  options: Record<string, unknown>
}
```

### `types/session.ts`

```typescript
// Session 类型定义见 core/infra/session-store.ts 的 Session interface
// ProviderSession 类型定义见 provider/types.ts 的 ProviderSession interface
```

### `types/common.ts`

```typescript
interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
}

interface ChannelRenderResult {
  format: 'text' | 'card' | 'markdown'
  content: string | Record<string, unknown>
}
```

### `utils/config-loader.ts`

```typescript
/** 加载配置文件并展开 ${ENV_VAR} 占位符 */
function loadConfig(configPath: string): Promise<GatewayConfig>
```

### `utils/fs.ts`

```typescript
/** 确保目录存在 */
function ensureDir(path: string): Promise<void>

/** 原子写入文件 (temp→rename) */
function atomicWrite(path: string, content: string): Promise<void>
```

### `utils/process.ts`

```typescript
/** Spawn 子进程并返回可控句柄 */
function spawnProcess(cmd: string, args: string[], options?: SpawnOptions): ManagedProcess

interface ManagedProcess {
  pid: number
  kill(signal?: string): Promise<void>
  onExit(handler: (code: number | null) => void): void
}
```
