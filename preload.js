const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runScript: (scriptName) => ipcRenderer.send('run-script', scriptName),
  killScript: () => ipcRenderer.send('kill-active-script'),
  
  onStdout: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('script-stdout', subscription);
    return () => ipcRenderer.removeListener('script-stdout', subscription);
  },
  onStderr: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('script-stderr', subscription);
    return () => ipcRenderer.removeListener('script-stderr', subscription);
  },
  onExit: (callback) => {
    const subscription = (event, code) => callback(code);
    ipcRenderer.on('script-exit', subscription);
    return () => ipcRenderer.removeListener('script-exit', subscription);
  },

  checkServices: () => ipcRenderer.invoke('check-services'),
  toggleService: (serviceName, action) => ipcRenderer.invoke('toggle-service', { serviceName, action }),

  detectLocalConfigs: () => ipcRenderer.invoke('detect-configs'),
  exportBackup: (selectedModules, password) => ipcRenderer.invoke('execute-backup', { selectedModules, password }),
  saveJsonFile: (content, defaultName) => ipcRenderer.invoke('save-json-file', { content, defaultName }),
  loadJsonFile: () => ipcRenderer.invoke('load-json-file'),
  decryptBackup: (backupData, password) => ipcRenderer.invoke('decrypt-backup', { backupData, password }),
  executeRestore: (backupData, selectedModules) => ipcRenderer.invoke('execute-restore', { backupData, selectedModules })
});
