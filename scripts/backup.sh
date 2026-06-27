#!/bin/bash

set -e

# ==================================================
# MacSetup Backup
# ==================================================

echo "========================================"
echo "📦 MacSetup Backup"
echo "========================================"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backup"

mkdir -p "$BACKUP_DIR"

echo
echo "[1/7] Backing up Zsh configuration..."

if [[ -f "$HOME/.zshrc" ]]; then
    cp "$HOME/.zshrc" "$BACKUP_DIR/"
    echo "✓ .zshrc"
else
    echo "⚠ .zshrc not found"
fi

if [[ -f "$HOME/.zprofile" ]]; then
    cp "$HOME/.zprofile" "$BACKUP_DIR/"
    echo "✓ .zprofile"
fi

if [[ -f "$HOME/.zshenv" ]]; then
    cp "$HOME/.zshenv" "$BACKUP_DIR/"
    echo "✓ .zshenv"
fi

echo
echo "[2/7] Backing up Git configuration..."

if [[ -f "$HOME/.gitconfig" ]]; then
    cp "$HOME/.gitconfig" "$BACKUP_DIR/"
    echo "✓ .gitconfig"
else
    echo "⚠ .gitconfig not found"
fi
echo
echo "[3/7] Backing up SSH..."

if [[ -d "$HOME/.ssh" ]]; then
    rm -rf "$BACKUP_DIR/.ssh"
    cp -a "$HOME/.ssh" "$BACKUP_DIR/"
    echo "✓ .ssh"
else
    echo "⚠ .ssh directory not found"
fi



echo
echo "Backup completed."