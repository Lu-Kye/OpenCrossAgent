/**
 * Agent Provider 抽象层 — OpenCrossAgent 的核心创新
 *
 * 统一接口，支持调度到不同的底层 AI agent 后端：
 * - codely-cli (通过 ACP 协议)
 * - Direct LLM API (OpenAI / Anthropic / Gemini)
 * - 通用 CLI agent (spawn 子进程)
 */

import type { AgentEvent, ModelInfo, SessionRef } from "@opencross/shared";

export interface ProviderCapabilities {
  /** 是否支持工具调用 */
  supportsTools: boolean;
  /** 是否支持 MCP 协议 */
  supportsMCP: boolean;
  /** 是否支持流式响应 */
  supportsStreaming: boolean;
  /** 是否支持会话续接 (resume) */
  supportsResume: boolean;
  /** 最大上下文窗口 (tokens) */
  maxContextWindow: number;
}

export interface DispatchOptions {
  /** provider 内部的 session ID (用于 resume) */
  sessionId?: string;
  /** 指定使用的模型 */
  model?: string;
  /** 工作目录 */
  workspaceDir: string;
  /** 审批模式 */
  approvalMode?: "yolo" | "default";
  /** MCP 服务器配置 */
  mcpServers?: McpServerConfig[];
  /** 附件图片路径列表 */
  imageFiles?: string[];
  /** 是否为临时 dispatch (不持久化 session) */
  temporary?: boolean;
}

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface DispatchResult {
  /** provider 返回的 session ID (用于后续 resume) */
  providerSessionId?: string;
  /** 最终输出文本 */
  output: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * Agent Provider 接口 — 所有 agent 后端实现此接口
 *
 * 核心方法 dispatch() 返回 AsyncGenerator<AgentEvent>，
 * 使调用方可以流式消费事件。
 */
export interface IAgentProvider {
  /** provider 名称 (唯一标识) */
  readonly name: string;
  /** provider 能力描述 */
  readonly capabilities: ProviderCapabilities;

  /**
   * 核心调度方法 — 发送 prompt 到 agent，返回事件流
   *
   * @param prompt 用户输入/构建后的提示词
   * @param options 调度选项
   * @returns AgentEvent 异步生成器
   */
  dispatch(
    prompt: string,
    options: DispatchOptions
  ): AsyncGenerator<AgentEvent, DispatchResult, void>;

  /**
   * 列出可用模型
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * 创建新 session
   */
  createSession(workspaceDir: string): Promise<SessionRef>;

  /**
   * 续接已有 session
   */
  resumeSession(ref: SessionRef): Promise<void>;

  /**
   * 终止正在运行的 dispatch
   */
  stopSession(sessionId: string): Promise<void>;

  /**
   * 清理资源
   */
  dispose(): Promise<void>;
}
