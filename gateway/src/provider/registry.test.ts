import { describe, it, expect } from 'vitest'
import { ProviderRegistry } from './registry.js'
import type { IAgentProvider, HealthStatus, DispatchOptions, CreateProviderSessionParams, ProviderSession, ModelInfo, AgentEvent, AgentEventStream } from './types.js'

/** StubProvider — 可控健康状态的测试用 Provider */
class StubProvider implements IAgentProvider {
  constructor(
    readonly name: string,
    private healthy: boolean,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    return this.healthy
      ? { available: true }
      : { available: false, reason: `${this.name} not available` }
  }

  async *dispatch(_prompt: string, _options: DispatchOptions): AgentEventStream {
    yield { type: 'text', content: `stub response from ${this.name}` }
    yield { type: 'done' }
  }

  async createSession(_params: CreateProviderSessionParams): Promise<ProviderSession> {
    return { id: `stub-${this.name}`, model: 'stub-model', createdAt: Date.now() }
  }

  async resumeSession(sessionId: string): Promise<ProviderSession> {
    return { id: sessionId, model: 'stub-model', createdAt: Date.now() }
  }

  async stopSession(_sessionId: string): Promise<void> {}

  async listModels(): Promise<ModelInfo[]> {
    return [{ id: 'stub-model', name: 'Stub Model', contextWindow: 4096, maxOutput: 2048 }]
  }

  async dispose(): Promise<void> {}
}

describe('ProviderRegistry', () => {
  it('register + get + list', () => {
    const registry = new ProviderRegistry()
    const provider = new StubProvider('test', true)
    registry.register('test', provider)

    expect(registry.get('test')).toBe(provider)
    expect(registry.list()).toHaveLength(1)
    expect(registry.list()[0].name).toBe('test')
  })

  it('resolve with no config returns first registered', () => {
    const registry = new ProviderRegistry()
    const a = new StubProvider('a', true)
    const b = new StubProvider('b', true)
    registry.register('a', a)
    registry.register('b', b)

    expect(registry.resolve({})).toBe(a)
  })

  it('resolve with explicit provider name', () => {
    const registry = new ProviderRegistry()
    const a = new StubProvider('a', true)
    const b = new StubProvider('b', true)
    registry.register('a', a)
    registry.register('b', b)

    expect(registry.resolve({ provider: 'b' })).toBe(b)
  })

  it('register duplicate name throws', () => {
    const registry = new ProviderRegistry()
    registry.register('dup', new StubProvider('dup', true))

    expect(() => registry.register('dup', new StubProvider('dup', false))).toThrow(
      'Provider already registered: dup',
    )
  })

  it('get non-existent throws', () => {
    const registry = new ProviderRegistry()

    expect(() => registry.get('nope')).toThrow('Provider not found: nope')
  })

  it('resolve with no providers throws', () => {
    const registry = new ProviderRegistry()

    expect(() => registry.resolve({})).toThrow('No providers registered')
  })

  it('checkAllHealth returns status for all providers', async () => {
    const registry = new ProviderRegistry()
    registry.register('a', new StubProvider('a', true))
    registry.register('b', new StubProvider('b', false))

    const results = await registry.checkAllHealth()
    expect(results).toHaveLength(2)

    const aResult = results.find((r) => r.name === 'a')
    expect(aResult?.status.available).toBe(true)

    const bResult = results.find((r) => r.name === 'b')
    expect(bResult?.status.available).toBe(false)
    expect(bResult?.status.reason).toBe('b not available')
  })

  it('checkAllHealth on empty registry returns empty array', async () => {
    const registry = new ProviderRegistry()
    const results = await registry.checkAllHealth()
    expect(results).toHaveLength(0)
  })

  it('resolveAvailable returns first healthy provider', async () => {
    const registry = new ProviderRegistry()
    registry.register('a', new StubProvider('a', false))
    registry.register('b', new StubProvider('b', true))
    registry.register('c', new StubProvider('c', true))

    const provider = await registry.resolveAvailable()
    expect(provider.name).toBe('b')
  })

  it('resolveAvailable returns first provider when all healthy', async () => {
    const registry = new ProviderRegistry()
    registry.register('a', new StubProvider('a', true))
    registry.register('b', new StubProvider('b', true))

    const provider = await registry.resolveAvailable()
    expect(provider.name).toBe('a')
  })

  it('resolveAvailable throws when no provider is available', async () => {
    const registry = new ProviderRegistry()
    registry.register('a', new StubProvider('a', false))
    registry.register('b', new StubProvider('b', false))

    await expect(registry.resolveAvailable()).rejects.toThrow(/no available agent provider/i)
  })

  it('resolveAvailable throws with all reasons when none available', async () => {
    const registry = new ProviderRegistry()
    registry.register('a', new StubProvider('a', false))
    registry.register('b', new StubProvider('b', false))

    try {
      await registry.resolveAvailable()
      expect.fail('should have thrown')
    } catch (err) {
      const msg = String(err)
      expect(msg).toContain('a not available')
      expect(msg).toContain('b not available')
    }
  })

  it('resolveAvailable throws when registry is empty', async () => {
    const registry = new ProviderRegistry()

    await expect(registry.resolveAvailable()).rejects.toThrow(/no available agent provider/i)
  })
})
