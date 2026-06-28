const terminalBody = document.getElementById('terminal-body');
const btnTerminate = document.getElementById('btn-terminate');

// Service badges
const statusPostgres = document.getElementById('status-postgres');
const statusMongo = document.getElementById('status-mongo');



let stdoutUnsubscribe = null;
let stderrUnsubscribe = null;
let exitUnsubscribe = null;
let activeScriptName = null;
let backupPerformed = false;

// Initialize app stats and polling
window.addEventListener('DOMContentLoaded', () => {
  checkServicesStatus();
  
  // Set initial placeholder text for backup tab
  const backupChecklist = document.getElementById('backup-checklist');
  if (backupChecklist) {
    backupChecklist.innerHTML = '<div class="loading-placeholder" style="cursor: pointer;" onclick="switchTab(\'backup-tab\')">Click the "📦 Backup Profile" tab above to scan environment configurations.</div>';
  }

  // Initialize active tab indicator with a slight delay to allow layout calculation
  setTimeout(updateTabIndicator, 150);
  
  // Track window resizing to reposition tab slider indicator
  window.addEventListener('resize', updateTabIndicator);

  // Poll services status every 10 seconds
  setInterval(checkServicesStatus, 10000);
});

// Check Services Status via Brew CLI
async function checkServicesStatus() {
  const status = await window.electronAPI.checkServices();
  
  const btnStartPostgres = document.getElementById('btn-start-postgresql');
  const btnStopPostgres = document.getElementById('btn-stop-postgresql');
  const btnStartMongo = document.getElementById('btn-start-mongodb');
  const btnStopMongo = document.getElementById('btn-stop-mongodb');

  if (status.postgresql === 'started') {
    statusPostgres.innerHTML = '<span class="heartbeat-dot"></span> Running';
    statusPostgres.className = 'status-badge status-started';
    if (btnStartPostgres) btnStartPostgres.disabled = true;
    if (btnStopPostgres) btnStopPostgres.disabled = false;
  } else {
    statusPostgres.innerHTML = '<span class="heartbeat-dot"></span> Stopped';
    statusPostgres.className = 'status-badge status-stopped';
    if (btnStartPostgres) btnStartPostgres.disabled = false;
    if (btnStopPostgres) btnStopPostgres.disabled = true;
  }

  if (status.mongodb === 'started') {
    statusMongo.innerHTML = '<span class="heartbeat-dot"></span> Running';
    statusMongo.className = 'status-badge status-started';
    if (btnStartMongo) btnStartMongo.disabled = true;
    if (btnStopMongo) btnStopMongo.disabled = false;
  } else {
    statusMongo.innerHTML = '<span class="heartbeat-dot"></span> Stopped';
    statusMongo.className = 'status-badge status-stopped';
    if (btnStartMongo) btnStartMongo.disabled = false;
    if (btnStopMongo) btnStopMongo.disabled = true;
  }
}

// Start or Stop a service via brew services
async function controlService(serviceName, action) {
  const badge = serviceName === 'postgresql' ? statusPostgres : statusMongo;
  const serviceLabel = serviceName === 'postgresql' ? 'PostgreSQL' : 'MongoDB';
  const btnStart = document.getElementById(`btn-start-${serviceName}`);
  const btnStop = document.getElementById(`btn-stop-${serviceName}`);
  
  // Disable both buttons during operation
  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = true;
  
  badge.innerHTML = `<span class="heartbeat-dot"></span> ${action === 'start' ? 'Starting...' : 'Stopping...'}`;
  badge.className = 'status-badge status-checking';
  
  showToast(`Service ${serviceLabel}: Initiating ${action}...`, 'info');
  
  // Output to terminal
  ensureTerminalExpanded();
  appendLog(`> ${action === 'start' ? 'Starting' : 'Stopping'} ${serviceLabel} service...\n`, 'info');
  
  try {
    const res = await window.electronAPI.toggleService(serviceName, action);
    if (res && res.success) {
      showToast(`Service ${serviceLabel} ${action}ed successfully.`, 'success');
      appendLog(`✓ ${serviceLabel} ${action}ed successfully.\n`, 'success');
      if (res.output) {
        appendLog(`${res.output}\n`, 'stdout');
      }
    } else {
      showToast(`Failed to ${action} Service ${serviceLabel}.`, 'error');
      appendLog(`❌ Failed to ${action} ${serviceLabel}.\n`, 'error');
      if (res && res.output) {
        appendLog(`${res.output}\n`, 'stderr');
      }
    }
  } catch (err) {
    console.error(err);
    showToast(`Error toggling service: ${err.message}`, 'error');
    appendLog(`❌ Error toggling service: ${err.message}\n`, 'error');
  }
  
  // Refresh status
  await checkServicesStatus();
}

