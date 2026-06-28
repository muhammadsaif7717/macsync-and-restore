#!/bin/bash

set -e

echo "======================================"
echo "🧹 MacSetup - Cleanup"
echo "======================================"

# Brew cleanup
echo
echo "[1/9] Cleaning Homebrew cache..."
brew cleanup -s || true
rm -rf ~/Library/Caches/Homebrew 2>/dev/null || true
echo "✓ Brew cache cleaned"

# npm cache
echo
echo "[2/9] Cleaning npm cache..."
npm cache clean --force || true
rm -rf ~/.npm 2>/dev/null || true
echo "✓ npm cache cleaned"

# pnpm store
echo
echo "[3/9] Cleaning pnpm store..."
pnpm store prune || true
rm -rf ~/.pnpm-store 2>/dev/null || true
echo "✓ pnpm store cleaned"

# logs cleanup
echo
echo "[4/9] Cleaning system logs..."
rm -rf ~/Library/Logs/* 2>/dev/null || true
echo "✓ System logs cleaned"

# macOS user caches
echo
echo "[5/9] Cleaning macOS user caches..."
rm -rf ~/Library/Caches/* 2>/dev/null || true
echo "✓ macOS user caches cleaned"

# Gradle caches
echo
echo "[6/9] Cleaning Gradle caches..."
rm -rf ~/.gradle/caches 2>/dev/null || true
echo "✓ Gradle caches cleaned"

# Android build caches
echo
echo "[7/9] Cleaning Android build caches..."
rm -rf ~/.android/cache 2>/dev/null || true
echo "✓ Android build caches cleaned"

# Android Virtual Devices (AVD)
echo
echo "[8/9] Cleaning Android Virtual Devices (AVD)..."
rm -rf ~/.android/avd 2>/dev/null || true
echo "✓ Android Virtual Devices (AVD) cleaned"

# Dart/Flutter pub cache
echo
echo "[9/9] Cleaning Dart/Flutter pub cache..."
rm -rf ~/.pub-cache 2>/dev/null || true
echo "✓ Dart/Flutter pub cache cleaned"

echo
echo "======================================"
echo "✅ Cleanup complete"
echo "======================================"