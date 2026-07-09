#!/usr/bin/env tsx
/**
 * cli.ts — Gateway management script.
 *
 * Usage:
 *   tsx scripts/cli.ts start    — Start gateway
 *   tsx scripts/cli.ts stop     — Stop gateway
 *   tsx scripts/cli.ts restart  — Restart gateway
 *   tsx scripts/cli.ts status   — Check gateway status
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = resolve(import.meta.dirname ?? "..");
const GATEWAY_DIR = join(ROOT, "gateway");
const PID_DIR = join(homedir(), ".oca", ".pids");
const PID_FILE = join(PID_DIR, "gateway.pid");
const DEFAULT_PORT = 18789;

function resolve(path: string) {
  return import.meta.dirname ? join(import.meta.dirname, "..", path) : path;
}

function ensurePidDir() {
  if (!existsSync(PID_DIR)) {
    mkdirSync(PID_DIR, { recursive: true });
  }
}

function startGateway() {
  const entryPath = join(GATEWAY_DIR, "dist", "entry.js");
  if (!existsSync(entryPath)) {
    console.error("❌ Gateway not built. Run `pnpm build` first.");
    process.exit(1);
  }

  ensurePidDir();

  const child = spawn("node", [entryPath], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });

  writeFileSync(PID_FILE, String(child.pid));
  child.unref();
  console.log(`✅ Gateway started (PID: ${child.pid}, port: ${DEFAULT_PORT})`);
}

function stopGateway() {
  if (!existsSync(PID_FILE)) {
    console.log("⚠️  No PID file found. Gateway not running?");
    return;
  }

  const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
  try {
    process.kill(pid);
    console.log(`✅ Gateway stopped (PID: ${pid})`);
  } catch {
    console.log(`⚠️  Failed to kill PID ${pid} — process may have already exited`);
  }
}

function statusGateway() {
  if (!existsSync(PID_FILE)) {
    console.log("❌ Gateway not running (no PID file)");
    process.exit(1);
  }

  const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
  try {
    process.kill(pid, 0); // Check if process exists
    console.log(`✅ Gateway running (PID: ${pid})`);
  } catch {
    console.log(`❌ Gateway not running (stale PID: ${pid})`);
    process.exit(1);
  }
}

const command = process.argv[2];
switch (command) {
  case "start":
    startGateway();
    break;
  case "stop":
    stopGateway();
    break;
  case "restart":
    stopGateway();
    setTimeout(startGateway, 500);
    break;
  case "status":
    statusGateway();
    break;
  default:
    console.log("Usage: tsx scripts/cli.ts <start|stop|restart|status>");
    process.exit(1);
}
