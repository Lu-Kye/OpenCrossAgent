/**
 * Gateway 核心服务 — HTTP + WS 路由 + 消息分发
 *
 * 参考 teamcodelyclaw 的 gateway.ts 设计，
 * 但将 agent 调用抽象为 IAgentProvider 接口。
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { SessionEntry, AgentEvent } from "@opencross/shared";
import { getSessionStore } from "./session-store.js";
import { getSessionQueue } from "./session-queue.js";
import { ProviderRegistry } from "./provider/registry.js";
import type { IAgentProvider, DispatchOptions } from "./provider/types.js";
import type { IChannel, GatewayConfig } from "./channel/types.js";
import { createTagLogger } from "./logger.js";

const log = createTagLogger("gateway");

export class Gateway {
  private registry: ProviderRegistry;
  private channels: IChannel[] = [];
  private config: GatewayConfig;
  private httpServer: ReturnType<typeof createServer>;
  private wss?: WebSocketServer;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.registry = new ProviderRegistry();
    this.httpServer = createServer((req, res) => this.handleHttp(req, res));
  }

  // ── Provider 管理 ──

  registerProvider(provider: IAgentProvider): void {
    this.registry.register(provider);
    log.info(`Registered provider: ${provider.name}`);
  }

  getProviderRegistry(): ProviderRegistry {
    return this.registry;
  }

  // ── Channel 管理 ──

  registerChannel(channel: IChannel): void {
    this.channels.push(channel);
    log.info(`Registered channel: ${channel.channelType}`);
  }

  // ── 生命周期 ──

  async start(): Promise<void> {
    const { port, host } = this.config;
    this.httpServer.listen(port, host, () => {
      log.info(`Gateway listening on http://${host}:${port}`);
    });

    this.wss = new WebSocketServer({ server: this.httpServer, path: "/ws/cli" });
    this.wss.on("connection", (ws: WebSocket) => {
      log.info("CLI WebSocket connected");
      this.handleWsConnection(ws);
    });
  }

  async stop(): Promise<void> {
    for (const channel of this.channels) {
      await channel.dispose();
    }
    await this.registry.disposeAll();
    this.wss?.close();
    this.httpServer.close();
    log.info("Gateway stopped");
  }

  // ── HTTP 路由 ──

  private handleHttp(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? "/";

    if (url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          providers: this.registry.list(),
          sessions: getSessionStore().list().length,
        })
      );
      return;
    }

    if (url === "/sessions" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getSessionStore().list()));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  // ── WS 路由 ──

  private handleWsConnection(ws: WebSocket): void {
    ws.on("message", async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        log.info(`WS message: ${msg.type}`);
        // TODO: route to channel based on message type
      } catch (err) {
        log.error(`WS message error: ${err}`);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => {
      log.info("CLI WebSocket disconnected");
    });
  }

  // ── 消息分发 ──

  async dispatch(
    sessionName: string,
    message: string,
    providerName?: string
  ): Promise<void> {
    const store = getSessionStore();
    const session = store.get(sessionName);
    if (!session) {
      throw new Error(`Session "${sessionName}" not found`);
    }

    const provider = this.registry.resolve(
      providerName ?? session.providerName ?? this.config.defaultProvider
    );

    const options: DispatchOptions = {
      sessionId: session.providerSessionId,
      model: session.model,
      workspaceDir: session.workspaceDir,
    };

    const queue = getSessionQueue();
    await queue.enqueue(sessionName, message, async () => {
      try {
        const gen = provider.dispatch(message, options);
        let result = await gen.next();
        while (!result.done) {
          // 事件流产出 — channel 消费
          // TODO: route to channel for rendering
          result = await gen.next();
        }
        // 保存 provider 返回的 sessionId
        if (result.value?.providerSessionId) {
          session.providerSessionId = result.value.providerSessionId;
          store.set(session);
        }
      } catch (err) {
        log.error(`Dispatch error: ${err}`);
      }
    });
  }
}
