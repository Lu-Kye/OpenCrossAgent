#!/usr/bin/env node
/**
 * build.ts — Cross-platform build script for oca-cli.
 *
 * Uses `bun build` with native module externals,
 * copies themes to dist/.
 * Native modules resolve from node_modules/ at runtime (optionalDependencies).
 */

import { execSync } from "node:child_process";
import { existsSync, cpSync, rmSync, readFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { arch, platform as osPlatform, homedir } from "node:os";

const CLI_DIR = resolve(import.meta.dirname ?? ".");
const DIST_DIR = join(CLI_DIR, "dist");

// ─── Native module detection ───────────────────────────────────────────────

const NATIVE_EXTERNAL_MODULES = [
  "@opentui/core",
  "@opentui/core-darwin-arm64",
  "@opentui/core-darwin-x64",
  "@opentui/core-linux-x64",
  "@opentui/core-linux-arm64",
  "@opentui/core-win32-x64",
];

function detectCurrentNativeModule(): string | null {
  const p = osPlatform();
  const a = arch();
  const key = `${p}-${a}`;
  const map: Record<string, string> = {
    "darwin-arm64": "@opentui/core-darwin-arm64",
    "darwin-x64": "@opentui/core-darwin-x64",
    "linux-x64": "@opentui/core-linux-x64",
    "linux-arm64": "@opentui/core-linux-arm64",
    "win32-x64": "@opentui/core-win32-x64",
  };
  return map[key] ?? null;
}

// ─── bun detection/install ──────────────────────────────────────────────────

function getBunPath(): string | null {
  try {
    execSync("bun --version", { stdio: "pipe" });
    return "bun";
  } catch { /* not in PATH */ }

  const bunPath = join(
    homedir(), ".bun", "bin",
    osPlatform() === "win32" ? "bun.exe" : "bun",
  );
  if (existsSync(bunPath)) return bunPath;

  return null;
}

function installBun(): string {
  const bunPath = join(
    homedir(), ".bun", "bin",
    osPlatform() === "win32" ? "bun.exe" : "bun",
  );

  console.log("📦 bun not found, installing automatically...\n");

  const isWin = osPlatform() === "win32";
  try {
    if (isWin) {
      console.log("Running PowerShell installer...");
      execSync('powershell -NoProfile -ExecutionPolicy Bypass -c "irm bun.sh/install.ps1 | iex"', {
        stdio: "inherit",
        timeout: 120_000,
      });
    } else {
      console.log("Running curl installer...");
      execSync("curl -fsSL https://bun.sh/install | bash", {
        stdio: "inherit",
        timeout: 120_000,
      });
    }
  } catch {
    console.error("\n❌ Failed to install bun automatically.");
    console.error("   Please install manually from https://bun.sh");
    process.exit(1);
  }

  if (!existsSync(bunPath)) {
    console.error("\n❌ bun installation completed but executable not found.");
    console.error(`   Expected: ${bunPath}`);
    console.error("   Please install manually from https://bun.sh");
    process.exit(1);
  }

  const bunBinDir = join(homedir(), ".bun", "bin");
  process.env.PATH = `${bunBinDir}${isWin ? ";" : ":"}${process.env.PATH ?? ""}`;

  console.log(`\n✅ bun installed at ${bunPath}\n`);
  return bunPath;
}

function ensureBun(): string {
  const existing = getBunPath();
  if (existing) return existing;
  return installBun();
}

// ─── Build ──────────────────────────────────────────────────────────────────

function build() {
  const bunExe = ensureBun();

  const currentNative = detectCurrentNativeModule();
  console.log(`Current platform native: ${currentNative ?? "(unknown)"}`);

  // Install current platform's native module if needed
  if (currentNative) {
    const modDir = join(CLI_DIR, "node_modules", currentNative);
    if (!existsSync(modDir)) {
      console.log(`Installing ${currentNative}...`);
      try {
        execSync("pnpm install --ignore-scripts", {
          cwd: join(CLI_DIR, "..", ".."),
          stdio: "inherit",
        });
      } catch {
        console.warn(`Warning: failed to install ${currentNative}. Build may continue.`);
      }
    }
  }

  // Clean previous build
  if (existsSync(DIST_DIR)) {
    console.log("Cleaning dist/...");
    rmSync(DIST_DIR, { recursive: true, force: true });
  }

  // Build with native modules externalized
  const externalFlags = NATIVE_EXTERNAL_MODULES.flatMap((mod) => ["--external", mod]);

  console.log("Building oca-cli...");
  execSync(
    `"${bunExe}" build src/main.tsx --outdir dist --target bun ${externalFlags.join(" ")}`,
    { cwd: CLI_DIR, stdio: "inherit", timeout: 120_000 },
  );

  if (!existsSync(join(DIST_DIR, "main.js"))) {
    console.error("Build failed: dist/main.js not found");
    process.exit(1);
  }

  // Copy themes (if exists)
  const themesSrc = join(CLI_DIR, "src", "theme", "themes");
  if (existsSync(themesSrc)) {
    console.log("Copying themes...");
    cpSync(themesSrc, join(DIST_DIR, "themes"), { recursive: true });
  }

  console.log("Build complete: dist/main.js");
}

build();
