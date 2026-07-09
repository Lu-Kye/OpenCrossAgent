/**
 * Session 相关共享类型
 *
 * Session 是 gateway 层面的会话概念，关联 channel + provider session。
 * ProviderSession 定义在 provider/types.ts 中，这里 re-export 方便统一引用。
 */

export type { ProviderSession } from '../provider/types.js'

export interface Session {
  id: string
  name: string
  workspaceDir: string
  channelType: 'cli' | 'feishu'
  providerSessionId?: string
  createdAt: number
  updatedAt: number
}

export interface SessionStoreData {
  version: 1
  activeSessionName: string | null
  sessions: Record<string, Session>
}
