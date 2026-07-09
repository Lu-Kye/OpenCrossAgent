#!/usr/bin/env bash
set -euo pipefail

# ─── dev-gateway-build.sh ───────────────────────────────────────────────────
# Build + npm link oca-gateway
# Supports: macOS / Linux / Windows (Git Bash / WSL)
# Usage: ./scripts/dev-gateway-build.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKG_DIR="$PROJECT_ROOT/gateway"
PKG_NAME="@oca/oca-gateway"

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
    echo "❌ npm not found either. Please install Node.js >= 22 first:"
    echo "   https://nodejs.org/"
    exit 1
  fi
fi

# ─── Ensure tsdown ──────────────────────────────────────────────────────────
cd "$PKG_DIR"
if ! npx tsdown --version &>/dev/null 2>&1; then
  echo "⚠️  tsdown not found. Running pnpm install..."
  pnpm install || {
    echo "❌ Failed to install dependencies."
    echo "   Please run manually: cd gateway && pnpm install"
    exit 1
  }
fi

# ─── Build ──────────────────────────────────────────────────────────────────
echo "🔨 Building..."
pnpm build || {
  echo "❌ Build failed."
  exit 1
}

# ─── npm link ───────────────────────────────────────────────────────────────
echo "🔗 npm link..."
npm link || {
  echo "❌ npm link failed."
  echo "   Try manually: cd gateway && npm link"
  exit 1
}

echo ""
echo "✅ $PKG_NAME built and linked!"
echo "   You can now run: oca-gateway --help"
