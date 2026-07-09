#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("oca-gateway")
  .description("OpenCrossAgent Gateway — cross-agent orchestration gateway")
  .version("0.1.0");

program
  .command("start")
  .description("Start the gateway server")
  .option("--port <port>", "Port to listen on")
  .option("--host <host>", "Host to bind to")
  .option("--verbose", "Enable verbose logging")
  .option("--no-feishu", "Disable Feishu channel")
  .action((_opts) => {
    console.log("oca-gateway: start command (stub — not yet implemented)");
  });

program
  .command("stop")
  .description("Stop the gateway server")
  .action(() => {
    console.log("oca-gateway: stop command (stub — not yet implemented)");
  });

program
  .command("restart")
  .description("Restart the gateway server")
  .action(() => {
    console.log("oca-gateway: restart command (stub — not yet implemented)");
  });

program
  .command("status")
  .description("Check gateway server status")
  .action(() => {
    console.log("oca-gateway: status command (stub — not yet implemented)");
  });

program
  .command("setup")
  .description("Interactive setup wizard")
  .action(() => {
    console.log("oca-gateway: setup command (stub — not yet implemented)");
  });

program.parse();
