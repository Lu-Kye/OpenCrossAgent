/**
 * AgentEvent — 统一的 agent 事件流类型
 *
 * 所有 agent provider (codely-cli, direct LLM, CLI agent) 产出的事件
 * 统一转换为此类型，供 channel 层消费。
 */

// ── 基础事件 ──

export interface ThinkingEvent {
  type: "thinking";
  content: string;
  /** delta = 增量流式输出 */
  delta?: boolean;
}

export interface MessageEvent {
  type: "message";
  role: "user" | "assistant";
  content: string;
  delta?: boolean;
  /** thinking model 的推理内容 */
  reasoningContent?: string;
}

// ── 工具事件 ──

export interface ToolUseEvent {
  type: "tool_use";
  toolName: string;
  toolId: string;
  parameters: Record<string, unknown>;
  /** 工具调用的可读显示名称 */
  display?: string;
}

export interface ToolStreamingEvent {
  type: "tool_streaming";
  toolCallId: string;
  text: string;
}

export interface ToolResultEvent {
  type: "tool_result";
  toolId: string;
  status: "success" | "error";
  output: string;
  error?: string;
}

// ── Agent 生命周期 ──

export interface AgentStartEvent {
  type: "agent_start";
  agentName: string;
  /** subagent 的描述/角色 */
  description?: string;
}

export interface AgentThinkEvent {
  type: "agent_think";
  thoughtNumber: number;
  totalThoughts: number;
  content: string;
}

export interface AgentFinishEvent {
  type: "agent_finish";
  terminationReason?: string;
  durationMs?: number;
}

// ── 进度/状态 ──

export interface ProgressEvent {
  type: "progress";
  phase: "starting" | "thinking" | "tool_use" | "generating" | "idle";
  message?: string;
  elapsedMs?: number;
}

export interface IdleWarningEvent {
  type: "idle_warning";
  message: string;
}

// ── 计划/用量 ──

export interface PlanEvent {
  type: "plan";
  entries: Array<{
    content: string;
    priority: string;
    status: "pending" | "in_progress" | "completed";
  }>;
}

export interface UsageUpdateEvent {
  type: "usage_update";
  usedTokens: number;
  contextTokenLimit: number;
  cost?: number;
}

// ── 结果 ──

export interface ResultEvent {
  type: "result";
  status: "success" | "error";
  stats?: {
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    toolCalls?: number;
  };
}

export interface ErrorEvent {
  type: "error";
  message: string;
  code?: string;
}

// ── 编排层事件 (orchestrator 产出) ──

export interface StepStartEvent {
  type: "step_start";
  stepId: string;
  stepName: string;
  description?: string;
}

export interface StepDoneEvent {
  type: "step_done";
  stepId: string;
  success: boolean;
  output?: string;
  error?: string;
}

export interface SkillActivatedEvent {
  type: "skill_activated";
  skillName: string;
}

export interface AgentDoneEvent {
  type: "agent_done";
  success: boolean;
  summary?: string;
}

export interface AgentErrorEvent {
  type: "agent_error";
  message: string;
  recoverable?: boolean;
}

export interface RetryAttemptEvent {
  type: "retry_attempt";
  attempt: number;
  reason: string;
  backoffMs?: number;
}

// ── 联合类型 ──

export type AgentEvent =
  | ThinkingEvent
  | MessageEvent
  | ToolUseEvent
  | ToolStreamingEvent
  | ToolResultEvent
  | AgentStartEvent
  | AgentThinkEvent
  | AgentFinishEvent
  | ProgressEvent
  | IdleWarningEvent
  | PlanEvent
  | UsageUpdateEvent
  | ResultEvent
  | ErrorEvent
  | StepStartEvent
  | StepDoneEvent
  | SkillActivatedEvent
  | AgentDoneEvent
  | AgentErrorEvent
  | RetryAttemptEvent;

// ── 初始化事件 (dispatch 开始时) ──

export interface InitEvent {
  type: "init";
  sessionId: string;
  model: string;
  provider: string;
}

/** 包含 init 的完整事件联合 */
export type DispatchEvent = InitEvent | AgentEvent;
