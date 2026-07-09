#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("oca-installer")
  .description("OpenCrossAgent Installer — cross-platform installation script")
  .version("0.1.0");

program
  .command("install")
  .description("Install OCA gateway + CLI")
  .option("--dir <directory>", "Installation directory")
  .action(() => {
    console.log("oca-installer: install command (stub — not yet implemented)");
  });

program
  .command("update")
  .description("Update OCA to latest version")
  .action(() => {
    console.log("oca-installer: update command (stub — not yet implemented)");
  });

program.parse();
