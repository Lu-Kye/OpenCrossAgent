import { describe, it, expect } from 'vitest'
import type { AgentEvent } from './events.js'

describe('AgentEvent types', () => {
  it('text event', () => {
    const event: AgentEvent = { type: 'text', content: 'hello' }
    expect(event.type).toBe('text')
    expect(event.content).toBe('hello')
  })

  it('tool_call event', () => {
    const event: AgentEvent = { type: 'tool_call', toolName: 'read_file', input: { path: 'a.ts' } }
    expect(event.type).toBe('tool_call')
  })

  it('tool_result event', () => {
    const event: AgentEvent = { type: 'tool_result', toolName: 'read_file', output: 'content' }
    expect(event.type).toBe('tool_result')
  })

  it('thinking event', () => {
    const event: AgentEvent = { type: 'thinking', content: 'hmm' }
    expect(event.type).toBe('thinking')
  })

  it('error event with code', () => {
    const event: AgentEvent = { type: 'error', message: 'fail', code: 'E001' }
    expect(event.type).toBe('error')
  })

  it('session_created event', () => {
    const event: AgentEvent = { type: 'session_created', sessionId: 'abc-123' }
    expect(event.type).toBe('session_created')
  })

  it('done event with optional summary', () => {
    const event: AgentEvent = { type: 'done' }
    expect(event.type).toBe('done')
    const eventWithSummary: AgentEvent = { type: 'done', summary: 'completed' }
    expect(eventWithSummary.type).toBe('done')
  })

  it('progress event', () => {
    const event: AgentEvent = { type: 'progress', message: 'working...' }
    expect(event.type).toBe('progress')
  })

  it('idle_warning event', () => {
    const event: AgentEvent = { type: 'idle_warning', message: 'taking too long' }
    expect(event.type).toBe('idle_warning')
  })

  it('agent_start event', () => {
    const event: AgentEvent = { type: 'agent_start', sessionId: 's1' }
    expect(event.type).toBe('agent_start')
  })

  it('agent_finish event with optional summary', () => {
    const event: AgentEvent = { type: 'agent_finish' }
    expect(event.type).toBe('agent_finish')
  })

  it('usage_update event', () => {
    const event: AgentEvent = { type: 'usage_update', inputTokens: 100, outputTokens: 50 }
    expect(event.type).toBe('usage_update')
  })

  it('plan event', () => {
    const event: AgentEvent = { type: 'plan', steps: ['step1', 'step2'] }
    expect(event.type).toBe('plan')
  })

  it('tool_streaming event', () => {
    const event: AgentEvent = { type: 'tool_streaming', toolName: 'read_file', chunk: 'part' }
    expect(event.type).toBe('tool_streaming')
  })
})
