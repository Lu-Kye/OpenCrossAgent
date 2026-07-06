/**
 * Session 持久化存储
 *
 * 参考 teamcodelyclaw 的 SessionStore 设计，
 * 基于 JSON 文件持久化，支持 session 创建/删除/恢复。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { SessionEntry } from "@opencross/shared";
import { createTagLogger } from "./logger.js";

const log = createTagLogger("session");

const SESSIONS_FILE = join(homedir(), ".opencross", "sessions.json");

interface SessionStoreData {
  version: number;
  activeSessionName?: string;
  sessions: SessionEntry[];
}

export class SessionStore {
  private data: SessionStoreData = { version: 1, sessions: [] };

  load(): void {
    if (!existsSync(SESSIONS_FILE)) {
      this.data = { version: 1, sessions: [] };
      return;
    }
    try {
      const raw = readFileSync(SESSIONS_FILE, "utf-8");
      this.data = JSON.parse(raw);
      log.info(`Loaded ${this.data.sessions.length} sessions`);
    } catch (err) {
      log.error(`Failed to load sessions: ${err}`);
      this.data = { version: 1, sessions: [] };
    }
  }

  save(): void {
    try {
      const dir = dirname(SESSIONS_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(SESSIONS_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      log.error(`Failed to save sessions: ${err}`);
    }
  }

  get(name: string): SessionEntry | undefined {
    return this.data.sessions.find((s) => s.name === name);
  }

  set(entry: SessionEntry): void {
    const idx = this.data.sessions.findIndex((s) => s.name === entry.name);
    if (idx >= 0) {
      this.data.sessions[idx] = entry;
    } else {
      this.data.sessions.push(entry);
    }
    this.save();
  }

  delete(name: string): boolean {
    const idx = this.data.sessions.findIndex((s) => s.name === name);
    if (idx < 0) return false;
    this.data.sessions.splice(idx, 1);
    this.save();
    return true;
  }

  list(): SessionEntry[] {
    return [...this.data.sessions];
  }

  get activeName(): string | undefined {
    return this.data.activeSessionName;
  }

  setActiveName(name: string): void {
    this.data.activeSessionName = name;
    this.save();
  }
}

let store: SessionStore | undefined;

export function getSessionStore(): SessionStore {
  if (!store) {
    store = new SessionStore();
    store.load();
  }
  return store;
}
