import type { IAgentProvider, HealthStatus } from './types.js'

export interface ProviderHealthResult {
  name: string
  status: HealthStatus
}

/**
 * ProviderRegistry — Agent Backend 注册表
 *
 * 启动时注册所有 backend，运行时按配置 resolve。
 * 提供健康检测能力，gateway start 时必须至少有一个可用 backend。
 */
export class ProviderRegistry {
  private providers = new Map<string, IAgentProvider>()

  /** 注册 Backend 实现，重复注册抛错 */
  register(name: string, provider: IAgentProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider already registered: ${name}`)
    }
    this.providers.set(name, provider)
  }

  /** 按名称获取 Backend，不存在抛错 */
  get(name: string): IAgentProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider not found: ${name}`)
    }
    return provider
  }

  /** 按配置解析合适的 Backend */
  resolve(config: { provider?: string }): IAgentProvider {
    if (config.provider) {
      return this.get(config.provider)
    }
    const first = this.providers.values().next()
    if (first.done) {
      throw new Error('No providers registered')
    }
    return first.value
  }

  /** 列出所有已注册的 Backend */
  list(): { name: string; provider: IAgentProvider }[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({ name, provider }))
  }

  /** 并行检测所有已注册 Backend 的可用性 */
  async checkAllHealth(): Promise<ProviderHealthResult[]> {
    const entries = Array.from(this.providers.entries())
    const results = await Promise.all(
      entries.map(async ([name, provider]) => {
        const status = await provider.checkHealth()
        return { name, status }
      }),
    )
    return results
  }

  /** 获取第一个可用的 Backend，没有则抛错并附带所有不可用原因 */
  async resolveAvailable(): Promise<IAgentProvider> {
    const results = await this.checkAllHealth()
    for (const { name, status } of results) {
      if (status.available) {
        return this.get(name)
      }
    }
    const reasons = results
      .map((r) => `  - ${r.name}: ${r.status.reason ?? 'unknown'}`)
      .join('\n')
    throw new Error(
      `No available agent provider found. Install at least one backend agent.\n` +
        `Checked providers:\n${reasons}`,
    )
  }
}
