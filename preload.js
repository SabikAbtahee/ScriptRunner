const { contextBridge, ipcRenderer } = require('electron');

/**
 * Script Runner 2.0 - Preload Script
 * Secure API bridge between main and renderer processes
 */

// Validate that we're in the correct context
if (!process.contextIsolated) {
  throw new Error('Preload script must run in isolated context');
}

/**
 * Exposed API for the renderer process
 * All IPC communication goes through this secure bridge
 */
const API = {
  // Configuration
  get_config: () => ipcRenderer.invoke('get-config'),

  // Build operations
  build_copy: (param) => ipcRenderer.invoke('build_copy', param),
  copy: (param) => ipcRenderer.invoke('copy', param),
  watch: (param) => ipcRenderer.invoke('watch', param),
  npm_install: (param) => ipcRenderer.invoke('npm_install', param),

  // Application operations
  run_app: (param) => ipcRenderer.invoke('run_app', param),
  restart_app: (param) => ipcRenderer.invoke('restart_app', param),

  // Process management
  kill: (param) => ipcRenderer.invoke('kill', param),

  // Tools / versions
  get_versions: () => ipcRenderer.invoke('get-versions'),

  // Output listeners
  build_output: (callback) => {
    const handler = (event, data, progress, isDone) => {
      callback(data, progress, isDone);
    };
    ipcRenderer.on('build_output', handler);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('build_output', handler);
  },

  copy_output: (callback) => {
    const handler = (event, data, progress, isDone) => {
      callback(data, progress, isDone);
    };
    ipcRenderer.on('copy_output', handler);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('copy_output', handler);
  },

  watch_output: (callback) => {
    const handler = (event, data, progress, rowCounter, pid) => {
      callback(data, progress, rowCounter, pid);
    };
    ipcRenderer.on('watch_output', handler);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('watch_output', handler);
  },

  app_output: (callback) => {
    const handler = (event, data, progress, rowCounter, pid) => {
      callback(data, progress, rowCounter, pid);
    };
    ipcRenderer.on('app_output', handler);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('app_output', handler);
  },

  install_output: (callback) => {
    const handler = (event, data, progress, isDone) => {
      callback(data, progress, isDone);
    };
    ipcRenderer.on('install_output', handler);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('install_output', handler);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('API', API);

console.log('Script Runner 2.0 preload script loaded successfully');