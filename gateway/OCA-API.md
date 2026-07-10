# gateway/OCA-API — 模块接口契约

> 本文档定义 gateway 模块各层导出的公共接口、类型签名和调用方式。
> 跨模块共享类型（`AgentEvent`、`ChannelMessage`、`ChannelType`、`Session`、`ProviderSession`、`ModelInfo`、`HealthStatus`）见 [../../OCA-API.md](../../OCA-API.md)。
> 模块架构见 [OCA-ARCH.md](./OCA-ARCH.md)，功能清单见 [OCA-FEATURE.md](./OCA-FEATURE.md)，模块规则见 [OCA-RULE.md](./OCA-RULE.md)。

## Channel Layer (`channel/`)

### `channel/types.ts`

两个核心接口，所有 channel 实现必须实现（thin WS relay，不含渲染逻辑）：

```typescript
/** 消息接收者 — 接收前端 client 的 WebSocket 连接，relay 消息 */
interface IChannel {
  readonly channelType: ChannelType
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
```

> `ChannelType`、`ChannelMessage`、`AgentEvent` 为跨模块共享类型，定义见 [../../OCA-API.md](../../OCA-API.md) §跨模块共享类型。

### CLI Channel (`channel/cli/`)

- `cli-ws-server.ts` — localhost WebSocket 服务器，监听 `/ws/cli` 路径
- `cli-channel.ts` — 实现 `IChannel`，接收 `user_input` / `slash_command`，回传 `agent_event` 流

### Feishu Channel (`channel/feishu/`)

- `feishu-channel.ts` — Thin WebSocket handler（监听 `/ws/feishu`），与 `cli-channel.ts` 类似的 relay。不包含飞书 API 对接、卡片渲染逻辑 — 这些在 `clients/feishu/` 中。

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

#### `orchestrator/dispatcher-orchestrator.ts`

```typescript
class DispatcherOrchestrator {
  /** 调度引擎: 接收用户输入 → resolve provider → 启动 dispatch pipeline */
  execute(
    prompt: string,
    sessionId: string,
    options?: DispatcherOptions
  ): AsyncGenerator<AgentEvent>
}

interface DispatcherOptions {
  skillNames?: string[]
  maxTokens?: number
  providerName?: string
}
```

#### `orchestrator/dispatch-pipeline.ts`

```typescript
class DispatchPipeline {
  /**
   * 调度管道:
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
interface SessionStoreData {
  version: 1
  activeSessionName: string | null
  sessions: Record<string, Session>
}

class SessionStore extends JsonFileStore<SessionStoreData> {
  createSession(params: CreateSessionParams): Promise<Session>
  getSession(name: string): Promise<Session | null>
  renameSession(oldName: string, newName: string): Promise<Session>
  deleteSession(name: string): Promise<void>
  listSessions(): Promise<Session[]>
  setActiveSession(name: string | null): Promise<void>
  getActiveSession(): Promise<Session | null>
  protected getDefault(): SessionStoreData
}

interface CreateSessionParams {
  name: string
  workspaceDir: string
  channelType: 'cli' | 'feishu'
}

// 单例
function getSessionStore(): SessionStore
function setSessionStore(store: SessionStore): void
```

> `Session` 类型为跨模块共享类型，定义见 [../../OCA-API.md](../../OCA-API.md) §跨模块共享类型。

#### `infra/session-queue.ts`

```typescript
const MAX_QUEUE_SIZE = 10

interface QueueEntry {
  id: string
  type: 'dispatch' | 'command'
  payload: unknown
  createdAt: number
}

interface EnqueueResult {
  queued: boolean
  position: number
  queueSize: number
}

class SessionQueue {
  /** Session 级消息队列: 串行调度，最多 10 条排队 */
  enqueue(sessionId: string, task: QueueEntry): EnqueueResult
  dequeue(sessionId: string): QueueEntry | null
  completeDispatch(sessionId: string): void  // 标记完成，触发下一个
  cancel(sessionId: string, taskId: string): boolean
  cancelAll(sessionId: string): void
  forceClearSession(sessionId: string): void
  hasActiveDispatch(sessionId: string): boolean
  getQueueSize(sessionId: string): number
}

// 单例
function getSessionQueue(): SessionQueue
```

#### `infra/json-file-store.ts`

```typescript
/** JSON 文件持久化基类: 原子写入 (temp→rename) */
abstract class JsonFileStore<T> {
  constructor(filePath: string)
  load(): Promise<T>
  save(data: T): Promise<void>  // 原子写入: 写临时文件 → rename
  update(patch: Partial<T>): Promise<T>
  exists(): boolean
  getFilePath(): string
  invalidate(): void  // 清除内存缓存，强制下次 load 从磁盘读取
  protected abstract getDefault(): T  // 子类提供默认值（文件不存在时）
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
  schedule(cron: string, action: () => Promise<void>): string  // returns task ID
  cancel(taskId: string): boolean
  listTasks(): ScheduledTask[]
  start(): void  // 开始定时检查 (30s interval)
  stop(): void   // 停止
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

  /** 检测 Backend 是否可用（底层 agent 已安装且可执行） */
  checkHealth(): Promise<HealthStatus>

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

/** 可用模型信息 */
interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
}
```

> `HealthStatus`、`AgentEvent`、`ProviderSession` 为跨模块共享类型，定义见 [../../OCA-API.md](../../OCA-API.md) §跨模块共享类型。

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

  /** 检测所有已注册 Backend 的可用性，返回健康状态列表 */
  checkAllHealth(): Promise<{ name: string; status: HealthStatus }[]>

  /** 获取第一个可用的 Backend，没有则抛错 */
  resolveAvailable(): Promise<IAgentProvider>
}
```

### `provider/events.ts` — AgentEvent 类型

> `AgentEvent` 及 `AgentEventStream` 为跨模块共享类型，定义见 [../../OCA-API.md](../../OCA-API.md) §跨模块共享类型。

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

## Gateway 专属类型 (`types/`)

### `types/config.ts`

```typescript
interface GatewayConfig {
  $schema?: string
  channels: ChannelsConfig
  providers: ProviderConfig[]
  defaultProvider: string
  gateway: {
    port: number
    host: string
  }
  logDir: string
}

interface ChannelsConfig {
  /** gateway 只需知道是否启用 feishu WS 端点，飞书凭证由 oca-feishu 读取 */
  feishu?: { enabled: boolean }
  cli: { enabled: boolean }
}

interface ProviderConfig {
  name: string
  /** backend 类型标识，由各 backend 自行定义，gateway 不限制枚举 */
  type: string
  options: Record<string, unknown>
}
```

### `types/session.ts`

```typescript
// Session 类型定义见 ../../OCA-API.md §跨模块共享类型
// ProviderSession 类型定义见 ../../OCA-API.md §跨模块共享类型
```

### `types/common.ts`

```typescript
// ChannelType 和 ChannelMessage 为跨模块共享类型，定义见 ../../OCA-API.md §跨模块共享类型
// 注意: ChannelRenderResult 已移至各 client 自行定义
```

---

## Gateway 专属工具 (`utils/`)

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

---

## Gateway 引用 shared/ 代码

Gateway 代码直接从 `shared/` import（无中间 re-export 层）：
- `import { ensureDir, atomicWrite, pathExists } from '../../../../shared/fs.js'`
- `import { createTagLogger, initLogger } from '../../../../shared/logger.js'`

> `shared/` 代码签名见 [../../OCA-API.md](../../OCA-API.md) §跨 package 共享代码。
