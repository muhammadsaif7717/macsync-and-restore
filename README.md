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

## 🍺 Install via Brew

Once you push the tap to GitHub, anyone can install MacSync & Restore using:

```bash
brew tap muhammadsaif7717/apps
brew trust muhammadsaif7717/apps
brew install --cask macsync-and-restore
```

---

### ⚠️ Troubleshooting Installation

If the app fails to open after installation (due to macOS Gatekeeper restrictions on unsigned apps), run the following command in your terminal to remove the quarantine attribute:

```bash
sudo xattr -cr "/Applications/MacSync & Restore.app"
```

## 📄 License

This software is provided under a custom End User License Agreement (EULA). Users are free to download and use the compiled application. However, the source code is proprietary and may not be cloned, copied, modified, merged, or published. The author is not responsible for any system issues. See the `LICENSE` file for full details.
