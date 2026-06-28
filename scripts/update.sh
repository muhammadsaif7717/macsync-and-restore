#!/bin/bash

set -e

echo "======================================"
echo "🔄 MacSetup - System Update"
echo "======================================"

# Homebrew update
echo
echo "[1/6] Updating Homebrew..."
brew update && brew upgrade && brew upgrade --cask || true
echo "✓ Homebrew updated"

# Cleanup brew
echo
echo "[2/6] Cleaning Homebrew..."
brew autoremove || true
brew cleanup -s || true
echo "✓ Brew cleaned"

# MAS (Mac App Store)
echo
echo "[3/6] Updating Mac App Store apps..."
mas upgrade || true
echo "✓ MAS updated"

# npm global update
echo
echo "[4/6] Updating npm global packages..."
npm update -g || true
echo "✓ npm updated"

# pnpm update
echo
echo "[5/6] Updating pnpm..."
corepack prepare pnpm@latest --activate || true
echo "✓ pnpm updated"

# Brew doctor
echo
echo "[6/6] Running Brew Doctor..."
brew doctor || true
echo "✓ Brew Doctor check completed"

echo
echo "======================================"
echo "✅ System update complete"
echo "======================================"

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "Brew: $(brew --version | head -n 1)"