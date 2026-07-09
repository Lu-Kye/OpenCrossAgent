import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { JsonFileStore } from './json-file-store.js'

const TMP_DIR = join(tmpdir(), 'oca-test-json-file-store')

interface TestData {
  name: string
  count: number
  nested: { value: string }
}

class TestStore extends JsonFileStore<TestData> {
  protected getDefault(): TestData {
    return { name: 'default', count: 0, nested: { value: '' } }
  }
}

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe('JsonFileStore', () => {
  it('load returns default when file does not exist', async () => {
    const store = new TestStore(join(TMP_DIR, 'data.json'))
    const data = await store.load()
    expect(data).toEqual({ name: 'default', count: 0, nested: { value: '' } })
  })

  it('save writes file and load returns saved data', async () => {
    const store = new TestStore(join(TMP_DIR, 'data.json'))
    await store.save({ name: 'test', count: 42, nested: { value: 'hello' } })
    const data = await store.load()
    expect(data.name).toBe('test')
    expect(data.count).toBe(42)
    expect(data.nested.value).toBe('hello')
  })

  it('save persists to disk (new instance reads same data)', async () => {
    const filePath = join(TMP_DIR, 'data.json')
    const store1 = new TestStore(filePath)
    await store1.save({ name: 'persisted', count: 99, nested: { value: 'world' } })

    // 新实例从磁盘加载
    const store2 = new TestStore(filePath)
    const data = await store2.load()
    expect(data.name).toBe('persisted')
    expect(data.count).toBe(99)
  })

  it('update merges patch into existing data', async () => {
    const store = new TestStore(join(TMP_DIR, 'data.json'))
    await store.save({ name: 'original', count: 1, nested: { value: 'a' } })
    const updated = await store.update({ count: 2 })
    expect(updated.name).toBe('original') // 未被覆盖
    expect(updated.count).toBe(2) // 已更新
  })

  it('exists returns false before save, true after', async () => {
    const store = new TestStore(join(TMP_DIR, 'data.json'))
    expect(store.exists()).toBe(false)
    await store.save({ name: 'test', count: 0, nested: { value: '' } })
    expect(store.exists()).toBe(true)
  })

  it('getFilePath returns the configured path', () => {
    const filePath = join(TMP_DIR, 'sub', 'data.json')
    const store = new TestStore(filePath)
    expect(store.getFilePath()).toBe(filePath)
  })

  it('save creates parent directories', async () => {
    const store = new TestStore(join(TMP_DIR, 'a', 'b', 'c', 'data.json'))
    await store.save({ name: 'deep', count: 0, nested: { value: '' } })
    expect(existsSync(join(TMP_DIR, 'a', 'b', 'c', 'data.json'))).toBe(true)
  })

  it('invalidate forces next load from disk', async () => {
    const store = new TestStore(join(TMP_DIR, 'data.json'))
    await store.save({ name: 'first', count: 1, nested: { value: '' } })

    // 直接修改磁盘文件（绕过 store）
    const raw = readFileSync(join(TMP_DIR, 'data.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    parsed.name = 'modified'
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(TMP_DIR, 'data.json'), JSON.stringify(parsed, null, 2))

    // 不 invalidate → 仍返回缓存
    const cached = await store.load()
    expect(cached.name).toBe('first')

    // invalidate → 从磁盘重新加载
    store.invalidate()
    const fresh = await store.load()
    expect(fresh.name).toBe('modified')
  })

  it('does not leave .tmp file after save', async () => {
    const filePath = join(TMP_DIR, 'data.json')
    const store = new TestStore(filePath)
    await store.save({ name: 'test', count: 0, nested: { value: '' } })
    expect(existsSync(filePath + '.tmp')).toBe(false)
  })
})
