import { mkdir, writeFile, rename, access } from 'node:fs/promises'
import { dirname } from 'node:path'

/** 确保目录存在（递归创建） */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

/**
 * 原子写入文件：先写临时文件再 rename，避免写入过程中被其他进程读到半成品。
 * 如果目标目录不存在会自动创建。
 */
export async function atomicWrite(path: string, content: string): Promise<void> {
  const dir = dirname(path)
  await ensureDir(dir)
  const tmp = path + '.tmp'
  await writeFile(tmp, content, 'utf-8')
  await rename(tmp, path)
}

/** 检查文件是否存在 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