// Floating Toast Notification API
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-content">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Animate fade-out and remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 4000);
}

// Checklist Search Filters
function filterBackupChecklist() {
  const query = document.getElementById('backup-search').value.toLowerCase();
  const cards = document.querySelectorAll('#backup-checklist .checkbox-card');
  cards.forEach(card => {
    const label = card.querySelector('.checkbox-label')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.checkbox-desc')?.textContent.toLowerCase() || '';
    const details = card.querySelector('.checkbox-details')?.textContent.toLowerCase() || '';
    if (label.includes(query) || desc.includes(query) || details.includes(query)) {
      card.classList.remove('hidden-card');
    } else {
      card.classList.add('hidden-card');
    }
  });
}

function filterRestoreChecklist() {
  const query = document.getElementById('restore-search').value.toLowerCase();
  const cards = document.querySelectorAll('#restore-checklist .checkbox-card');
  cards.forEach(card => {
    const label = card.querySelector('.checkbox-label')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.checkbox-desc')?.textContent.toLowerCase() || '';
    const details = card.querySelector('.checkbox-details')?.textContent.toLowerCase() || '';
    if (label.includes(query) || desc.includes(query) || details.includes(query)) {
      card.classList.remove('hidden-card');
    } else {
      card.classList.add('hidden-card');
    }
  });
}

// Position horizontal sliding tab pill indicator
function updateTabIndicator() {
  const activeBtn = document.querySelector('.tab-btn.active');
  const indicator = document.getElementById('tab-slider-indicator');
  if (activeBtn && indicator) {
    indicator.style.left = `${activeBtn.offsetLeft}px`;
    indicator.style.top = `${activeBtn.offsetTop}px`;
    indicator.style.width = `${activeBtn.offsetWidth}px`;
    indicator.style.height = `${activeBtn.offsetHeight}px`;
  }
}

// Human readable file size formatter
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Scan and format shell logs for keyword highlighted spans
function highlightKeywords(text) {
  let formatted = text;
  
  // Inject tags via temporary custom markers to prevent matching attributes of created HTML
  formatted = formatted.replace(/\b(success|successfully|completed|restored)\b/gi, '__SUCCESS_START__$1__SUCCESS_END__');
  formatted = formatted.replace(/✓/g, '__SUCCESS_START__✓__SUCCESS_END__');
  
  formatted = formatted.replace(/\b(warning|cancelled|checkpoint)\b/gi, '__WARNING_START__$1__WARNING_END__');
  formatted = formatted.replace(/⚠️/g, '__WARNING_START__⚠️__WARNING_END__');
  
  formatted = formatted.replace(/\b(error|failed|fail)\b/gi, '__ERROR_START__$1__ERROR_END__');
  formatted = formatted.replace(/❌/g, '__ERROR_START__❌__ERROR_END__');
  
  formatted = formatted.replace(/(\[\d+\])/g, '__INFO_START__$1__INFO_END__');
  formatted = formatted.replace(/(^|\s)(&gt;|>)/g, '$1__INFO_START__$2__INFO_END__');
  
  return formatted;
}

