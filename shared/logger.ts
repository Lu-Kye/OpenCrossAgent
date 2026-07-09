import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ensureDir } from './fs.js'

/** Tag → 文件名映射（通用 tag，不含具体 backend 名称） */
const TAG_DESTINATION: Record<string, string> = {
  gateway: 'gateway.log',
  feishu: 'feishu.log',
  'cli-channel': 'cli-channel.log',
  backend: 'backend.log',
  agent: 'agent.log',
  mcp: 'mcp.log',
  'oca-cli': 'oca-cli.log',
  'oca-feishu': 'oca-feishu.log',
  installer: 'installer.log',
}

let logDir: string = ''
let logSuffix: string = ''

export interface TagLogger {
  info(msg: string, ...args: unknown[]): void
  warn(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
  debug(msg: string, ...args: unknown[]): void
}

/** 初始化日志目录 */
export function initLogger(dir: string): void {
  logDir = dir
  mkdirSync(logDir, { recursive: true })
}

/** 设置日志文件后缀（用于临时实例，如 -18790） */
export function setLogSuffix(suffix: string): void {
  logSuffix = suffix
}

/** 关闭所有 logger（当前实现为同步写入，无需特殊清理） */
export function closeLogger(): void {
  // 同步写入模式，无需关闭 stream
}

function formatTimestamp(): string {
  return new Date().toLocaleString('sv-SE') // ISO 8601 本地时区
}

function getLogFilePath(tag: string): string {
  const fileName = TAG_DESTINATION[tag] ?? `${tag}.log`
  // 在 .log 扩展名前插入后缀，如 gateway-18790.log
  const name = logSuffix
    ? fileName.replace(/\.log$/, `${logSuffix}.log`)
    : fileName
  return join(logDir, name)
}

function writeLog(tag: string, level: string, msg: string, args: unknown[]): void {
  const timestamp = formatTimestamp()
  const argsStr = args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''
  const line = `[${timestamp}] [${level}] ${msg}${argsStr}\n`

  // 同时输出到 console
  if (level === 'ERROR') {
    process.stderr.write(line)
  } else if (level === 'WARN') {
    process.stderr.write(line)
  } else {
    process.stdout.write(line)
  }

  // 写入文件
  if (logDir) {
    try {
      appendFileSync(getLogFilePath(tag), line)
    } catch {
      // 日志写入失败不应影响主流程
    }
  }
}

/**
 * 创建带 tag 的 logger。
 * 日志同时输出到 console 和 ~/.oca/logs/<tag>.log 文件。
 */
export function createTagLogger(tag: string): TagLogger {
  return {
    info: (msg: string, ...args: unknown[]) => writeLog(tag, 'INFO', msg, args),
    warn: (msg: string, ...args: unknown[]) => writeLog(tag, 'WARN', msg, args),
    error: (msg: string, ...args: unknown[]) => writeLog(tag, 'ERROR', msg, args),
    debug: (msg: string, ...args: unknown[]) => {
      if (process.env.OCA_DEBUG) writeLog(tag, 'DEBUG', msg, args)
    },
  }
}
