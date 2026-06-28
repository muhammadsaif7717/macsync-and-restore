#!/bin/bash

# Create backup directory
BACKUP_DIR="./backup"
mkdir -p "$BACKUP_DIR"

echo "======================================"
echo "📦 MacSetup - Environment Backup"
echo "======================================"

# 1. Backing up shell configurations
echo
echo "[1/5] Backing up shell profiles..."
for file in ~/.zshrc ~/.zprofile ~/.zshenv ~/.bashrc ~/.bash_profile ~/.config/fish/config.fish; do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/"
    echo "✓ Backed up: $(basename "$file")"
  fi
done

# 2. Backing up Git and SSH configs
echo
echo "[2/5] Backing up Git and SSH configurations..."
if [ -f ~/.gitconfig ]; then
  cp ~/.gitconfig "$BACKUP_DIR/"
  echo "✓ Backed up: .gitconfig"
fi
if [ -f ~/.gitignore_global ]; then
  cp ~/.gitignore_global "$BACKUP_DIR/"
  echo "✓ Backed up: .gitignore_global"
fi

if [ -d ~/.ssh ]; then
  mkdir -p "$BACKUP_DIR/.ssh"
  # Copy config, known_hosts and public keys securely
  for file in ~/.ssh/config ~/.ssh/known_hosts ~/.ssh/*.pub; do
    if [ -f "$file" ]; then
      cp "$file" "$BACKUP_DIR/.ssh/"
      echo "✓ Backed up SSH file: $(basename "$file")"
    fi
  done
fi

# 3. Damping Brewfile
echo
echo "[3/5] Exporting Homebrew Brewfile..."
if command -v brew >/dev/null 2>&1; then
  brew bundle dump --force --file="./Brewfile"
  echo "✓ Brewfile successfully updated at ./Brewfile"
else
  echo "⚠️ Homebrew not detected, skipping Brewfile dump."
fi

# 4. Global Package Managers
echo
echo "[4/5] Listing global package configurations..."
mkdir -p "$BACKUP_DIR/packages"

if command -v npm >/dev/null 2>&1; then
  npm list -g --depth=0 > "$BACKUP_DIR/packages/npm-globals.txt" 2>/dev/null || true
  echo "✓ Saved npm global packages list"
fi
if command -v yarn >/dev/null 2>&1; then
  yarn global list --depth=0 > "$BACKUP_DIR/packages/yarn-globals.txt" 2>/dev/null || true
  echo "✓ Saved Yarn global packages list"
fi
if command -v pnpm >/dev/null 2>&1; then
  pnpm list -g --depth=0 > "$BACKUP_DIR/packages/pnpm-globals.txt" 2>/dev/null || true
  echo "✓ Saved pnpm global packages list"
fi

# 5. Developer environment versions
echo
echo "[5/5] Logging developer environment specs..."
ENV_LOG="$BACKUP_DIR/dev-environment.txt"
echo "MacSetup Dev Environment Export - $(date)" > "$ENV_LOG"
echo "----------------------------------------" >> "$ENV_LOG"
echo "macOS: $(sw_vers | paste -sd ' ' -)" >> "$ENV_LOG"
echo "CPU: $(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'N/A')" >> "$ENV_LOG"

if command -v node >/dev/null 2>&1; then echo "Node: $(node -v)" >> "$ENV_LOG"; fi
if command -v npm >/dev/null 2>&1; then echo "npm: $(npm -v)" >> "$ENV_LOG"; fi
if command -v yarn >/dev/null 2>&1; then echo "Yarn: $(yarn -v)" >> "$ENV_LOG"; fi
if command -v pnpm >/dev/null 2>&1; then echo "pnpm: $(pnpm -v)" >> "$ENV_LOG"; fi
if command -v brew >/dev/null 2>&1; then echo "Brew: $(brew --version | head -n 1)" >> "$ENV_LOG"; fi
if command -v fnm >/dev/null 2>&1; then echo "FNM: $(fnm --version)" >> "$ENV_LOG"; fi

if command -v gh >/dev/null 2>&1; then
  echo "----------------------------------------" >> "$ENV_LOG"
  echo "GitHub CLI Authentication Status:" >> "$ENV_LOG"
  gh auth status >> "$ENV_LOG" 2>&1 || true
fi

echo "✓ Saved environmental details to $ENV_LOG"

echo
echo "======================================"
echo "✅ Environment backup complete"
echo "======================================"
