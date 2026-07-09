#!/usr/bin/env bash
set -euo pipefail

# dev-feishu-build.sh
# Build + npm link oca-feishu
# Supports: macOS / Linux / Windows (Git Bash / WSL)
# Usage: ./scripts/dev-feishu-build.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKG_DIR="$PROJECT_ROOT/clients/feishu"
PKG_NAME="@oca/oca-feishu"

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
  echo "   Try manually: cd clients/feishu && npm link"
  exit 1
}

echo ""
echo "✅ $PKG_NAME built and linked!"
echo "   You can now run: oca-feishu"
