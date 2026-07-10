# OCA-API — 跨模块接口契约

> 本文档定义 OpenCrossAgent 跨模块共享的类型签名和跨 package 共享代码接口。
> Gateway 专属接口签名见 [gateway/OCA-API.md](./gateway/OCA-API.md)。
> 架构设计见 [OCA-ARCH.md](./OCA-ARCH.md)，功能清单见 [OCA-FEATURE.md](./OCA-FEATURE.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 跨模块共享类型

> 以下类型被多个 package 使用（gateway 产出、clients 消费），在此统一定义以确保一致性。

### AgentEvent — Agent 执行事件流

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
  | { type: 'progress'; message: string }
  | { type: 'idle_warning'; message: string }
  | { type: 'agent_start'; sessionId: string }
  | { type: 'agent_finish'; summary?: string }
  | { type: 'usage_update'; inputTokens: number; outputTokens: number }
  | { type: 'plan'; steps: string[] }
  | { type: 'tool_streaming'; toolName: string; chunk: string }

/** 事件流类型 */
type AgentEventStream = AsyncGenerator<AgentEvent>
```

- **产出方**: Gateway（Provider Layer 产生 → Channel Layer 转发给 Client）
- **消费方**: Clients（oca-cli 渲染为 TUI、oca-feishu 渲染为飞书卡片）
- **定义位置**: `gateway/src/provider/events.ts`

### ChannelType — 渠道类型

```typescript
type ChannelType = 'cli' | 'feishu'
```

- **定义位置**: `gateway/src/types/common.ts`

### ChannelMessage — 前端用户消息

```typescript
interface ChannelMessage {
  sessionId: string
  type: 'user_input' | 'slash_command'
  content: string
  args?: string[]
}
```

- **产出方**: Clients（通过 WebSocket 发送给 Gateway）
- **消费方**: Gateway（Channel Layer 接收 → Router 路由）
- **定义位置**: `gateway/src/types/common.ts`、`gateway/src/channel/types.ts`

### Session — 会话信息

```typescript
interface Session {
  id: string
  name: string
  workspaceDir: string
  channelType: 'cli' | 'feishu'
  providerSessionId?: string  // 缓存从 Backend 返回的 session ID
  createdAt: number
  updatedAt: number
}
```

- **定义位置**: `gateway/src/core/infra/session-store.ts`

### ProviderSession — Provider 会话

```typescript
interface ProviderSession {
  id: string          // providerSessionId，缓存到 SessionStore
  model: string
  createdAt: number
}
```

- **定义位置**: `gateway/src/provider/types.ts`

### HealthStatus — Backend 健康状态

```typescript
interface HealthStatus {
  available: boolean
  reason?: string  // 不可用时说明原因（如 "codely-cli not found in PATH"）
}
```

- **定义位置**: `gateway/src/provider/types.ts`

### ModelInfo — 模型信息

> `ModelInfo` 为 gateway 专属类型（仅 `IAgentProvider.listModels()` 返回），定义见 [gateway/OCA-API.md](./gateway/OCA-API.md) §Provider Layer。

---

## 跨 package 共享代码 (`shared/`)

> `shared/` 不是独立 package，通过相对路径 import。构建时被各 package 的 bundler 打包进各自的 dist 中。

### `shared/fs.ts`

```typescript
/** 确保目录存在（递归创建） */
function ensureDir(path: string): Promise<void>

/** 原子写入文件 (temp→rename) */
function atomicWrite(path: string, content: string): Promise<void>

/** 检查文件是否存在 */
function pathExists(path: string): Promise<boolean>
```

### `shared/logger.ts`

```typescript
interface TagLogger {
  info(msg: string, ...args: unknown[]): void
  warn(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
  debug(msg: string, ...args: unknown[]): void
}

/** 初始化日志目录 */
function initLogger(dir: string): void

/** 设置日志文件后缀（用于临时实例，如 -18790） */
function setLogSuffix(suffix: string): void

/** 关闭所有 logger */
function closeLogger(): void

/** 创建带 tag 的 logger，日志输出到 console + ~/.oca/logs/<tag>.log */
function createTagLogger(tag: string): TagLogger
```
