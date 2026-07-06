/**
 * Session 相关类型
 */

export interface SessionEntry {
  /** 唯一标识名 */
  name: string;
  /** 显示标签 */
  label?: string;
  /** 工作目录 */
  workspaceDir: string;
  /** workspace 是否由用户显式设置 */
  workspaceExplicit?: boolean;
  /** agent provider 返回的 session 引用 (用于 resume) */
  providerSessionId?: string;
  /** 使用的 agent provider 名称 */
  providerName?: string;
  /** 模型名称 */
  model?: string;
  /** agent 执行模式 */
  agentMode?: AgentMode;
  /** 当前持有 session 锁的 channel 类型 */
  activeChannel?: ChannelType;
  /** 创建时间戳 */
  createdAt: number;
}

export type AgentMode = "direct" | "plan" | "enhance";

export type ChannelType = "cli" | "feishu";

export type WorkflowMode = "off" | "on";

export interface SessionRef {
  providerName: string;
  sessionId: string;
  workspaceDir: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  contextWindow: number;
  maxTokens: number;
}

export interface GoalState {
  description: string;
  progress: GoalProgressStatus;
  rawProgress?: string;
}

export type GoalProgressStatus =
  | "on_track"
  | "stagnant"
  | "completed"
  | "drifting"
  | "no_goal";

export interface SessionStatusInfo {
  goal: GoalState;
  providerName?: string;
  agentMode?: AgentMode;
  modelName?: string;
  workflowMode?: WorkflowMode;
}
