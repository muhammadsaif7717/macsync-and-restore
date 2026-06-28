#!/bin/bash

BACKUP_DIR="./backup"
echo "======================================"
echo "🚀 MacSetup - Environment Installation"
echo "======================================"

# 1. Check/Install Xcode Command Line Tools
echo
echo "[1/6] Checking Xcode Command Line Tools..."
if xcode-select -p >/dev/null 2>&1; then
  echo "✓ Xcode Command Line Tools already installed"
else
  echo "Installing Xcode Command Line Tools..."
  xcode-select --install
  echo "⚠️ Installation triggered. Please follow the macOS prompt instructions and run this installer again once complete."
  exit 1
fi

# 2. Check/Install Homebrew
echo
echo "[2/6] Checking Homebrew..."
if command -v brew >/dev/null 2>&1; then
  echo "✓ Homebrew already installed"
else
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo "✓ Homebrew installed"
  # Add brew to PATH for active script run depending on architecture
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

# 3. Restore shell profiles
echo
echo "[3/6] Restoring shell configurations from backup..."
if [ -d "$BACKUP_DIR" ]; then
  for file in "$BACKUP_DIR"/.zshrc "$BACKUP_DIR"/.zprofile "$BACKUP_DIR"/.zshenv "$BACKUP_DIR"/.bashrc "$BACKUP_DIR"/.bash_profile; do
    if [ -f "$file" ]; then
      base=$(basename "$file")
      if [ -f ~/"$base" ]; then
        cp ~/"$base" ~/"$base.backup.$(date +%F-%H-%M-%S)"
        echo "✓ Created timestamp backup for existing ~/$base"
      fi
      cp "$file" ~/
      echo "✓ Restored config: $base"
    fi
  done
else
  echo "⚠️ Backup directory $BACKUP_DIR not found. Skipping profile restoration."
fi

# 4. Restore Git and SSH configurations
echo
echo "[4/6] Restoring Git and SSH settings..."
if [ -d "$BACKUP_DIR" ]; then
  if [ -f "$BACKUP_DIR/.gitconfig" ]; then
    cp "$BACKUP_DIR/.gitconfig" ~/
    echo "✓ Restored: .gitconfig"
  fi
  if [ -f "$BACKUP_DIR/.gitignore_global" ]; then
    cp "$BACKUP_DIR/.gitignore_global" ~/
    echo "✓ Restored: .gitignore_global"
  fi
  
  if [ -d "$BACKUP_DIR/.ssh" ]; then
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    for file in "$BACKUP_DIR"/.ssh/*; do
      if [ -f "$file" ]; then
        cp "$file" ~/.ssh/
        chmod 600 ~/.ssh/"$(basename "$file")"
        echo "✓ Restored SSH key/config: $(basename "$file")"
      fi
    done
  fi
fi

# 5. Restore Homebrew Packages from Brewfile
echo
echo "[5/6] Restoring Homebrew formulas and casks..."
if [ -f "./Brewfile" ]; then
  brew bundle install --file="./Brewfile"
  echo "✓ Homebrew software restored from Brewfile"
else
  echo "⚠️ No Brewfile found at ./Brewfile. Skipping Homebrew bundle restore."
fi

# 6. Database Services
echo
echo "[6/6] Sourcing database services..."
if command -v brew >/dev/null 2>&1; then
  # Start PostgreSQL if present
  if brew list --formula | grep -q "postgresql"; then
    echo "Starting PostgreSQL service..."
    brew services start postgresql || brew services start postgresql@14 || brew services start postgresql@15 || brew services start postgresql@16 || true
  fi
  # Start MongoDB community if present
  if brew list --formula | grep -q "mongodb-community"; then
    echo "Starting MongoDB community service..."
    brew services start mongodb-community || true
  fi
fi

echo
echo "======================================"
echo "✅ Environment installation complete"
echo "======================================"
