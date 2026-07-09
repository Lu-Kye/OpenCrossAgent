import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { ensureDir, atomicWrite } from '../../../../shared/fs.js'

/**
 * JsonFileStore — 泛型原子 JSON 持久化基类
 *
 * 提供原子写入（tmp→rename）、内存缓存、浅合并 update。
 * 被 SessionStore / Scheduler 等继承复用。
 */
export abstract class JsonFileStore<T> {
  protected filePath: string
  protected data: T | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  /** 加载数据（带内存缓存） */
  async load(): Promise<T> {
    if (this.data) return this.data
    if (!existsSync(this.filePath)) return this.getDefault()
    const raw = await readFile(this.filePath, 'utf-8')
    this.data = JSON.parse(raw) as T
    return this.data
  }

  /** 保存数据（原子写入 + 更新缓存） */
  async save(data: T): Promise<void> {
    this.data = data
    await ensureDir(dirname(this.filePath))
    await atomicWrite(this.filePath, JSON.stringify(data, null, 2))
  }

  /** 浅合并更新 */
  async update(patch: Partial<T>): Promise<T> {
    const current = await this.load()
    const merged = { ...current, ...patch }
    await this.save(merged)
    return merged
  }

  /** 文件是否已存在 */
  exists(): boolean {
    return existsSync(this.filePath)
  }

  /** 获取文件路径 */
  getFilePath(): string {
    return this.filePath
  }

  /** 清除内存缓存，强制下次 load 从磁盘读取 */
  invalidate(): void {
    this.data = null
  }

  /** 子类提供默认值（文件不存在时） */
  protected abstract getDefault(): T
}
