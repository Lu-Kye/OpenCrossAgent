/**
 * 通用共享类型 — 被多层引用
 *
 * 注意: ChannelRenderResult 已移至各 client 自行定义，
 * 因为渲染逻辑在 client 侧（TUI / 飞书卡片各不同）。
 */

export type ChannelType = 'cli' | 'feishu'

export interface ChannelMessage {
  sessionId: string
  type: 'user_input' | 'slash_command'
  content: string
  args?: string[]
}
