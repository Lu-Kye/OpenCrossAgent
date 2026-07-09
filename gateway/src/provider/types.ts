import type { AgentEvent, AgentEventStream } from './events.js'

/** Agent Backend 抽象接口 — 所有 Backend 实现此接口 */
export interface IAgentProvider {
  readonly name: string

  /** 检测 Backend 是否可用（底层 agent 已安装且可执行） */
  checkHealth(): Promise<HealthStatus>

  /** 分发 prompt 到 Agent，返回事件流 */
  dispatch(prompt: string, options: DispatchOptions): AgentEventStream

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

/** Backend 健康检测结果 */
export interface HealthStatus {
  available: boolean
  /** 不可用时说明原因（如 "agent not found in PATH"） */
  reason?: string
}

export interface DispatchOptions {
  sessionId: string
  model?: string
  maxTokens?: number
  systemPrompt?: string
}

export interface CreateProviderSessionParams {
  workspaceDir: string
  model?: string
}

export interface ProviderSession {
  /** providerSessionId，缓存到 SessionStore */
  id: string
  model: string
  createdAt: number
}

export interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
}
