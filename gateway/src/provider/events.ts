/**
 * AgentEvent — 网关对外统一事件流类型
 *
 * 所有 Backend 的原始事件最终都转换为 AgentEvent，
 * 通过 Channel 层传给前端渲染。
 */

export type AgentEvent =
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

/** Agent 事件流类型 — dispatch 返回的异步生成器 */
export type AgentEventStream = AsyncGenerator<AgentEvent>
