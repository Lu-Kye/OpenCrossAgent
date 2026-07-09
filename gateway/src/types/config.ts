/**
 * GatewayConfig — 网关配置 schema
 *
 * 对应 config/gateway.json 模板，运行时由 config-loader 展开 ${ENV_VAR} 占位符。
 *
 * 注意: 飞书凭证 (appId/appSecret 等) 由 oca-feishu client 读取，
 * gateway 只需要知道是否启用 feishu WS 端点。
 */

export interface GatewayConfig {
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

export interface ChannelsConfig {
  /** gateway 只需知道是否启用 feishu WS 端点，飞书凭证由 oca-feishu 读取 */
  feishu?: { enabled: boolean }
  cli: {
    enabled: boolean
  }
}

export interface ProviderConfig {
  name: string
  /** backend 类型标识，由各 backend 自行定义（如 'codely'、'opencode'），gateway 不限制枚举 */
  type: string
  options: Record<string, unknown>
}
