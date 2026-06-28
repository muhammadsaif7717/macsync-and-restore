const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');

let mainWindow;

// Load login shell environment variables dynamically
function loadShellEnv() {
  return new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/zsh';
    exec(`${shell} -l -c "echo '---ENV_START---'; env; echo '---ENV_END---'"`, (err, stdout) => {
      if (err) {
        resolve();
        return;
      }
      const match = stdout.match(/---ENV_START---([\s\S]*?)---ENV_END---/);
      if (match) {
        const envLines = match[1].trim().split('\n');
        envLines.forEach(line => {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const key = parts[0];
            const value = parts.slice(1).join('=');
            process.env[key] = value;
          }
        });
      }
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Clean frameless macOS title bar
    backgroundColor: '#111115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  await loadShellEnv();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler to run bash scripts dynamically and stream logs
let activeProcess = null;

ipcMain.on('run-script', (event, scriptName) => {
  if (activeProcess) {
    event.reply('script-stdout', '\n⚠️ Another process is already running!\n');
    return;
  }

  const isPackaged = app.isPackaged;
  const resourcesDir = isPackaged ? process.resourcesPath : __dirname;
  const scriptPath = path.join(resourcesDir, 'scripts', `${scriptName}.sh`);

  event.reply('script-stdout', `> Starting ${scriptName}...\n`);

  // Spawn process
  activeProcess = spawn('bash', [scriptPath], {
    cwd: resourcesDir,
    env: { ...process.env, PATH: `/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}` }
  });

  activeProcess.stdout.on('data', (data) => {
    event.reply('script-stdout', data.toString());
  });

  activeProcess.stderr.on('data', (data) => {
    event.reply('script-stderr', data.toString());
  });

  activeProcess.on('error', (err) => {
    event.reply('script-stderr', `Execution Error: ${err.message}\n`);
  });

  activeProcess.on('close', (code) => {
    activeProcess = null;
    event.reply('script-exit', code);
  });
});

ipcMain.on('kill-active-script', (event) => {
  if (activeProcess) {
    activeProcess.kill('SIGINT');
    event.reply('script-stderr', '\n⚠️ Process terminated by user.\n');
    activeProcess = null;
  }
});

// IPC Handler to dynamically check services
ipcMain.handle('check-services', async () => {
  return new Promise((resolve) => {
    const status = { mongodb: 'checking', postgresql: 'checking' };
    
    exec('brew services list', (err, stdout) => {
      if (err) {
        status.mongodb = 'stopped';
        status.postgresql = 'stopped';
        resolve(status);
        return;
      }
      
      const lines = stdout.split('\n');
      lines.forEach((line) => {
        if (line.includes('mongodb-community')) {
          status.mongodb = line.includes('started') ? 'started' : 'stopped';
        }
        if (line.includes('postgresql')) {
          status.postgresql = line.includes('started') ? 'started' : 'stopped';
        }
      });
      resolve(status);
    });
  });
});

// IPC Handler to toggle services
ipcMain.handle('toggle-service', async (event, { serviceName, action }) => {
  return new Promise((resolve) => {
    const brewServiceName = serviceName === 'mongodb' ? 'mongodb-community' : 'postgresql';
    exec(`brew services ${action} ${brewServiceName}`, (err, stdout, stderr) => {
      resolve({ success: !err, output: stdout || stderr });
    });
  });
});

// Helper to get command output
function getCommandOutput(cmd) {
  return new Promise(resolve => {
    exec(cmd, { env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}` } }, (err, stdout) => {
      resolve(err ? 'N/A' : stdout.trim());
    });
  });
}

// Configs to scan specification
const configsToScan = [
  {
    id: 'shell',
    category: 'Shell Configurations',
    description: '.zshrc, .zprofile, .zshenv configurations',
    paths: [
      { name: '.zshrc', path: '.zshrc' },
      { name: '.zprofile', path: '.zprofile' },
      { name: '.zshenv', path: '.zshenv' },
      { name: '.bashrc', path: '.bashrc' },
      { name: '.bash_profile', path: '.bash_profile' },
      { name: 'fish config', path: '.config/fish/config.fish' }
    ]
  },
  {
    id: 'git',
    category: 'Git Configuration',
    description: '.gitconfig global settings & ignore rules',
    paths: [
      { name: '.gitconfig', path: '.gitconfig' },
      { name: '.gitignore_global', path: '.gitignore_global' }
    ]
  },
  {
    id: 'ssh',
    category: 'SSH Keys & Configs',
    description: 'SSH private keys, configs & known hosts',
    paths: [
      { name: '.ssh directory', path: '.ssh' }
    ]
  },
  {
    id: 'vscode',
    category: 'VS Code Settings',
    description: 'User settings, keybindings, and snippets',
    paths: [
      { name: 'VS Code Settings', path: 'Library/Application Support/Code/User/settings.json' },
      { name: 'VS Code Keybindings', path: 'Library/Application Support/Code/User/keybindings.json' },
      { name: 'VS Code Snippets', path: 'Library/Application Support/Code/User/snippets' }
    ]
  },
  {
    id: 'antigravity',
    category: 'Antigravity IDE Config',
    description: 'AI Code Assistant workspace preferences',
    paths: [
      { name: 'Antigravity config', path: '.gemini/config' }
    ]
  },
  {
    id: 'node_env',
    category: 'Node.js & Package Configs',
    description: 'npm, yarn, and global package manager settings',
    paths: [
      { name: '.npmrc', path: '.npmrc' },
      { name: '.yarnrc', path: '.yarnrc' },
      { name: '.yarnrc.yml', path: '.yarnrc.yml' }
    ]
  },
  {
    id: 'mobile_dev',
    category: 'Mobile App Development (Flutter/Android/iOS)',
    description: 'Flutter configs, Android keys, Gradle, and Xcode user preferences',
    paths: [
      { name: 'Flutter config', path: '.config/flutter' },
      { name: 'Gradle config', path: '.gradle/gradle.properties' },
      { name: 'Maven config', path: '.m2/settings.xml' },
      { name: 'Xcode User Data', path: 'Library/Developer/Xcode/UserData' },
      { name: 'Android Keystore keys', path: '.android' }
    ]
  },
  {
    id: 'python_dev',
    category: 'Python Environment',
    description: 'pip configurations and Conda preferences',
    paths: [
      { name: '.condarc', path: '.condarc' },
      { name: 'pip config', path: 'Library/Application Support/pip/pip.conf' }
    ]
  },
  {
    id: 'docker',
    category: 'Container Configs',
    description: 'Docker authentication and config settings',
    paths: [
      { name: 'Docker config', path: '.docker/config.json' }
    ]
  }
];

// IPC: Scan and detect active environments
ipcMain.handle('detect-configs', async () => {
  const home = os.homedir();
  const result = {};

  for (const group of configsToScan) {
    const groupResult = {
      label: group.category,
      description: group.description,
      available: false,
      details: []
    };

    if (group.id === 'ssh') {
      const sshDir = path.join(home, '.ssh');
      if (fs.existsSync(sshDir)) {
        try {
          const files = fs.readdirSync(sshDir);
          files.forEach(file => {
            const filePath = path.join(sshDir, file);
            if (fs.statSync(filePath).isFile()) {
              const content = fs.readFileSync(filePath, 'utf8').substring(0, 100);
              if (content.includes('-----BEGIN')) {
                groupResult.available = true;
                groupResult.details.push(`Private Key: ${file}`);
              } else if (['config', 'known_hosts'].includes(file)) {
                groupResult.available = true;
                groupResult.details.push(`Config: ${file}`);
              }
            }
          });
        } catch (e) {}
      }
    } else {
      for (const item of group.paths) {
        const fullPath = path.join(home, item.path);
        if (fs.existsSync(fullPath)) {
          groupResult.available = true;
          groupResult.details.push(item.name);
        }
      }
    }

    result[group.id] = groupResult;
  }

  // Add Homebrew detection
  const hasBrew = await new Promise(resolve => {
    exec('which brew', (err) => resolve(!err));
  });
  result['brew'] = {
    label: 'Homebrew Packages',
    description: 'System formulas, casks, and taps list',
    available: hasBrew,
    details: hasBrew ? ['brew binary detected'] : []
  };

  // Add Node global package managers + FNM detection
  const hasNode = await new Promise(resolve => {
    exec('which node', (err) => resolve(!err));
  });
  const details = [];
  if (hasNode) {
    details.push('node binary detected');
    const hasFnm = await new Promise(resolve => {
      exec('which fnm', (err) => resolve(!err));
    });
    if (hasFnm) details.push('fnm version manager detected');
  }
  result['npm'] = {
    label: 'Node.js & Global Packages',
    description: 'FNM Node versions and npm/yarn/pnpm globals',
    available: hasNode,
    details: details
  };

  return result;
});

// Helper to generate JSON Backup object
async function generateBackupObject(selectedModules) {
  const home = os.homedir();
  const backup = {
    timestamp: new Date().toISOString(),
    system: {
      macos: await getCommandOutput('sw_vers | paste -sd " " -'),
      cpu: await getCommandOutput('sysctl -n machdep.cpu.brand_string'),
      memory: ''
    },
    backup_data: {}
  };

  const memSizeStr = await getCommandOutput('sysctl -n hw.memsize');
  if (memSizeStr !== 'N/A') {
    const bytes = parseInt(memSizeStr, 10);
    backup.system.memory = `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
  } else {
    backup.system.memory = 'N/A';
  }

  // 1. Shell Configurations
  if (selectedModules.shell) {
    backup.backup_data.shell = {};
    const group = configsToScan.find(g => g.id === 'shell');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        backup.backup_data.shell[item.path] = fs.readFileSync(fullPath, 'utf8');
      }
    });
  }

  // 2. Git
  if (selectedModules.git) {
    backup.backup_data.git = {};
    const group = configsToScan.find(g => g.id === 'git');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        backup.backup_data.git[item.path] = fs.readFileSync(fullPath, 'utf8');
      }
    });
  }

  // 3. SSH
  if (selectedModules.ssh) {
    backup.backup_data.ssh = { keys: {}, public_files: {} };
    const sshDir = path.join(home, '.ssh');
    if (fs.existsSync(sshDir)) {
      try {
        const files = fs.readdirSync(sshDir);
        files.forEach(file => {
          const filePath = path.join(sshDir, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('-----BEGIN')) {
              backup.backup_data.ssh.keys[file] = content;
            } else {
              backup.backup_data.ssh.public_files[file] = content;
            }
          }
        });
      } catch (err) {}
    }
  }

  // 4. VS Code
  if (selectedModules.vscode) {
    backup.backup_data.vscode = {};
    const group = configsToScan.find(g => g.id === 'vscode');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isFile()) {
          backup.backup_data.vscode[item.path] = fs.readFileSync(fullPath, 'utf8');
        } else if (fs.statSync(fullPath).isDirectory()) {
          const snippets = {};
          try {
            const files = fs.readdirSync(fullPath);
            files.forEach(f => {
              const fPath = path.join(fullPath, f);
              if (fs.statSync(fPath).isFile()) {
                snippets[f] = fs.readFileSync(fPath, 'utf8');
              }
            });
            backup.backup_data.vscode[item.path] = snippets;
          } catch (e) {}
        }
      }
    });
  }

  // 5. Antigravity IDE
  if (selectedModules.antigravity) {
    backup.backup_data.antigravity = {};
    const group = configsToScan.find(g => g.id === 'antigravity');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        try {
          const files = fs.readdirSync(fullPath);
          files.forEach(f => {
            const fPath = path.join(fullPath, f);
            if (fs.statSync(fPath).isFile() && f.endsWith('.json')) {
              backup.backup_data.antigravity[f] = fs.readFileSync(fPath, 'utf8');
            }
          });
        } catch (e) {}
      }
    });
  }

  // 6. Node env configs
  if (selectedModules.node_env) {
    backup.backup_data.node_env = {};
    const group = configsToScan.find(g => g.id === 'node_env');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        backup.backup_data.node_env[item.path] = fs.readFileSync(fullPath, 'utf8');
      }
    });
  }

  // 7. Mobile Development
  if (selectedModules.mobile_dev) {
    backup.backup_data.mobile_dev = {};
    const group = configsToScan.find(g => g.id === 'mobile_dev');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isFile()) {
          backup.backup_data.mobile_dev[item.path] = fs.readFileSync(fullPath, 'utf8');
        } else if (item.path.includes('Xcode/UserData') && fs.statSync(fullPath).isDirectory()) {
          const xcodeData = {};
          const keyBindingsPath = path.join(fullPath, 'KeyBindings');
          if (fs.existsSync(keyBindingsPath)) {
            try {
              const files = fs.readdirSync(keyBindingsPath);
              files.forEach(f => {
                const fPath = path.join(keyBindingsPath, f);
                if (fs.statSync(fPath).isFile()) {
                  xcodeData[`KeyBindings/${f}`] = fs.readFileSync(fPath, 'utf8');
                }
              });
            } catch (e) {}
          }
          backup.backup_data.mobile_dev[item.path] = xcodeData;
        }
      }
    });
  }

  // 8. Python Dev
  if (selectedModules.python_dev) {
    backup.backup_data.python_dev = {};
    const group = configsToScan.find(g => g.id === 'python_dev');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        backup.backup_data.python_dev[item.path] = fs.readFileSync(fullPath, 'utf8');
      }
    });
  }

  // 9. Docker
  if (selectedModules.docker) {
    backup.backup_data.docker = {};
    const group = configsToScan.find(g => g.id === 'docker');
    group.paths.forEach(item => {
      const fullPath = path.join(home, item.path);
      if (fs.existsSync(fullPath)) {
        backup.backup_data.docker[item.path] = fs.readFileSync(fullPath, 'utf8');
      }
    });
  }

  // 10. Homebrew Packages
  if (selectedModules.brew) {
    backup.backup_data.brew = {};
    const tempFile = path.join(os.tmpdir(), `Brewfile_${Date.now()}`);
    await new Promise(resolve => {
      exec(`brew bundle dump --force --file="${tempFile}"`, { env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}` } }, () => resolve());
    });
    if (fs.existsSync(tempFile)) {
      backup.backup_data.brew.brewfile = fs.readFileSync(tempFile, 'utf8');
      fs.unlinkSync(tempFile);
    }
  }

  // 11. Node & NPM/Yarn/PNPM global configurations
  if (selectedModules.npm) {
    backup.backup_data.npm = { globals: {}, fnm_versions: [] };
    
    // FNM node versions
    const fnmListStr = await getCommandOutput('fnm list');
    if (fnmListStr !== 'N/A') {
      const versions = fnmListStr.split('\n')
        .map(line => {
          const match = line.match(/(v\d+\.\d+\.\d+)/);
          return match ? match[1] : null;
        })
        .filter(v => v !== null);
      backup.backup_data.npm.fnm_versions = [...new Set(versions)];
    }

    // NPM Globals
    const npmListStr = await getCommandOutput('npm list -g --depth=0 --json');
    if (npmListStr !== 'N/A') {
      try {
        const parsed = JSON.parse(npmListStr);
        backup.backup_data.npm.globals.npm = Object.keys(parsed.dependencies || {});
      } catch (e) {}
    }

    // Yarn Globals
    const yarnListStr = await getCommandOutput('yarn global list --depth=0');
    if (yarnListStr !== 'N/A') {
      const yarnPackages = [];
      yarnListStr.split('\n').forEach(line => {
        const match = line.match(/info "([^@]+)@/);
        if (match) yarnPackages.push(match[1]);
      });
      backup.backup_data.npm.globals.yarn = yarnPackages;
    }

    // PNPM Globals
    const pnpmListStr = await getCommandOutput('pnpm list -g --depth=0 --json');
    if (pnpmListStr !== 'N/A') {
      try {
        const parsed = JSON.parse(pnpmListStr);
        const deps = parsed[0]?.dependencies || {};
        backup.backup_data.npm.globals.pnpm = Object.keys(deps);
      } catch (e) {}
    }
  }

  return backup;
}

// Encryption helper
function encryptData(dataObject, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const plaintext = JSON.stringify(dataObject);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext
  };
}

// Decryption helper
function decryptData(encryptedObj, password) {
  const salt = Buffer.from(encryptedObj.salt, 'hex');
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const tag = Buffer.from(encryptedObj.tag, 'hex');
  const key = crypto.scryptSync(password, salt, 32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedObj.backup_data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

ipcMain.handle('execute-backup', async (event, { selectedModules, password }) => {
  const backup = await generateBackupObject(selectedModules);
  if (password && password.trim() !== '') {
    try {
      const encrypted = encryptData(backup.backup_data, password);
      backup.encrypted = true;
      backup.salt = encrypted.salt;
      backup.iv = encrypted.iv;
      backup.tag = encrypted.tag;
      backup.backup_data = encrypted.ciphertext;
    } catch (e) {
      console.error('Encryption failed:', e);
    }
  } else {
    backup.encrypted = false;
  }
  return backup;
});

// IPC: Native save dialog to export backup JSON
ipcMain.handle('save-json-file', async (event, { content, defaultName }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Backup JSON',
    defaultPath: path.join(os.homedir(), 'Downloads', defaultName),
    filters: [{ name: 'JSON files', extensions: ['json'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    return { success: true, path: filePath };
  }
  return { success: false };
});

// IPC: Native open dialog to load backup JSON
ipcMain.handle('load-json-file', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Backup JSON File',
    filters: [{ name: 'JSON files', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (filePaths && filePaths.length > 0) {
    try {
      const content = fs.readFileSync(filePaths[0], 'utf8');
      const parsed = JSON.parse(content);
      
      // Basic validation
      if (parsed.timestamp && parsed.system && parsed.hasOwnProperty('backup_data')) {
        return { success: true, data: parsed, path: filePaths[0] };
      } else {
        return { success: false, error: 'Invalid backup file structure' };
      }
    } catch (e) {
      return { success: false, error: 'Failed to read or parse JSON file' };
    }
  }
  return { success: false };
});

// IPC: Decrypt backup JSON
ipcMain.handle('decrypt-backup', async (event, { backupData, password }) => {
  if (!backupData.encrypted) {
    return { success: true, decryptedData: backupData.backup_data };
  }
  try {
    const decrypted = decryptData(backupData, password);
    return { success: true, decryptedData: decrypted };
  } catch (err) {
    return { success: false, error: 'Incorrect password or corrupted backup file.' };
  }
});

// IPC: Execute restore from imported JSON data
ipcMain.handle('execute-restore', async (event, { backupData, selectedModules }) => {
  const home = os.homedir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Phase A: Generate Safety Rollback JSON for the modules about to be overwritten
  const rollbackModules = {};
  for (const key in selectedModules) {
    if (selectedModules[key]) rollbackModules[key] = true;
  }
  
  // Invoke backup routine on local configs that will be overwritten
  const rollbackObj = await generateBackupObject(rollbackModules);
  
  // Open save dialog for the safety rollback JSON
  const { filePath: rollbackPath } = await dialog.showSaveDialog(mainWindow, {
    title: '⚠️ Save Safety Rollback JSON (Undo Backup)',
    defaultPath: path.join(home, 'Downloads', `safety_rollback_${timestamp}.json`),
    filters: [{ name: 'JSON files', extensions: ['json'] }]
  });

  if (rollbackPath) {
    fs.writeFileSync(rollbackPath, JSON.stringify(rollbackObj, null, 2), 'utf8');
    event.sender.send('script-stdout', `> Safety rollback backup saved to: ${rollbackPath}\n`);
  } else {
    event.sender.send('script-stdout', `> ⚠️ Safety rollback canceled by user. Restoring without safety checkpoint...\n`);
  }

  const tempBackupsCreated = [];

  // Helper to safely write file with backup
  const safeWriteFile = (relPath, content) => {
    const fullPath = path.resolve(home, relPath);
    const relative = path.relative(home, fullPath);
    const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    if (!isSafe) {
      throw new Error(`Security Violation: Path traversal blocked for: ${relPath}`);
    }

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${timestamp}`;
      fs.copyFileSync(fullPath, backupPath);
      tempBackupsCreated.push(backupPath);
      event.sender.send('script-stdout', `✓ Backup created: ${relPath} -> ${path.basename(backupPath)}\n`);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    event.sender.send('script-stdout', `✓ Restored configuration: ${relPath}\n`);
  };

  // Phase B: Restore selected components
  const data = backupData.backup_data;

  // 1. Shell
  if (selectedModules.shell && data.shell) {
    event.sender.send('script-stdout', `\n[1] Restoring Shell configurations...\n`);
    for (const relPath in data.shell) {
      safeWriteFile(relPath, data.shell[relPath]);
    }
  }

  // 2. Git
  if (selectedModules.git && data.git) {
    event.sender.send('script-stdout', `\n[2] Restoring Git configuration...\n`);
    for (const relPath in data.git) {
      safeWriteFile(relPath, data.git[relPath]);
    }
  }

  // 3. SSH
  if (selectedModules.ssh && data.ssh) {
    event.sender.send('script-stdout', `\n[3] Restoring SSH configurations...\n`);
    const sshDir = path.join(home, '.ssh');
    
    // Backup entire .ssh directory if it exists
    if (fs.existsSync(sshDir)) {
      const backupDir = `${sshDir}.backup.${timestamp}`;
      fs.renameSync(sshDir, backupDir);
      tempBackupsCreated.push(backupDir);
      event.sender.send('script-stdout', `✓ Backup created: .ssh -> ${path.basename(backupDir)}\n`);
    }
    fs.mkdirSync(sshDir, { recursive: true });

    // Restore private keys
    if (data.ssh.keys) {
      for (const file in data.ssh.keys) {
        fs.writeFileSync(path.join(sshDir, file), data.ssh.keys[file], 'utf8');
        event.sender.send('script-stdout', `✓ Restored private key: ${file}\n`);
      }
    }

    // Restore public config files
    if (data.ssh.public_files) {
      for (const file in data.ssh.public_files) {
        fs.writeFileSync(path.join(sshDir, file), data.ssh.public_files[file], 'utf8');
        event.sender.send('script-stdout', `✓ Restored config file: ${file}\n`);
      }
    }

    // Set correct permissions
    fs.chmodSync(sshDir, 0o700);
    try {
      const files = fs.readdirSync(sshDir);
      files.forEach(f => {
        fs.chmodSync(path.join(sshDir, f), 0o600);
      });
      event.sender.send('script-stdout', `✓ Applied secure permissions (700 for .ssh, 600 for files)\n`);
    } catch (e) {}
  }

  // 4. VS Code
  if (selectedModules.vscode && data.vscode) {
    event.sender.send('script-stdout', `\n[4] Restoring VS Code Settings...\n`);
    for (const relPath in data.vscode) {
      const content = data.vscode[relPath];
      if (typeof content === 'string') {
        safeWriteFile(relPath, content);
      } else {
        const fullDir = path.join(home, relPath);
        fs.mkdirSync(fullDir, { recursive: true });
        for (const file in content) {
          fs.writeFileSync(path.join(fullDir, file), content[file], 'utf8');
        }
        event.sender.send('script-stdout', `✓ Restored snippets directory: ${relPath}\n`);
      }
    }
  }

  // 5. Antigravity IDE
  if (selectedModules.antigravity && data.antigravity) {
    event.sender.send('script-stdout', `\n[5] Restoring Antigravity settings...\n`);
    const targetDir = '.gemini/config';
    for (const file in data.antigravity) {
      safeWriteFile(path.join(targetDir, file), data.antigravity[file]);
    }
  }

  // 6. Node Env
  if (selectedModules.node_env && data.node_env) {
    event.sender.send('script-stdout', `\n[6] Restoring Node configurations...\n`);
    for (const relPath in data.node_env) {
      safeWriteFile(relPath, data.node_env[relPath]);
    }
  }

  // 7. Mobile Development
  if (selectedModules.mobile_dev && data.mobile_dev) {
    event.sender.send('script-stdout', `\n[7] Restoring Mobile development preferences...\n`);
    for (const relPath in data.mobile_dev) {
      const content = data.mobile_dev[relPath];
      if (typeof content === 'string') {
        safeWriteFile(relPath, content);
      } else {
        const fullDir = path.join(home, relPath);
        fs.mkdirSync(path.join(fullDir, 'KeyBindings'), { recursive: true });
        for (const file in content) {
          fs.writeFileSync(path.join(fullDir, file), content[file], 'utf8');
        }
        event.sender.send('script-stdout', `✓ Restored Xcode UserData preferences: ${relPath}\n`);
      }
    }
  }

  // 8. Python Dev
  if (selectedModules.python_dev && data.python_dev) {
    event.sender.send('script-stdout', `\n[8] Restoring Python preferences...\n`);
    for (const relPath in data.python_dev) {
      safeWriteFile(relPath, data.python_dev[relPath]);
    }
  }

  // 9. Docker
  if (selectedModules.docker && data.docker) {
    event.sender.send('script-stdout', `\n[9] Restoring Docker settings...\n`);
    for (const relPath in data.docker) {
      safeWriteFile(relPath, data.docker[relPath]);
    }
  }

  // 10. Homebrew Packages
  let brewPromise = Promise.resolve();
  if (selectedModules.brew && data.brew && data.brew.brewfile) {
    event.sender.send('script-stdout', `\n[10] Restoring Homebrew packages (Brewfile)... (Running in background, this may take a few minutes)\n`);
    const tempFile = path.join(os.tmpdir(), `Brewfile_restore_${Date.now()}`);
    fs.writeFileSync(tempFile, data.brew.brewfile, 'utf8');
    
    brewPromise = new Promise(resolve => {
      const brewProcess = spawn('brew', ['bundle', '--file', tempFile], {
        env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}` }
      });
      brewProcess.stdout.on('data', (d) => event.sender.send('script-stdout', d.toString()));
      brewProcess.stderr.on('data', (d) => event.sender.send('script-stdout', d.toString()));
      brewProcess.on('close', () => {
        fs.unlinkSync(tempFile);
        event.sender.send('script-stdout', `✓ Homebrew packages restored successfully\n`);
        resolve();
      });
    });
  }

  // 11. NPM Globals + FNM node versions
  await brewPromise;
  if (selectedModules.npm && data.npm) {
    event.sender.send('script-stdout', `\n[11] Restoring Node versions and global packages...\n`);
    
    // Restore node versions via fnm
    if (data.npm.fnm_versions && data.npm.fnm_versions.length > 0) {
      for (const version of data.npm.fnm_versions) {
        event.sender.send('script-stdout', `> Installing Node ${version} via FNM...\n`);
        await new Promise(resolve => {
          exec(`fnm install ${version}`, { env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}` } }, () => resolve());
        });
      }
      await new Promise(resolve => {
        exec(`fnm default ${data.npm.fnm_versions[0]}`, { env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}` } }, () => resolve());
      });
      event.sender.send('script-stdout', `✓ FNM node versions restored\n`);
    }

    // Restore npm global packages
    if (data.npm.globals) {
      const envPath = { env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}` } };
      
      if (data.npm.globals.npm && data.npm.globals.npm.length > 0) {
        event.sender.send('script-stdout', `> Restoring npm global packages: ${data.npm.globals.npm.join(', ')}\n`);
        await new Promise(resolve => {
          exec(`npm install -g ${data.npm.globals.npm.join(' ')}`, envPath, () => resolve());
        });
        event.sender.send('script-stdout', `✓ npm globals restored\n`);
      }

      if (data.npm.globals.yarn && data.npm.globals.yarn.length > 0) {
        event.sender.send('script-stdout', `> Restoring Yarn global packages: ${data.npm.globals.yarn.join(', ')}\n`);
        await new Promise(resolve => {
          exec(`yarn global add ${data.npm.globals.yarn.join(' ')}`, envPath, () => resolve());
        });
        event.sender.send('script-stdout', `✓ Yarn globals restored\n`);
      }

      if (data.npm.globals.pnpm && data.npm.globals.pnpm.length > 0) {
        event.sender.send('script-stdout', `> Restoring pnpm global packages: ${data.npm.globals.pnpm.join(', ')}\n`);
        await new Promise(resolve => {
          exec(`pnpm add -g ${data.npm.globals.pnpm.join(' ')}`, envPath, () => resolve());
        });
        event.sender.send('script-stdout', `✓ pnpm globals restored\n`);
      }
    }
  }

  event.sender.send('script-stdout', `\n========================================\n`);
  
  // Cleanup temporary backups if everything succeeded
  if (tempBackupsCreated.length > 0) {
    event.sender.send('script-stdout', `> Cleaning up temporary file backups...\n`);
    for (const backupPath of tempBackupsCreated) {
      try {
        fs.rmSync(backupPath, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete temporary backup: ${backupPath}`, err);
      }
    }
    event.sender.send('script-stdout', `✓ Temporary file backups removed.\n`);
  }

  event.sender.send('script-stdout', `✅ RESTORE PIPELINE COMPLETED SUCCESSFULLY!\n`);
  event.sender.send('script-stdout', `========================================\n`);

  return { success: true };
});
