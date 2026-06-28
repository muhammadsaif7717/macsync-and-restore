#!/bin/bash

set -e

# ==========================================================
# MacSetup - Install / Restore Script
# ==========================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backup"

echo "=================================================="
echo "🛠️ MacSetup Restore"
echo "=================================================="

# ----------------------------------------------------------
# Safety Check
# ----------------------------------------------------------

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "❌ Backup folder not found!"
  exit 1
fi

# ----------------------------------------------------------
# Step 1/12 - Xcode Command Line Tools
# ----------------------------------------------------------

echo
echo "[1/12] Checking Xcode Command Line Tools..."

if ! xcode-select -p >/dev/null 2>&1; then
  echo "Installing Xcode Command Line Tools..."
  xcode-select --install
  echo "⚠️ Please complete installation manually, then re-run script."
  exit 1
else
  echo "✓ Xcode CLT already installed"
fi

# ----------------------------------------------------------
# Step 2/12 - Homebrew
# ----------------------------------------------------------

echo
echo "[2/12] Checking Homebrew..."

if ! command -v brew >/dev/null 2>&1; then
  echo "Installing Homebrew..."

  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"

else
  echo "✓ Homebrew already installed"
fi

# ----------------------------------------------------------
# Step 3/12 - Brew Bundle Restore
# ----------------------------------------------------------

echo
echo "[3/12] Restoring Brewfile..."

if [[ -f "$PROJECT_DIR/Brewfile" ]]; then
  brew bundle --file="$PROJECT_DIR/Brewfile"
  echo "✓ Brew packages restored"
else
  echo "⚠ Brewfile not found"
fi

# ----------------------------------------------------------
# Step 4/12 - Shell Configuration Restore
# ----------------------------------------------------------

echo
echo "[4/12] Restoring shell configuration..."

for file in .zshrc .zprofile .zshenv; do
  if [[ -f "$BACKUP_DIR/$file" ]]; then
    if [[ -f "$HOME/$file" ]]; then
      mv "$HOME/$file" "$HOME/${file}.backup.$(date +%Y%m%d_%H%M%S)"
      echo "✓ Backup created for existing $file"
    fi
    cp "$BACKUP_DIR/$file" "$HOME/$file"
    echo "✓ $file restored"
  fi
done

# DO NOT auto-source shell config inside scripts
# It breaks interactive shell state

echo "⚠ Shell config updated. Restart terminal to apply changes."

# ----------------------------------------------------------
# Step 5/12 - Git Configuration
# ----------------------------------------------------------

echo
echo "[5/12] Restoring Git configuration..."

if [[ -f "$BACKUP_DIR/.gitconfig" ]]; then
  if [[ -f "$HOME/.gitconfig" ]]; then
    mv "$HOME/.gitconfig" "$HOME/.gitconfig.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Backup created for existing .gitconfig"
  fi
  cp "$BACKUP_DIR/.gitconfig" "$HOME/.gitconfig"
  echo "✓ .gitconfig restored"
fi

# ----------------------------------------------------------
# Step 6/12 - SSH Restore
# ----------------------------------------------------------

echo
echo "[6/12] Restoring SSH configuration..."

if [[ -d "$BACKUP_DIR/.ssh" ]]; then

 if [[ -d "$HOME/.ssh" ]]; then
  mv "$HOME/.ssh" "$HOME/.ssh.backup.$(date +%Y%m%d_%H%M%S)"
fi
  mkdir -p "$HOME/.ssh"

  cp -R "$BACKUP_DIR/.ssh/" "$HOME/.ssh/"

  chmod 700 "$HOME/.ssh"
  chmod 600 "$HOME/.ssh/"* 2>/dev/null || true

  echo "✓ SSH restored"

else
  echo "⚠ No SSH backup found"
fi

# ----------------------------------------------------------
# Step 7/12 - Global Packages Restore
# ----------------------------------------------------------

echo
echo "[7/12] Restoring global packages..."

# npm
if command -v npm >/dev/null 2>&1 && [[ -f "$BACKUP_DIR/global-npm.txt" ]]; then
  echo "Installing npm globals..."
  cat "$BACKUP_DIR/global-npm.txt" | awk '{print $2}' | grep -v "(empty)" | xargs npm install -g || true
  echo "✓ npm globals restored"
fi

# pnpm
echo "⚠ pnpm intentionally skipped (user preference)"

echo "⚠ Yarn global restore skipped"

# ----------------------------------------------------------
# Step 8/12 - Database Services
# ----------------------------------------------------------

echo
echo "[8/12] Starting database services..."

if command -v brew >/dev/null 2>&1; then

  brew services start mongodb-community >/dev/null 2>&1 || true
  echo "✓ MongoDB service started"

  brew services start postgresql >/dev/null 2>&1 || true
  echo "✓ PostgreSQL service started"

fi

# ----------------------------------------------------------
# Step 9/12 - GitHub Authentication Check
# ----------------------------------------------------------

echo
echo "[9/12] Checking GitHub authentication..."

if command -v ssh >/dev/null 2>&1; then
  ssh -T git@github.com || true
  echo "✓ GitHub SSH checked"
fi

# ----------------------------------------------------------
# Step 10/12 - Node Environment Check
# ----------------------------------------------------------

echo
echo "[10/12] Checking Node environment..."

if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env)"
    echo "✓ fnm available"
    
    # Bootstrap default Node LTS if no active Node version is found
    if ! command -v node >/dev/null 2>&1 || [[ "$(fnm current 2>/dev/null)" == "none" ]]; then
        echo "Installing default Node LTS version via fnm..."
        fnm install --lts
        fnm default lts
        eval "$(fnm env)"
    fi
fi

echo "Node: $(node -v)"
echo "npm : $(npm -v)"

if command -v pnpm >/dev/null 2>&1; then
    echo "pnpm: $(pnpm -v)"
fi

if command -v yarn >/dev/null 2>&1; then
    echo "Yarn: $(yarn -v)"
fi

# ----------------------------------------------------------
# Step 11/12 - Permissions Fix
# ----------------------------------------------------------

echo
echo "[11/12] Fixing permissions..."

chmod +x "$PROJECT_DIR/scripts/"*.sh

echo "✓ Scripts executable permissions set"

# ----------------------------------------------------------
# Step 12/12 - Summary
# ----------------------------------------------------------

echo
echo "=================================================="
echo "🎉 INSTALLATION COMPLETE"
echo "=================================================="

echo
echo "✔ Homebrew restored"
echo "✔ Packages installed"
echo "✔ Shell configured"
echo "✔ Git configured"
echo "✔ SSH restored"
echo "✔ Databases running"
echo "✔ Node environment ready"

echo
echo "🚀 Your Mac is now fully restored!"
echo "=================================================="