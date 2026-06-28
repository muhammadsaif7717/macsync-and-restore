#!/bin/bash

set -e

# ==========================================================
# MacSetup - Backup Script (Final Clean Version)
# ==========================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backup"

echo "=================================================="
echo "📦 MacSetup Backup"
echo "=================================================="

mkdir -p "$BACKUP_DIR"

# ----------------------------------------------------------
# Step 1 - Shell Configuration
# ----------------------------------------------------------

echo
echo "[1/10] Backing up Shell configuration..."

for file in .zshrc .zprofile .zshenv; do
    if [[ -f "$HOME/$file" ]]; then
        cp "$HOME/$file" "$BACKUP_DIR/"
        echo "✓ $file"
    fi
done

# ----------------------------------------------------------
# Step 2 - Git
# ----------------------------------------------------------

echo
echo "[2/10] Backing up Git configuration..."

if [[ -f "$HOME/.gitconfig" ]]; then
    cp "$HOME/.gitconfig" "$BACKUP_DIR/"
    echo "✓ .gitconfig"
fi

# ----------------------------------------------------------
# Step 3 - SSH
# ----------------------------------------------------------

echo
echo "[3/10] Backing up SSH..."

if [[ -d "$HOME/.ssh" ]]; then

    rm -rf "$BACKUP_DIR/.ssh"
    mkdir -p "$BACKUP_DIR/.ssh"

    find "$HOME/.ssh" -type f | while read -r file; do
        relative="${file#$HOME/.ssh/}"
        mkdir -p "$BACKUP_DIR/.ssh/$(dirname "$relative")"
        cp "$file" "$BACKUP_DIR/.ssh/$relative"
    done

    echo "✓ .ssh"

else
    echo "⚠ .ssh directory not found"
fi

# ----------------------------------------------------------
# Step 4 - Brewfile
# ----------------------------------------------------------

echo
echo "[4/10] Exporting Brewfile..."

if command -v brew >/dev/null 2>&1; then
    brew bundle dump --force --file="$PROJECT_DIR/Brewfile"
    cp "$PROJECT_DIR/Brewfile" "$BACKUP_DIR/"
    echo "✓ Brewfile"
else
    echo "⚠ Homebrew not installed"
fi

# ----------------------------------------------------------
# Step 5 - Brew Packages
# ----------------------------------------------------------

echo
echo "[5/10] Saving installed packages..."

if command -v brew >/dev/null 2>&1; then
    brew list > "$BACKUP_DIR/brew-formulae.txt"
    brew list --cask > "$BACKUP_DIR/brew-casks.txt"
    echo "✓ Formulae"
    echo "✓ Casks"
fi

# ----------------------------------------------------------
# Step 6 - Global Packages (npm only)
# ----------------------------------------------------------

echo
echo "[6/10] Saving global npm packages..."

if command -v npm >/dev/null 2>&1; then
    npm list -g --depth=0 > "$BACKUP_DIR/global-npm.txt" 2>/dev/null || true
    echo "✓ npm"
fi

echo "⚠ pnpm skipped intentionally"

if command -v yarn >/dev/null 2>&1; then
    yarn global list > "$BACKUP_DIR/global-yarn.txt" 2>/dev/null || true
    echo "✓ yarn"
fi

# ----------------------------------------------------------
# Step 7 - GitHub Auth
# ----------------------------------------------------------

echo
echo "[7/10] Saving GitHub authentication..."

if command -v gh >/dev/null 2>&1; then
    gh auth status > "$BACKUP_DIR/github-auth.txt" 2>&1 || true
    echo "✓ GitHub CLI"
else
    echo "⚠ GitHub CLI not installed"
fi

# ----------------------------------------------------------
# Step 8 - System Information (clean)
# ----------------------------------------------------------

echo
echo "[8/10] Saving system information..."

{
    echo "macOS:"
    sw_vers

    echo
    echo "Kernel:"
    uname -a

    echo
    echo "CPU:"
    sysctl -n machdep.cpu.brand_string 2>/dev/null || true

    echo
    echo "Memory:"
    sysctl hw.memsize 2>/dev/null || true

    echo
    echo "Disk:"
    df -h

} > "$BACKUP_DIR/system-info.txt"

echo "✓ System Information"

# ----------------------------------------------------------
# Step 9 - Development Environment
# ----------------------------------------------------------

echo
echo "[9/10] Saving development environment..."

{
    echo "Node:"
    node -v 2>/dev/null || true

    echo
    echo "npm:"
    npm -v 2>/dev/null || true

    echo
    echo "Yarn:"
    yarn -v 2>/dev/null || true

    echo
    echo "Git:"
    git --version

    echo
    echo "Homebrew:"
    brew --version

    echo
    echo "MongoDB:"
    mongod --version 2>/dev/null || true

    echo
    echo "PostgreSQL:"
    psql --version 2>/dev/null || true
} > "$BACKUP_DIR/dev-environment.txt"

echo "✓ Development Environment"

# ----------------------------------------------------------
# Step 10 - Summary
# ----------------------------------------------------------

echo
echo "[10/10] Backup summary"

echo
echo "Backup Location:"
echo "$BACKUP_DIR"

echo
echo "Files Saved:"
ls -A "$BACKUP_DIR"

echo
echo "=================================================="
echo "✅ Backup completed successfully!"
echo "=================================================="