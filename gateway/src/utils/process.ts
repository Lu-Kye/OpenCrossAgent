import { spawn, type SpawnOptions } from 'node:child_process'

export interface ManagedProcess {
  pid: number
  kill(signal?: string): Promise<void>
  onExit(handler: (code: number | null) => void): void
}

/**
 * Spawn 子进程并返回可控句柄。
 * 封装 child_process.spawn，提供统一的 kill 和 onExit 接口。
 */
export function spawnProcess(
  cmd: string,
  args: string[],
  options?: SpawnOptions,
): ManagedProcess {
  const child = spawn(cmd, args, options)

  return {
    pid: child.pid ?? -1,
    kill: async (signal?: string) => {
      child.kill(signal ?? 'SIGTERM')
    },
    onExit: (handler: (code: number | null) => void) => {
      child.on('exit', handler)
    },
  }
}
