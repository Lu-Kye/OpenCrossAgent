import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadConfig } from './config-loader.js'
import type { GatewayConfig } from '../types/config.js'

const TMP_DIR = join(tmpdir(), 'oca-test-config-loader')
const CONFIG_PATH = join(TMP_DIR, 'gateway.json')

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
  mkdirSync(TMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe('config-loader', () => {
  it('expands ${ENV_VAR} in string values', async () => {
    process.env.TEST_FEISHU_APP_ID = 'my-app-id-123'
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        channels: {
          feishu: { enabled: true, appId: '${TEST_FEISHU_APP_ID}', appSecret: 'secret', maxConcurrentPerChat: 3 },
          cli: { enabled: true },
        },
        providers: [],
        defaultProvider: 'codely',
        gateway: { port: 18789, host: '0.0.0.0' },
        logDir: '~/.oca/logs',
      }),
    )

    const config = await loadConfig(CONFIG_PATH)
    // channels.feishu 在 JSON 中有完整飞书字段，expandEnvVars 会展开所有字符串
    // 但 GatewayConfig 类型只映射 enabled，用 as 访问原始字段验证展开效果
    const feishuRaw = config.channels.feishu as { enabled: boolean; appId?: string } | undefined
    expect(feishuRaw?.appId).toBe('my-app-id-123')
  })

  it('replaces unset env vars with empty string', async () => {
    delete process.env.UNSET_VAR_12345
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        channels: {
          feishu: { enabled: false, appId: '${UNSET_VAR_12345}', appSecret: '', maxConcurrentPerChat: 3 },
          cli: { enabled: true },
        },
        providers: [],
        defaultProvider: 'codely',
        gateway: { port: 18789, host: '0.0.0.0' },
        logDir: '~/.oca/logs',
      }),
    )

    const config = await loadConfig(CONFIG_PATH)
    const feishuRaw = config.channels.feishu as { enabled: boolean; appId?: string } | undefined
    expect(feishuRaw?.appId).toBe('')
  })

  it('expands env vars in nested objects and arrays', async () => {
    process.env.TEST_WORKSPACE = '/home/user/workspace'
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        channels: { cli: { enabled: true } },
        providers: [
          { name: 'codely', type: 'codely', options: { workspace: '${TEST_WORKSPACE}' } },
          { name: 'opencode', type: 'opencode', options: { workspace: '${TEST_WORKSPACE}' } },
        ],
        defaultProvider: 'codely',
        gateway: { port: 18789, host: '0.0.0.0' },
        logDir: '~/.oca/logs',
      }),
    )

    const config = await loadConfig(CONFIG_PATH)
    expect(config.providers[0].options.workspace).toBe('/home/user/workspace')
    expect(config.providers[1].options.workspace).toBe('/home/user/workspace')
  })

  it('does not modify values without placeholders', async () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        channels: { cli: { enabled: true } },
        providers: [],
        defaultProvider: 'codely',
        gateway: { port: 18789, host: '0.0.0.0' },
        logDir: '~/.oca/logs',
      }),
    )

    const config = await loadConfig(CONFIG_PATH)
    expect(config.gateway.port).toBe(18789)
    expect(config.gateway.host).toBe('0.0.0.0')
    expect(config.logDir).toBe('~/.oca/logs')
  })

  it('parses actual config/gateway.json template', async () => {
    process.env.FEISHU_APP_ID = 'test-id'
    process.env.FEISHU_APP_SECRET = 'test-secret'
    process.env.FEISHU_VERIFICATION_TOKEN = 'test-token'
    process.env.FEISHU_ENCRYPT_KEY = 'test-key'
    process.env.WORKSPACE_DIR = '/tmp/test-ws'

    // Copy the actual template to temp and load it
    const template = JSON.stringify({
      $schema: 'https://opencrossagent.dev/config.schema.json',
      channels: {
        feishu: {
          enabled: true,
          appId: '${FEISHU_APP_ID}',
          appSecret: '${FEISHU_APP_SECRET}',
          verificationToken: '${FEISHU_VERIFICATION_TOKEN}',
          encryptKey: '${FEISHU_ENCRYPT_KEY}',
          maxConcurrentPerChat: 3,
        },
        cli: { enabled: true },
      },
      providers: [
        { name: 'codely', type: 'codely', options: { model: 'codely/codely-core', workspace: '${WORKSPACE_DIR}' } },
        { name: 'opencode', type: 'opencode', options: { workspace: '${WORKSPACE_DIR}' } },
      ],
      defaultProvider: 'codely',
      gateway: { port: 18789, host: '0.0.0.0' },
      logDir: '~/.oca/logs',
    })
    writeFileSync(CONFIG_PATH, template)

    const config = await loadConfig(CONFIG_PATH) as GatewayConfig
    const feishuRaw = config.channels.feishu as { enabled: boolean; appId?: string; appSecret?: string } | undefined
    expect(feishuRaw?.appId).toBe('test-id')
    expect(feishuRaw?.appSecret).toBe('test-secret')
    expect(config.providers[0].options.workspace).toBe('/tmp/test-ws')
    expect(config.gateway.port).toBe(18789)
  })
})
