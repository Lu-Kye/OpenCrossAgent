import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, readFileSync, existsSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ensureDir, atomicWrite, pathExists } from './fs.js'

const TMP_DIR = join(tmpdir(), 'oca-test-shared-fs')

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe('ensureDir', () => {
  it('creates nested directories', async () => {
    const dir = join(TMP_DIR, 'a', 'b', 'c')
    await ensureDir(dir)
    expect(existsSync(dir)).toBe(true)
  })

  it('does not throw if directory already exists', async () => {
    const dir = join(TMP_DIR, 'existing')
    await ensureDir(dir)
    await expect(ensureDir(dir)).resolves.not.toThrow()
    expect(existsSync(dir)).toBe(true)
  })
})

describe('atomicWrite', () => {
  it('writes content correctly', async () => {
    const filePath = join(TMP_DIR, 'test.txt')
    await atomicWrite(filePath, 'hello world')
    expect(readFileSync(filePath, 'utf-8')).toBe('hello world')
  })

  it('creates parent directory if missing', async () => {
    const filePath = join(TMP_DIR, 'nested', 'dir', 'file.txt')
    await atomicWrite(filePath, 'content')
    expect(readFileSync(filePath, 'utf-8')).toBe('content')
  })

  it('does not leave temp file after write', async () => {
    const filePath = join(TMP_DIR, 'test.txt')
    await atomicWrite(filePath, 'data')
    expect(existsSync(filePath + '.tmp')).toBe(false)
    expect(existsSync(filePath)).toBe(true)
  })

  it('overwrites existing file', async () => {
    const filePath = join(TMP_DIR, 'overwrite.txt')
    await atomicWrite(filePath, 'old content')
    await atomicWrite(filePath, 'new content')
    expect(readFileSync(filePath, 'utf-8')).toBe('new content')
  })
})

describe('pathExists', () => {
  it('returns true for existing file', async () => {
    const filePath = join(TMP_DIR, 'exists.txt')
    await atomicWrite(filePath, 'data')
    expect(await pathExists(filePath)).toBe(true)
  })

  it('returns false for non-existent file', async () => {
    expect(await pathExists(join(TMP_DIR, 'nope.txt'))).toBe(false)
  })

  it('returns true for existing directory', async () => {
    await ensureDir(TMP_DIR)
    expect(await pathExists(TMP_DIR)).toBe(true)
  })
})
