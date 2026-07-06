/**
 * 文件日志工具
 */

import { createWriteStream, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const LOG_DIR = join(homedir(), ".opencross", "logs");

const TAG_DESTINATION: Record<string, string> = {
  gateway: "gateway.log",
  session: "gateway.log",
  "cli-channel": "cli-channel.log",
  "feishu-channel": "feishu.log",
  provider: "provider.log",
  orchestrator: "orchestrator.log",
  mcp: "mcp.log",
};

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function createTagLogger(tag: string) {
  const dest = TAG_DESTINATION[tag] ?? "gateway.log";
  const logPath = join(LOG_DIR, dest);

  return {
    info(message: string, ...args: unknown[]): void {
      ensureLogDir();
      const stream = createWriteStream(logPath, { flags: "a" });
      const ts = new Date().toISOString();
      stream.write(`[${ts}] [${tag}] INFO: ${message} ${args.length ? JSON.stringify(args) : ""}\n`);
      stream.end();
    },
    warn(message: string, ...args: unknown[]): void {
      ensureLogDir();
      const stream = createWriteStream(logPath, { flags: "a" });
      const ts = new Date().toISOString();
      stream.write(`[${ts}] [${tag}] WARN: ${message} ${args.length ? JSON.stringify(args) : ""}\n`);
      stream.end();
    },
    error(message: string, ...args: unknown[]): void {
      ensureLogDir();
      const stream = createWriteStream(logPath, { flags: "a" });
      const ts = new Date().toISOString();
      stream.write(`[${ts}] [${tag}] ERROR: ${message} ${args.length ? JSON.stringify(args) : ""}\n`);
      stream.end();
    },
  };
}

export type TagLogger = ReturnType<typeof createTagLogger>;
