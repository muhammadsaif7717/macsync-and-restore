# 🧠 MacSync & Restore (v1.0.0)

A powerful, streamlined macOS bootstrap and development environment orchestrator with a beautiful GUI. Easily backup, restore, update, and monitor your macOS development environment with a single click.

---

## 🚀 Overview & Project Analysis

`MacSync & Restore` automates the setup of a new Mac or keeping your current development workspace clean, updated, and backed up. It provides an intuitive Electron-based graphical interface that handles:

- **System Provisioning:** Install Xcode Command Line Tools, Homebrew, and all dependencies defined in your `Brewfile`.
- **Configuration Restore:** Seamlessly copy your SSH keys, Git configuration, and Shell profile configurations (`.zshrc`, `.zprofile`, `.zshenv`).
- **Database Services:** Automatically start core databases like PostgreSQL and MongoDB Community directly from the dashboard.
- **Global Package Restores:** Restore global npm packages.
- **Package Updates:** Keep Homebrew packages, Mac App Store apps (via `mas`), and global package managers up to date.
- **Health Checks & Diagnostics:** Verify installed tools, active services, disk space, and GitHub SSH connectivity.
- **System Cleanup:** Purge Homebrew cache, npm cache, pnpm store, and system logs to free up storage space.

---

## 📦 Building MacSync & Restore for macOS

You can easily package MacSync & Restore as a `.dmg` file for easy distribution and installation on any Mac.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the `.dmg` installer:
   ```bash
   npm run dist
   ```

3. The generated `.dmg` will be placed in the `dist/` directory.

---

## 🌐 Publishing to GitHub Releases

1. Go to your GitHub repository and click on **Releases > Draft a new release**.
2. Create a new tag (e.g., `v1.0.0`).
3. Set the title as **MacSync & Restore v1.0.0**.
4. Drag and drop the `.dmg` file from your `dist/` folder into the release assets section.
5. Click **Publish release**.

---

## 🍺 Publishing to Homebrew Cask

You can allow users to install MacSync & Restore via Homebrew: `brew install --cask macsync-and-restore`

### 1. Create a Homebrew Tap
Create a new GitHub repository called `homebrew-tap` (e.g., `github.com/username/homebrew-tap`).

### 2. Get the SHA256 Checksum
Run the following command on your exported `.dmg` file to get its checksum:
```bash
shasum -a 256 path/to/MacSync-and-Restore-1.0.0.dmg
```

### 3. Create the Cask Formula
In your new `homebrew-tap` repository, create a folder called `Casks` and add a file named `macsync-and-restore.rb`:

```ruby
cask "macsync-and-restore" do
  version "1.0.0"
  sha256 "YOUR_SHA256_CHECKSUM_HERE"

  url "https://github.com/username/MacSyncAndRestore/releases/download/v#{version}/MacSync-and-Restore-#{version}.dmg"
  name "MacSync & Restore"
  desc "A powerful Mac environment setup and backup orchestrator"
  homepage "https://github.com/username/MacSyncAndRestore"

  app "MacSync & Restore.app"
end
```

### 4. Install via Brew
Once you push the tap to GitHub, anyone can install MacSync & Restore using:
```bash
brew tap username/tap
brew install --cask macsync-and-restore
```

---

## 📄 License

This project is licensed under the MIT License. Feel free to customize and configure it for your personal use.