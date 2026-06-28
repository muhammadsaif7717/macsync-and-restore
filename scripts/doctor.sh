#!/bin/bash

echo "======================================"
echo "🩺 MacSetup - System Doctor"
echo "======================================"

check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "✓ $1 installed"
  else
    echo "❌ $1 missing"
  fi
}

echo
echo "[System Tools]"
check git
check brew
check node
check npm
check pnpm
check yarn
check gh
check fnm

echo
echo "[Databases]"
check mongod
check psql

echo
echo "[Services]"
brew services list 2>/dev/null || echo "brew services not available"

echo
echo "[Disk Usage]"
df -h

echo
echo "[Brew Doctor]"
brew doctor || true

echo
echo "[SSH Test]"
ssh -T git@github.com || true

echo
echo "======================================"
echo "🧠 System check complete"
echo "======================================"