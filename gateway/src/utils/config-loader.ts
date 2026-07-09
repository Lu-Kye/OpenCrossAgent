import { readFile } from 'node:fs/promises'
import type { GatewayConfig } from '../types/config.js'

/**
 * 加载配置文件并展开 ${ENV_VAR} 占位符。
 *
 * 递归遍历所有字符串值，将 ${VAR_NAME} 替换为 process.env[VAR_NAME]。
 * 未设置的环境变量替换为空字符串。
 */
export async function loadConfig(configPath: string): Promise<GatewayConfig> {
  const raw = await readFile(configPath, 'utf-8')
  const parsed = JSON.parse(raw)
  return expandEnvVars(parsed) as GatewayConfig
}

function expandEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{(\w+)\}/g, (_, name: string) => process.env[name] ?? '')
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvVars)
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, expandEnvVars(v)]),
    )
  }
  return obj
}
