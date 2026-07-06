/**
 * Session 消息队列 — 确保同一 session 串行 dispatch
 */

import type { SessionEntry } from "@opencross/shared";

interface QueueEntry {
  sessionName: string;
  message: string;
  callback: () => Promise<void>;
}

const MAX_QUEUE = 10;

export class SessionQueue {
  private queues = new Map<string, QueueEntry[]>();
  private active = new Set<string>();

  async enqueue(
    sessionName: string,
    message: string,
    callback: () => Promise<void>
  ): Promise<void> {
    if (this.active.has(sessionName)) {
      const queue = this.queues.get(sessionName) ?? [];
      if (queue.length >= MAX_QUEUE) {
        throw new Error(`Queue full for session "${sessionName}" (max ${MAX_QUEUE})`);
      }
      queue.push({ sessionName, message, callback });
      this.queues.set(sessionName, queue);
      return;
    }

    this.active.add(sessionName);
    try {
      await callback();
    } finally {
      this.active.delete(sessionName);
      this.dequeue(sessionName);
    }
  }

  private async dequeue(sessionName: string): Promise<void> {
    const queue = this.queues.get(sessionName);
    if (!queue || queue.length === 0) return;

    const entry = queue.shift()!;
    if (queue.length === 0) {
      this.queues.delete(sessionName);
    }

    this.active.add(sessionName);
    try {
      await entry.callback();
    } finally {
      this.active.delete(sessionName);
      this.dequeue(sessionName);
    }
  }

  isDispatching(sessionName: string): boolean {
    return this.active.has(sessionName);
  }

  getQueueSize(sessionName: string): number {
    return this.queues.get(sessionName)?.length ?? 0;
  }

  forceClear(sessionName: string): void {
    this.queues.delete(sessionName);
    this.active.delete(sessionName);
  }

  cancelAll(): void {
    this.queues.clear();
    this.active.clear();
  }
}

let queue: SessionQueue | undefined;

export function getSessionQueue(): SessionQueue {
  if (!queue) {
    queue = new SessionQueue();
  }
  return queue;
}
