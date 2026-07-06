/**
 * CLI 客户端入口 — 连接 Gateway 的 WebSocket
 */

import WebSocket from "ws";
import { readFileSync } from "node:fs";

const DEFAULT_URL = "ws://127.0.0.1:18789/ws/cli";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const url = args.find((a) => a.startsWith("--gateway="))?.split("=")[1] ?? DEFAULT_URL;
  const prompt = args.find((a) => !a.startsWith("--"));

  const ws = new WebSocket(url);

  ws.on("open", () => {
    if (prompt) {
      ws.send(JSON.stringify({ type: "user_input", message: prompt }));
    } else {
      // TODO: interactive REPL mode
      process.stdout.write("OpenCrossAgent CLI — connected\n> ");
      process.stdin.on("data", (data) => {
        const message = data.toString().trim();
        if (message) {
          ws.send(JSON.stringify({ type: "user_input", message }));
        }
      });
    }
  });

  ws.on("message", (data: Buffer) => {
    const msg = JSON.parse(data.toString());
    switch (msg.type) {
      case "session_created":
        process.stdout.write(`Session: ${msg.name}\n`);
        break;
      case "agent_event":
        // TODO: render event
        break;
      case "dispatch_done":
        if (prompt) {
          ws.close();
          process.exit(msg.success ? 0 : 1);
        }
        process.stdout.write("> ");
        break;
      case "error":
        process.stderr.write(`Error: ${msg.message}\n`);
        break;
    }
  });

  ws.on("error", (err: Error) => {
    process.stderr.write(`Connection error: ${err.message}\n`);
    process.exit(1);
  });
}

main();
