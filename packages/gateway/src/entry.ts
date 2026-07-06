/**
 * Gateway 入口 — 从配置文件加载并启动
 */

import { Gateway } from "./gateway.js";
import type { GatewayConfig } from "./channel/types.js";
import { createTagLogger } from "./logger.js";

const log = createTagLogger("gateway");

function loadConfig(): GatewayConfig {
  const port = parseInt(process.env.OCA_PORT ?? "18789", 10);
  const host = process.env.OCA_HOST ?? "0.0.0.0";
  const workspaceDir = process.env.WORKSPACE_DIR ?? process.cwd();

  return { port, host, workspaceDir };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const gateway = new Gateway(config);

  // TODO: register providers (codely-cli, direct-llm, cli-agent)
  // TODO: register channels (cli, feishu)

  await gateway.start();
  log.info("OpenCrossAgent Gateway started");

  // Graceful shutdown
  const shutdown = async () => {
    log.info("Shutting down...");
    await gateway.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log.error(`Fatal: ${err}`);
  process.exit(1);
});
