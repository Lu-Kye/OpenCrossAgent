#!/usr/bin/env tsx
/**
 * dev.ts — Development orchestration script for OpenCrossAgent.
 *
 * Usage:
 *   tsx scripts/dev.ts build   — Build all packages
 *   tsx scripts/dev.ts clean   — Clean all dist/ directories
 *   tsx scripts/dev.ts typecheck — Run tsc --noEmit for all packages
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? "..");

const PACKAGES = [
  { name: "gateway", dir: "gateway", buildCmd: "tsdown" },
  { name: "oca-cli", dir: "clients/cli", buildCmd: "bun run build.ts" },
  { name: "oca-installer", dir: "installer", buildCmd: "tsdown" },
] as const;

function run(cmd: string, cwd: string) {
  console.log(`  $ ${cmd}  [in ${cwd}]`);
  execSync(cmd, { cwd: join(ROOT, cwd), stdio: "inherit" });
}

function build() {
  for (const pkg of PACKAGES) {
    console.log(`\n📦 Building ${pkg.name}...`);
    run(pkg.buildCmd, pkg.dir);
  }
  console.log("\n✅ All packages built.");
}

function clean() {
  for (const pkg of PACKAGES) {
    const distDir = join(ROOT, pkg.dir, "dist");
    if (existsSync(distDir)) {
      console.log(`  Removing ${pkg.dir}/dist/`);
      rmSync(distDir, { recursive: true, force: true });
    }
  }
  console.log("✅ All dist/ directories cleaned.");
}

function typecheck() {
  for (const pkg of PACKAGES) {
    console.log(`\n🔍 Typechecking ${pkg.name}...`);
    run("tsc --noEmit", pkg.dir);
  }
  console.log("\n✅ Typecheck passed.");
}

const command = process.argv[2];
switch (command) {
  case "build":
    build();
    break;
  case "clean":
    clean();
    break;
  case "typecheck":
    typecheck();
    break;
  default:
    console.log("Usage: tsx scripts/dev.ts <build|clean|typecheck>");
    process.exit(1);
}
