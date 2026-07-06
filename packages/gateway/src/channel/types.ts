/**
 * Channel 抽象层 — 前端通信接口
 *
 * 参考 teamcodelyclaw 的 IChannel 设计，
 * 支持 CLI 和 Feishu 等多种前端 channel。
 */

import type { AgentEvent, ChannelType } from "@opencross/shared";

/**
 * Channel 主接口 — 代表一种前端通信介质
 *
 * 实现类负责：
 * - 接收用户消息 (WebSocket / 飞书事件)
 * - 将消息路由到 gateway
 * - 将 AgentEvent 流渲染给用户
 */
export interface IChannel {
  readonly channelType: ChannelType;

  /**
   * 处理一次完整的 dispatch 生命周期
   * receive → dispatch → render → finalize
   */
  handleDispatch(
    sessionName: string,
    message: string,
    config: GatewayConfig
  ): Promise<void>;

  /** 终止指定 session 的 dispatch */
  stopDispatch(sessionName: string): void;

  /** 终止所有 dispatch */
  stopAllDispatches(): number;

  /** 清理资源 */
  dispose(): Promise<void>;
}

/**
 * Channel 渲染器 — channel 特定的输出渲染
 */
export interface IChannelRenderer {
  /** 显示思考中状态 */
  showThinking(sessionName: string): void;
  /** 追加流式文本 */
  appendText(text: string): void;
  /** 渲染工具调用 */
  showTool(toolName: string, display?: string): void;
  /** 渲染错误 */
  showError(message: string): void;
  /** 完成并发送最终响应 */
  finalize(success: boolean): Promise<void>;
}

/**
 * Channel 事件桥接 — 处理 agent 事件并驱动渲染器
 */
export interface IChannelBridge {
  /** 处理单个 AgentEvent */
  processEvent(event: AgentEvent): void;
  /** 获取累积的助手输出文本 */
  getAccumulatedText(): string;
  /** 当前 session 是否使用 agent 编排 */
  isAgenticMode(): boolean;
  /** 清理资源 */
  dispose(): void;
}

export interface GatewayConfig {
  port: number;
  host: string;
  workspaceDir: string;
  defaultProvider?: string;
  defaultModel?: string;
}
