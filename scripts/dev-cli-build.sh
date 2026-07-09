#!/usr/bin/env bash
set -euo pipefail

# ─── dev-cli-build.sh ───────────────────────────────────────────────────────
# Build + npm link oca-cli
# Supports: macOS / Linux / Windows (Git Bash / WSL)
# Usage: ./scripts/dev-cli-build.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKG_DIR="$PROJECT_ROOT/clients/cli"
PKG_NAME="@oca/oca-cli"

echo "📦 Building $PKG_NAME..."

# ─── Ensure pnpm ────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "⚠️  pnpm not found. Attempting auto-install..."
  if command -v npm &>/dev/null; then
    npm install -g pnpm || {
      echo "❌ Failed to install pnpm automatically."
      echo "   Please install manually: npm install -g pnpm"
      exit 1
    }
  else
    echo "❌ npm not found. Please install Node.js >= 22 first:"
    echo "   https://nodejs.org/"
    exit 1
  fi
fi

# ─── Ensure bun ─────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "⚠️  bun not found. Attempting auto-install..."
  if [[ "$(uname -s)" == "Darwin" ]] || [[ "$(uname -s)" == "Linux" ]]; then
    curl -fsSL https://bun.sh/install | bash || {
      echo "❌ Failed to install bun automatically."
      echo "   Please install manually: https://bun.sh/"
      exit 1
    }
    export PATH="$HOME/.bun/bin:$PATH"
  else
    # Windows — try PowerShell installer
    powershell -NoProfile -ExecutionPolicy Bypass -c 'irm bun.sh/install.ps1 | iex' || {
      echo "❌ Failed to install bun automatically."
      echo "   Please install manually: https://bun.sh/"
      exit 1
    }
  fi
fi

# ─── Install deps if needed ─────────────────────────────────────────────────
cd "$PROJECT_ROOT"
if [ ! -d "$PKG_DIR/node_modules" ]; then
  echo "📥 Installing dependencies..."
  pnpm install || {
    echo "❌ Failed to install dependencies."
    echo "   Please run manually: pnpm install"
    exit 1
  }
fi

# ─── Build ──────────────────────────────────────────────────────────────────
cd "$PKG_DIR"
echo "🔨 Building..."
pnpm build || {
  echo "❌ Build failed."
  exit 1
}

# ─── npm link ───────────────────────────────────────────────────────────────
echo "🔗 npm link..."
npm link || {
  echo "❌ npm link failed."
  echo "   Try manually: cd clients/cli && npm link"
  exit 1
}

echo ""
echo "✅ $PKG_NAME built and linked!"
echo "   You can now run: oca-cli"