// Convert ANSI color escape codes into beautiful HTML
function ansiToHtml(text) {
  let highlighted = highlightKeywords(text);
  
  let formatted = highlighted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Handle standard ANSI Colors
  formatted = formatted.replace(/\x1b\[(0;)?32m/g, '<span class="text-green">');
  formatted = formatted.replace(/\x1b\[(0;)?31m/g, '<span class="text-red">');
  formatted = formatted.replace(/\x1b\[(0;33m|1;33m)/g, '<span class="text-yellow">');
  formatted = formatted.replace(/\x1b\[(0;)?36m/g, '<span class="text-cyan">');
  formatted = formatted.replace(/\x1b\[1m/g, '<span class="text-bold">');
  formatted = formatted.replace(/\x1b\[(0)?m/g, '</span>');

  // Convert custom markers to final CSS colored highlight spans
  formatted = formatted.replace(/__SUCCESS_START__/g, '<span class="log-highlight-success">')
                       .replace(/__SUCCESS_END__/g, '</span>')
                       .replace(/__WARNING_START__/g, '<span class="log-highlight-warning">')
                       .replace(/__WARNING_END__/g, '</span>')
                       .replace(/__ERROR_START__/g, '<span class="log-highlight-error">')
                       .replace(/__ERROR_END__/g, '</span>')
                       .replace(/__INFO_START__/g, '<span class="log-highlight-info">')
                       .replace(/__INFO_END__/g, '</span>');

  return formatted;
}

// Switch dashboard tabs
async function switchTab(tabId) {
  // Hide all panels
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  // Deactivate all buttons
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(b => {
    b.classList.remove('active');
  });

  // Show selected panel
  const activePanel = document.getElementById(tabId);
  if (activePanel) {
    activePanel.style.display = 'flex';
    activePanel.offsetHeight; // Force reflow to run CSS panel transition
    activePanel.classList.add('active');
  }

  // Activate selected button
  const btnId = 'tab-btn-' + tabId.split('-')[0];
  const activeBtn = document.getElementById(btnId);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Reposition sliding pill tab highlight
  updateTabIndicator();

  // If switched to backup tab, trigger environment scan
  if (tabId === 'backup-tab') {
    await scanBackupEnvironment();
  }
}

// Scan Backup Environment
async function scanBackupEnvironment() {
  const container = document.getElementById('backup-checklist');
  if (!container) return;
  container.innerHTML = '<div class="loading-placeholder">Scanning environment configurations...</div>';
  
  const btnExport = document.getElementById('btn-export-backup');
  if (btnExport) btnExport.disabled = true;

  const btnRescan = document.getElementById('btn-rescan-backup');
  if (btnRescan) btnRescan.disabled = true;

  showToast('Scanning environment configurations...', 'info');

  try {
    const results = await window.electronAPI.detectLocalConfigs();
    container.innerHTML = '';
    
    for (const [key, val] of Object.entries(results)) {
      const card = document.createElement('label');
      card.className = `checkbox-card${val.available ? '' : ' disabled-card'}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `backup-chk-${key}`;
      checkbox.dataset.key = key;
      if (!val.available) {
        checkbox.disabled = true;
      } else {
        checkbox.checked = true;
        checkbox.addEventListener('change', updateBackupButtonState);
      }
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'checkbox-info';
      
      const labelSpan = document.createElement('span');
      labelSpan.className = 'checkbox-label';
      labelSpan.textContent = val.label;
      
      const descSpan = document.createElement('span');
      descSpan.className = 'checkbox-desc';
      descSpan.textContent = val.description;
      
      const detailsSpan = document.createElement('span');
      detailsSpan.className = 'checkbox-details';
      if (val.available) {
        detailsSpan.textContent = val.details.join(', ');
      } else {
        detailsSpan.textContent = 'Not detected';
        detailsSpan.style.color = 'var(--text-muted)';
      }
      
      infoDiv.appendChild(labelSpan);
      infoDiv.appendChild(descSpan);
      infoDiv.appendChild(detailsSpan);
      
      card.appendChild(checkbox);
      card.appendChild(infoDiv);
      
      container.appendChild(card);
    }
    
    updateBackupButtonState();
  } catch (err) {
    container.innerHTML = `<div class="text-red" style="padding: 10px;">Error scanning configurations: ${err.message}</div>`;
  } finally {
    if (btnRescan) btnRescan.disabled = false;
  }
}

function updateBackupButtonState() {
  const checkboxes = document.querySelectorAll('#backup-checklist input[type="checkbox"]');
  const btnExport = document.getElementById('btn-export-backup');
  if (!btnExport) return;
  let anyChecked = false;
  checkboxes.forEach(chk => {
    if (chk.checked) anyChecked = true;
  });
  btnExport.disabled = !anyChecked;
}

// Generate Backup JSON and save it
async function runBackup() {
  const btnExport = document.getElementById('btn-export-backup');
  if (btnExport) btnExport.disabled = true;
  
  ensureTerminalExpanded();
  clearTerminal();
  const terminalSection = document.querySelector('.terminal-container');
  if (terminalSection) {
    terminalSection.scrollIntoView({ behavior: 'smooth' });
  }

  appendLog('> Initiating backup process...\n', 'stdout');
  showToast('Initiating environment backup...', 'info');
  toggleUI(true);
  
  const selections = {};
  const checkboxes = document.querySelectorAll('#backup-checklist input[type="checkbox"]');
  checkboxes.forEach(chk => {
    if (chk.checked) {
      selections[chk.dataset.key] = true;
    }
  });

  const passwordField = document.getElementById('backup-password');
  const password = passwordField ? passwordField.value : '';

  try {
    const backupObj = await window.electronAPI.exportBackup(selections, password);
    appendLog('✓ Backup data compiled successfully. Prompting for destination file...\n', 'stdout');
    showToast('Backup compiled. Select destination folder.', 'info');
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const defaultName = `macsetup_backup_${dateStr}.json`;
    const saveResult = await window.electronAPI.saveJsonFile(backupObj, defaultName);
    
    if (saveResult.success) {
      appendLog(`\n✅ Backup successfully generated and saved to:\n   ${saveResult.path}\n`, 'success');
      showToast('Backup successfully generated and saved!', 'success');
      backupPerformed = true;
      if (passwordField) passwordField.value = '';
    } else {
      appendLog(`\n⚠️ Backup export cancelled by user.\n`, 'stderr');
      showToast('Backup export cancelled.', 'info');
    }
  } catch (err) {
    appendLog(`\n❌ Backup failed: ${err.message}\n`, 'error');
    showToast(`Backup failed: ${err.message}`, 'error');
  } finally {
    toggleUI(false);
    updateBackupButtonState();
  }
}

// Restore Tab management
let currentLoadedBackup = null;
let decryptedBackupData = null;

async function browseBackupFile() {
  try {
    const result = await window.electronAPI.loadJsonFile();
    if (result.success) {
      currentLoadedBackup = result.data;
      decryptedBackupData = null;
      
      const pathEl = document.getElementById('selected-file-path');
      if (pathEl) {
        pathEl.textContent = result.path;
        pathEl.classList.remove('text-muted');
      }
      
      const decryptCard = document.getElementById('restore-decrypt-card');
      const metaCard = document.getElementById('restore-meta-card');
      
      if (currentLoadedBackup.encrypted) {
        if (decryptCard) decryptCard.style.display = 'block';
        if (metaCard) metaCard.style.display = 'none';
        const pwdInput = document.getElementById('restore-password');
        if (pwdInput) {
          pwdInput.value = '';
          pwdInput.focus();
        }
        showToast('Encrypted backup profile detected. Enter password.', 'info');
      } else {
        if (decryptCard) decryptCard.style.display = 'none';
        decryptedBackupData = currentLoadedBackup.backup_data;
        loadDecryptedProfile();
      }
    } else if (result.error) {
      clearTerminal();
      appendLog(`❌ Failed to load backup: ${result.error}\n`, 'error');
      showToast(`Failed to load backup: ${result.error}`, 'error');
    }
  } catch (err) {
    clearTerminal();
    appendLog(`❌ Error loading file: ${err.message}\n`, 'error');
    showToast(`Error loading file: ${err.message}`, 'error');
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  }
}

async function unlockBackupFile() {
  if (!currentLoadedBackup) return;
  const pwdInput = document.getElementById('restore-password');
  const password = pwdInput ? pwdInput.value : '';
  
  showToast('Decrypting profile...', 'info');
  const res = await window.electronAPI.decryptBackup(currentLoadedBackup, password);
  
  if (res.success) {
    decryptedBackupData = res.decryptedData;
    const decryptCard = document.getElementById('restore-decrypt-card');
    if (decryptCard) decryptCard.style.display = 'none';
    if (pwdInput) pwdInput.value = '';
    loadDecryptedProfile();
    showToast('Profile successfully decrypted and unlocked!', 'success');
  } else {
    showToast(res.error || 'Decryption failed.', 'error');
    if (pwdInput) pwdInput.focus();
  }
}

function loadDecryptedProfile() {
  const metaCard = document.getElementById('restore-meta-card');
  if (metaCard) metaCard.style.display = 'block';
  
  document.getElementById('meta-date').textContent = new Date(currentLoadedBackup.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
  document.getElementById('meta-macos').textContent = currentLoadedBackup.system.macos || 'N/A';
  document.getElementById('meta-cpu').textContent = currentLoadedBackup.system.cpu || 'N/A';
  document.getElementById('meta-mem').textContent = currentLoadedBackup.system.memory || 'N/A';
  
  const backupStr = JSON.stringify(currentLoadedBackup);
  document.getElementById('meta-size').textContent = formatBytes(backupStr.length);
  
  const keysToCheck = ['shell', 'git', 'ssh', 'vscode', 'antigravity', 'node_env', 'mobile_dev', 'python_dev', 'docker', 'brew', 'npm'];
  let presentCount = 0;
  if (decryptedBackupData) {
    keysToCheck.forEach(key => {
      if (decryptedBackupData[key]) {
        presentCount++;
      }
    });
  }
  document.getElementById('meta-coverage-count').textContent = `${presentCount}/${keysToCheck.length}`;
  
  const percent = presentCount / keysToCheck.length;
  const strokeDashoffset = 263.89 - (percent * 263.89);
  const ring = document.getElementById('progress-ring-circle');
  if (ring) {
    ring.style.strokeDashoffset = strokeDashoffset;
  }
  
  populateRestoreChecklist();
}

function populateRestoreChecklist() {
  const componentLabels = {
    shell: { label: 'Shell Configurations', desc: '.zshrc, .zprofile, .zshenv configs' },
    git: { label: 'Git Configuration', desc: '.gitconfig global settings & ignore rules' },
    ssh: { label: 'SSH Keys & Configs', desc: 'SSH private keys, configs & known hosts' },
    vscode: { label: 'VS Code Settings', desc: 'User settings, keybindings, and snippets' },
    antigravity: { label: 'Antigravity IDE Config', desc: 'AI Code Assistant workspace preferences' },
    node_env: { label: 'Node.js & Package Configs', desc: 'npm, yarn, and global package manager settings' },
    mobile_dev: { label: 'Mobile App Development', desc: 'Flutter configs, Android keys, Gradle, and Xcode user preferences' },
    python_dev: { label: 'Python Environment', desc: 'pip configurations and Conda preferences' },
    docker: { label: 'Container Configs', desc: 'Docker authentication and config settings' },
    brew: { label: 'Homebrew Packages', desc: 'System formulas, casks, and taps list' },
    npm: { label: 'Node.js & Global Packages', desc: 'FNM Node versions and npm/yarn/pnpm globals' }
  };

  const container = document.getElementById('restore-checklist');
  if (!container) return;
  container.innerHTML = '';
  
  for (const [key, meta] of Object.entries(componentLabels)) {
    const hasData = !!(decryptedBackupData && decryptedBackupData[key]);
    
    const card = document.createElement('label');
    card.className = `checkbox-card${hasData ? '' : ' disabled-card'}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `restore-chk-${key}`;
    checkbox.dataset.key = key;
    if (!hasData) {
      checkbox.disabled = true;
    } else {
      checkbox.checked = true;
      checkbox.addEventListener('change', updateRestoreButtonState);
    }
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'checkbox-info';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'checkbox-label';
    labelSpan.textContent = meta.label;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'checkbox-desc';
    descSpan.textContent = meta.desc;
    
    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'checkbox-details';
    if (hasData) {
      if (key === 'ssh' && decryptedBackupData.ssh && decryptedBackupData.ssh.keys) {
        const keyNames = Object.keys(decryptedBackupData.ssh.keys);
        detailsSpan.textContent = `Keys: ${keyNames.join(', ')}`;
      } else if (key === 'npm' && decryptedBackupData.npm && decryptedBackupData.npm.fnm_versions) {
        detailsSpan.textContent = `FNM Versions: ${decryptedBackupData.npm.fnm_versions.join(', ')}`;
      } else {
        detailsSpan.textContent = 'Backup data available';
      }
    } else {
      detailsSpan.textContent = 'Not present in backup file';
      detailsSpan.style.color = 'var(--text-muted)';
    }
    
    infoDiv.appendChild(labelSpan);
    infoDiv.appendChild(descSpan);
    infoDiv.appendChild(detailsSpan);
    
    card.appendChild(checkbox);
    card.appendChild(infoDiv);
    
    container.appendChild(card);
  }
  updateRestoreButtonState();
}

function updateRestoreButtonState() {
  const checkboxes = document.querySelectorAll('#restore-checklist input[type="checkbox"]');
  const btnRestore = document.getElementById('btn-execute-restore');
  if (!btnRestore) return;
  let anyChecked = false;
  checkboxes.forEach(chk => {
    if (chk.checked) anyChecked = true;
  });
  btnRestore.disabled = !anyChecked;
}

async function runRestore() {
  if (!currentLoadedBackup || !decryptedBackupData) return;

  const confirmRestore = window.confirm("⚠️ WARNING: This will overwrite your active environment configuration files (such as .zshrc, SSH keys, VS Code settings). Any existing files will be backed up with a timestamp. Are you sure you want to proceed?");
  if (!confirmRestore) {
    appendLog('> Restore operation cancelled by user.\n', 'stderr');
    showToast('Restore operation cancelled.', 'info');
    return;
  }

  ensureTerminalExpanded();

  const selections = {};
  const checkboxes = document.querySelectorAll('#restore-checklist input[type="checkbox"]');
  checkboxes.forEach(chk => {
    if (chk.checked) {
      selections[chk.dataset.key] = true;
    }
  });

  clearTerminal();
  const terminalSection = document.querySelector('.terminal-container');
  if (terminalSection) {
    terminalSection.scrollIntoView({ behavior: 'smooth' });
  }

  appendLog('> Initiating restore pipeline...\n', 'stdout');
  showToast('Initiating restore pipeline...', 'info');
  toggleUI(true);

  // Subscribe to logs
  const restoreStdoutSub = window.electronAPI.onStdout((data) => {
    appendLog(data, 'stdout');
  });

  try {
    const decryptedProfile = {
      ...currentLoadedBackup,
      backup_data: decryptedBackupData
    };
    const result = await window.electronAPI.executeRestore(decryptedProfile, selections);
    if (result.success) {
      appendLog('\n✅ Restore operation completed successfully!\n', 'success');
      showToast('Restore operation completed successfully!', 'success');
    } else {
      appendLog('\n❌ Restore operation failed or was cancelled.\n', 'error');
      showToast('Restore operation failed or cancelled.', 'error');
    }
  } catch (err) {
    appendLog(`\n❌ Error during restore: ${err.message}\n`, 'error');
    showToast(`Error during restore: ${err.message}`, 'error');
  } finally {
    // Unsubscribe
    restoreStdoutSub();
    toggleUI(false);
    // Refresh stats
    checkServicesStatus();
  }
}

// Trigger script run
function triggerScript(scriptName) {
  if (activeScriptName) return;

  ensureTerminalExpanded();
  activeScriptName = scriptName;
  clearTerminal();
  toggleUI(true);

  // Subscribe to streams
  stdoutUnsubscribe = window.electronAPI.onStdout((data) => {
    appendLog(data, 'stdout');
  });

  stderrUnsubscribe = window.electronAPI.onStderr((data) => {
    appendLog(data, 'stderr');
  });

  exitUnsubscribe = window.electronAPI.onExit((code) => {
    appendLog(`\nProcess finished with exit code: ${code}\n`, code === 0 ? 'success' : 'error');
    cleanupSubscriptions();
    toggleUI(false);
    activeScriptName = null;
    
    // Refresh stats and services on script finish
    checkServicesStatus();
  });

  window.electronAPI.runScript(scriptName);
}

// Kill active process
function killScript() {
  if (activeScriptName) {
    window.electronAPI.killScript();
  }
}

// Append text to terminal Body
function appendLog(text, type) {
  const lineEl = document.createElement('span');
  
  if (type === 'stderr') {
    lineEl.className = 'log-line text-red';
  } else if (type === 'error') {
    lineEl.className = 'log-line text-red text-bold';
  } else if (type === 'success') {
    lineEl.className = 'log-line text-green text-bold';
  } else {
    lineEl.className = 'log-line';
  }

  lineEl.innerHTML = ansiToHtml(text);
  terminalBody.appendChild(lineEl);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

// Toggle Buttons and inputs during operations
function toggleUI(isRunning) {
  const actionCards = document.querySelectorAll('.action-card');
  actionCards.forEach((card) => {
    card.disabled = isRunning;
    card.style.opacity = isRunning ? '0.4' : '1';
    card.style.pointerEvents = isRunning ? 'none' : 'auto';
  });

  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.disabled = isRunning;
    btn.style.opacity = isRunning ? '0.5' : '1';
  });

  const btnExport = document.getElementById('btn-export-backup');
  if (btnExport && isRunning) btnExport.disabled = true;

  const btnRestore = document.getElementById('btn-execute-restore');
  if (btnRestore && isRunning) btnRestore.disabled = true;

  const btnBrowse = document.getElementById('btn-browse-backup');
  if (btnBrowse) {
    if (isRunning) {
      btnBrowse.disabled = true;
    } else {
      btnBrowse.disabled = false;
    }
  }

  btnTerminate.disabled = !isRunning;
}

// Clear Terminal body
function clearTerminal() {
  terminalBody.innerHTML = '';
}

// Cleanup IPC event subscriptions
function cleanupSubscriptions() {
  if (stdoutUnsubscribe) stdoutUnsubscribe();
  if (stderrUnsubscribe) stderrUnsubscribe();
  if (exitUnsubscribe) exitUnsubscribe();
  
  stdoutUnsubscribe = null;
  stderrUnsubscribe = null;
  exitUnsubscribe = null;
}

// Panel size states and Toggle functions
let terminalState = 'expanded'; // 'expanded', 'collapsed', 'hidden'
let draggedSidebarWidth = 280;   // Saved width state for sidebar (default 280px)
let draggedTerminalHeight = 200; // Saved height state for terminal (default 200px)

function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const btnHeaderSidebar = document.getElementById('btn-header-sidebar');
  if (!sidebar) return;
  
  const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
  if (isCollapsed) {
    sidebar.classList.remove('sidebar-collapsed');
    sidebar.style.width = `${draggedSidebarWidth}px`;
    if (btnHeaderSidebar) btnHeaderSidebar.classList.add('active');
  } else {
    sidebar.style.width = ''; // Reset inline style so width: 0 class rule takes over
    sidebar.classList.add('sidebar-collapsed');
    if (btnHeaderSidebar) btnHeaderSidebar.classList.remove('active');
  }
  // Reposition active tab slider indicator
  updateTabIndicator();
}

function toggleTerminalCollapse() {
  const term = document.getElementById('app-terminal');
  const btnCollapse = document.getElementById('btn-terminal-collapse');
  const resizer = document.getElementById('terminal-resizer');
  if (!term) return;
  
  if (terminalState === 'expanded') {
    term.classList.add('terminal-collapsed');
    term.classList.remove('terminal-hidden');
    term.style.height = ''; // Reset inline style so CSS class rule takes over
    terminalState = 'collapsed';
    if (btnCollapse) btnCollapse.textContent = '🔼 Expand';
    if (resizer) resizer.style.display = 'none'; // Hide resizer when collapsed
  } else {
    term.classList.remove('terminal-collapsed');
    term.classList.remove('terminal-hidden');
    term.style.height = `${draggedTerminalHeight}px`;
    terminalState = 'expanded';
    if (btnCollapse) btnCollapse.textContent = '🔽 Collapse';
    if (resizer) resizer.style.display = 'block'; // Show resizer when expanded
  }
}

function toggleTerminalVisibility() {
  const term = document.getElementById('app-terminal');
  const btnHeaderTerm = document.getElementById('btn-header-terminal');
  const btnCollapse = document.getElementById('btn-terminal-collapse');
  const resizer = document.getElementById('terminal-resizer');
  if (!term) return;
  
  if (terminalState === 'hidden') {
    term.classList.remove('terminal-hidden');
    term.classList.remove('terminal-collapsed');
    term.style.height = `${draggedTerminalHeight}px`;
    terminalState = 'expanded';
    if (btnCollapse) btnCollapse.textContent = '🔽 Collapse';
    if (btnHeaderTerm) btnHeaderTerm.classList.add('active');
    if (resizer) resizer.style.display = 'block'; // Show resizer when expanded
  } else {
    term.classList.add('terminal-hidden');
    term.classList.remove('terminal-collapsed');
    term.style.height = ''; // Reset inline style so CSS class rule takes over
    terminalState = 'hidden';
    if (btnHeaderTerm) btnHeaderTerm.classList.remove('active');
    if (resizer) resizer.style.display = 'none'; // Hide resizer when hidden
  }
}

function ensureTerminalExpanded() {
  const term = document.getElementById('app-terminal');
  const btnCollapse = document.getElementById('btn-terminal-collapse');
  const btnHeaderTerm = document.getElementById('btn-header-terminal');
  const resizer = document.getElementById('terminal-resizer');
  if (!term) return;
  
  term.classList.remove('terminal-hidden');
  term.classList.remove('terminal-collapsed');
  term.style.height = `${draggedTerminalHeight}px`;
  terminalState = 'expanded';
  if (btnCollapse) btnCollapse.textContent = '🔽 Collapse';
  if (btnHeaderTerm) btnHeaderTerm.classList.add('active');
  if (resizer) resizer.style.display = 'block';
}

// Global keyboard shortcuts listeners (Cmd/Ctrl + J for terminal, Cmd/Ctrl + L for sidebar)
window.addEventListener('keydown', (e) => {
  const isMeta = e.ctrlKey || e.metaKey;
  if (isMeta && e.key.toLowerCase() === 'j') {
    e.preventDefault();
    toggleTerminalVisibility();
  }
  if (isMeta && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    toggleSidebar();
  }
});

// Click-and-drag panel resizers initialization
window.addEventListener('DOMContentLoaded', () => {
  initResizers();
});

function initResizers() {
  const sidebar = document.getElementById('app-sidebar');
  const sidebarResizer = document.getElementById('sidebar-resizer');
  const term = document.getElementById('app-terminal');
  const terminalResizer = document.getElementById('terminal-resizer');
  
  // 1. Sidebar Resizer
  if (sidebarResizer && sidebar) {
    sidebarResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      
      const startX = e.pageX;
      const startWidth = sidebar.offsetWidth;
      
      sidebar.classList.add('no-transition');
      sidebarResizer.classList.add('dragging');
      
      const onMouseMove = (moveEvent) => {
        const diffX = moveEvent.pageX - startX;
        const newWidth = Math.max(200, Math.min(450, startWidth + diffX));
        
        draggedSidebarWidth = newWidth;
        sidebar.style.width = `${newWidth}px`;
        
        // Trigger tab indicator update in case tab container dimensions shift
        updateTabIndicator();
      };
      
      const onMouseUp = () => {
        sidebar.classList.remove('no-transition');
        sidebarResizer.classList.remove('dragging');
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
  
  // 2. Terminal Resizer
  if (terminalResizer && term) {
    terminalResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      
      const startY = e.pageY;
      const startHeight = term.offsetHeight;
      
      term.classList.add('no-transition');
      terminalResizer.classList.add('dragging');
      
      const onMouseMove = (moveEvent) => {
        const diffY = startY - moveEvent.pageY; // Moving mouse up increases bottom panel height
        const newHeight = Math.max(100, Math.min(500, startHeight + diffY));
        
        draggedTerminalHeight = newHeight;
        term.style.height = `${newHeight}px`;
      };
      
      const onMouseUp = () => {
        term.classList.remove('no-transition');
        terminalResizer.classList.remove('dragging');
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
}

// Checklist Select/Deselect All Utility
function toggleChecklist(type, selectAll) {
  const containerId = type === 'backup' ? 'backup-checklist' : 'restore-checklist';
  const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]`);
  checkboxes.forEach(chk => {
    if (!chk.disabled) {
      chk.checked = selectAll;
    }
  });
  if (type === 'backup') {
    updateBackupButtonState();
  } else {
    updateRestoreButtonState();
  }
}
