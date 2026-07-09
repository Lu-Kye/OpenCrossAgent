import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initLogger, createTagLogger, setLogSuffix, closeLogger } from './logger.js'

const TMP_DIR = join(tmpdir(), 'oca-test-shared-logger')

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
  initLogger(TMP_DIR)
  setLogSuffix('')
})

afterEach(() => {
  closeLogger()
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe('logger', () => {
  it('initLogger creates log directory', () => {
    expect(existsSync(TMP_DIR)).toBe(true)
  })

  it('createTagLogger writes to <tag>.log file', () => {
    const log = createTagLogger('gateway')
    log.info('test message 12345')
    const logFile = join(TMP_DIR, 'gateway.log')
    expect(existsSync(logFile)).toBe(true)
    const content = readFileSync(logFile, 'utf-8')
    expect(content).toContain('test message 12345')
    expect(content).toContain('[INFO]')
  })

  it('different tags write to different files', () => {
    const gatewayLog = createTagLogger('gateway')
    const feishuLog = createTagLogger('feishu')
    gatewayLog.info('gateway msg')
    feishuLog.info('feishu msg')

    const gatewayContent = readFileSync(join(TMP_DIR, 'gateway.log'), 'utf-8')
    const feishuContent = readFileSync(join(TMP_DIR, 'feishu.log'), 'utf-8')

    expect(gatewayContent).toContain('gateway msg')
    expect(gatewayContent).not.toContain('feishu msg')
    expect(feishuContent).toContain('feishu msg')
    expect(feishuContent).not.toContain('gateway msg')
  })

  it('warn level writes to file', () => {
    const log = createTagLogger('agent')
    log.warn('warning text')
    const content = readFileSync(join(TMP_DIR, 'agent.log'), 'utf-8')
    expect(content).toContain('warning text')
    expect(content).toContain('[WARN]')
  })

  it('error level writes to file', () => {
    const log = createTagLogger('mcp')
    log.error('error text')
    const content = readFileSync(join(TMP_DIR, 'mcp.log'), 'utf-8')
    expect(content).toContain('error text')
    expect(content).toContain('[ERROR]')
  })

  it('debug does not write when OCA_DEBUG is not set', () => {
    delete process.env.OCA_DEBUG
    const log = createTagLogger('backend')
    log.debug('debug text')
    const logFile = join(TMP_DIR, 'backend.log')
    if (existsSync(logFile)) {
      const content = readFileSync(logFile, 'utf-8')
      expect(content).not.toContain('debug text')
    }
  })

  it('debug writes when OCA_DEBUG is set', () => {
    process.env.OCA_DEBUG = '1'
    const log = createTagLogger('backend')
    log.debug('debug text')
    const content = readFileSync(join(TMP_DIR, 'backend.log'), 'utf-8')
    expect(content).toContain('debug text')
    expect(content).toContain('[DEBUG]')
    delete process.env.OCA_DEBUG
  })

  it('setLogSuffix appends suffix to filename', () => {
    setLogSuffix('-18790')
    const log = createTagLogger('gateway')
    log.info('suffix test')
    const logFile = join(TMP_DIR, 'gateway-18790.log')
    expect(existsSync(logFile)).toBe(true)
    const content = readFileSync(logFile, 'utf-8')
    expect(content).toContain('suffix test')
  })

  it('closeLogger does not throw', () => {
    expect(() => closeLogger()).not.toThrow()
  })

  it('unknown tag writes to <tag>.log', () => {
    const log = createTagLogger('custom-tag')
    log.info('custom message')
    const content = readFileSync(join(TMP_DIR, 'custom-tag.log'), 'utf-8')
    expect(content).toContain('custom message')
  })
})
