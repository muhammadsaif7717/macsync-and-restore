# 🧠 MacSetup (v2.0)

A powerful, streamlined macOS bootstrap and development environment orchestrator. Easily backup, restore, update, and monitor your macOS development environment with a single CLI entry point.

---

## 🚀 Overview

`MacSetup` automates the setup of a new Mac or keeping your current development workspace clean, updated, and backed up. It provides a simple CLI wrapper (`./macsetup`) that orchestrates individual bash scripts to handle:

- **System Provisioning:** Install Xcode Command Line Tools, Homebrew, and all dependencies defined in your `Brewfile`.
- **Configuration Restore:** Seamlessly copy your SSH keys, Git configuration, and Shell profile configurations (`.zshrc`, `.zprofile`, `.zshenv`).
- **Database Services:** Automatically start core databases like PostgreSQL and MongoDB Community.
- **Global Package Restores:** Restore global npm packages.
- **Package Updates:** Keep Homebrew packages, Mac App Store apps (via `mas`), and global package managers up to date.
- **Health Checks & Diagnostics:** Verify installed tools, active services, disk space, and GitHub SSH connectivity.
- **System Cleanup:** Purge Homebrew cache, npm cache, pnpm store, and system logs to free up storage space.

---

## 📂 Project Structure

Here is how the repository is structured:

```text
MacSetup/
├── Brewfile              # List of Homebrew formulae, casks, and VS Code extensions
├── LICENSE               # License information
├── README.md             # This documentation
├── backup/               # Stored backups of shell configurations, SSH keys, etc. (Git-ignored)
├── config/
│   └── macsetup.json     # Configuration file for features and preferences
├── macsetup              # CLI entry point (Shell wrapper script)
└── scripts/              # Under the hood execution scripts
    ├── backup.sh         # Backs up active configs & exports current dependencies
    ├── cleanup.sh        # Frees up system and package manager caches
    ├── doctor.sh         # Runs health checks on active database/tool configurations
    ├── install.sh        # Fresh system installer and configuration restorer
    └── update.sh         # Upgrades Homebrew, App Store, and global package engines
```

---

## 🛠️ Getting Started

To get started, clone this repository and ensure the CLI wrapper script is executable:

```bash
chmod +x ./macsetup
```

You can view the CLI help and available options anytime:

```bash
./macsetup
```

---

## 💻 CLI Commands

The main entry point `./macsetup` supports the following subcommands:

### 1. `install`
Restores or bootstraps a fresh system from the existing backups and the `Brewfile`.
```bash
./macsetup install
```
* **What it does:**
  * Validates/installs Xcode Command Line Tools & Homebrew.
  * Restores packages from `Brewfile` (formulae, casks, VS Code extensions).
  * Copies shell configs (`.zshrc`, `.zprofile`, `.zshenv`) to your home (`~`) directory.
  * Restores Git config (`.gitconfig`) and SSH configuration (`~/.ssh`).
  * Restores global npm packages.
  * Starts database services (MongoDB & PostgreSQL).
  * Validates Git SSH connectivity and displays active Node environment details.

### 2. `backup`
Backs up your current local configuration to the `./backup` folder and exports dependencies.
```bash
./macsetup backup
```
* **What it does:**
  * Backs up shell profiles, SSH configs, and Git config.
  * Dumps a list of active Homebrew formulae and casks to `Brewfile`.
  * Saves lists of globally installed npm/yarn packages.
  * Logs GitHub CLI authentication status and captures system specifications.
  * Records active node/npm/yarn/brew/db versions into `dev-environment.txt`.

### 3. `doctor`
Performs a suite of system diagnostics.
```bash
./macsetup doctor
```
* **What it does:**
  * Checks for installed developer utilities (`git`, `brew`, `node`, etc.).
  * Verifies database commands/instances (`mongod`, `psql`).
  * Lists running background services via `brew services`.
  * Runs `brew doctor` and tests GitHub SSH authentication.
  * Displays current disk space usage.

### 4. `update`
Keeps your tools and dependencies up-to-date.
```bash
./macsetup update
```
* **What it does:**
  * Runs Homebrew self-update and upgrades all formulas and casks.
  * Autoremoves orphaned dependencies and cleans up Homebrew cache.
  * Upgrades apps installed from the Mac App Store (via `mas`).
  * Upgrades global npm and pnpm instances to their latest versions.

### 5. `cleanup`
Frees up disk space by purging local temporary files and build caches.
```bash
./macsetup cleanup
```
* **What it does:**
  * Clears Homebrew download cache.
  * Forces a clean of the local npm cache.
  * Prunes unused packages from the global pnpm store.
  * Deletes macOS user log files (`~/Library/Logs/*`).

---

## ⚙️ Configuration

System options can be customized in [macsetup.json](file:///Users/esra/MacSetup/config/macsetup.json):

```json
{
  "name": "MacSetup",
  "version": "2.0",
  "author": "Saif",
  "features": {
    "backup": true,
    "restore": true,
    "update": true,
    "cleanup": true,
    "doctor": true
  },
  "preferences": {
    "show_colors": true,
    "log_enabled": true
  }
}
```

---

## 📄 License

This project is licensed under the MIT License. Feel free to customize and configure it for your personal use.