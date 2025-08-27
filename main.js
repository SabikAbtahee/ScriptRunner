const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const kill = require('tree-kill');
const fs = require('fs');

/**
 * Script Runner 2.0 - Main Process
 * Handles Electron main process functionality with clean architecture
 */

// Application state
class AppState {
  constructor() {
    this.runningApps = new Map();
    this.configPath = path.join(__dirname, 'config.json');
  }

  addRunningApp(directory, pid) {
    this.runningApps.set(directory, pid);
  }

  removeRunningApp(directory) {
    this.runningApps.delete(directory);
  }

  getRunningApp(directory) {
    return this.runningApps.get(directory);
  }

  hasRunningApp(directory) {
    return this.runningApps.has(directory);
  }
}

const appState = new AppState();

/**
 * Create the main application window
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add icon if available
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}


/**
 * Application lifecycle management
 */
app.whenReady().then(() => {
  checkInitialConfig();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill all running processes before closing
  killAllRunningProcesses();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killAllRunningProcesses();
});

/**
 * Configuration management
 */
function checkInitialConfig() {
  try {
    console.log('Config file path:', appState.configPath);
    const data = readFromFile(appState.configPath);
    if (!data) {
      console.warn('Config file not found or empty');
      // Could create a default config here if needed
    } else {
      console.log('Configuration loaded successfully');
    }
  } catch (error) {
    console.error('Configuration error:', error.message);
  }
}

function readFromFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  } else {
    console.warn(`File does not exist: ${filePath}`);
    return null;
  }
}

function writeToFile(filename, data) {
  const filePath = path.join(__dirname, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
}

/**
 * Utility functions
 */
function killAllRunningProcesses() {
  appState.runningApps.forEach((pid, directory) => {
    console.log(`Killing process ${pid} for ${directory}`);
    kill(pid, 'SIGTERM', (err) => {
      if (err) {
        console.error(`Error killing process ${pid}:`, err);
      }
    });
  });
  appState.runningApps.clear();
}

function parseCommand(command) {
  const parts = command.trim().split(' ');
  return {
    baseCommand: parts[0],
    args: parts.slice(1)
  };
}

function sendOutput(event, channel, data, progress, ...args) {
  try {
    event.sender.send(channel, data, progress, ...args);
  } catch (error) {
    console.error(`Error sending ${channel} output:`, error);
  }
}


/**
 * IPC Handlers
 */

// Get configuration
ipcMain.handle('get-config', async () => {
  try {
    const data = fs.readFileSync(appState.configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading config:', error);
    throw new Error('Failed to load configuration');
  }
});

// Build and copy process
ipcMain.handle('build_copy', async (event, param) => {
  try {
    const config = JSON.parse(param.source);
    const directory = config.path;
    
    console.log(`Starting build in: ${directory}`);
    
    const command = spawn('npm', ['run', 'build'], { 
      cwd: directory, 
      shell: true 
    });

    command.stdout.on('data', (data) => {
      sendOutput(event, 'build_output', data.toString(), param.progress, false);
    });

    command.stderr.on('data', (data) => {
      sendOutput(event, 'build_output', data.toString(), param.progress, false);
    });

    command.on('close', (code) => {
      console.log(`Build process exited with code: ${code}`);
      sendOutput(event, 'build_output', code.toString(), param.progress, true);
      
      if (code === 0) {
        copyToDestination(event, param);
      } else {
        console.error(`Build failed with exit code: ${code}`);
      }
    });

    command.on('error', (error) => {
      console.error('Build process error:', error);
      sendOutput(event, 'build_output', `Error: ${error.message}`, param.progress, true);
    });

  } catch (error) {
    console.error('Build copy error:', error);
    sendOutput(event, 'build_output', `Error: ${error.message}`, param.progress, true);
  }
});

// Watch process
ipcMain.handle('watch', async (event, param) => {
  try {
    const config = JSON.parse(param.source);
    const directory = config.path;
    
    console.log(`Starting watch in: ${directory}`);
    
    const command = spawn('ng', ['build', '--watch'], { 
      cwd: directory, 
      shell: true 
    });

    command.stdout.on('data', (data) => {
      sendOutput(event, 'watch_output', data.toString(), param.progress, param.rowCounter, command.pid);
    });

    command.stderr.on('data', (data) => {
      sendOutput(event, 'watch_output', data.toString(), param.progress, param.rowCounter, command.pid);
    });

    command.on('close', (code) => {
      console.log(`Watch process exited with code: ${code}`);
    });

    command.on('error', (error) => {
      console.error('Watch process error:', error);
    });

  } catch (error) {
    console.error('Watch error:', error);
  }
});

// Copy only
ipcMain.handle('copy', async (event, param) => {
  copyToDestination(event, param);
});

// Kill process
ipcMain.handle('kill', async (event, param) => {
  const pid = param.command;
  
  return new Promise((resolve) => {
    kill(pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Error killing process:', err);
        resolve({ success: false, error: err.message });
      } else {
        console.log('Process killed successfully:', pid);
        resolve({ success: true });
      }
    });
  });
});

// Run application
ipcMain.handle('run_app', async (event, param) => {
  try {
    const appConfig = JSON.parse(param.path);
    const directory = appConfig.path;
    const runCommand = appConfig.runCommand || 'npm run start';
    
    console.log('Starting app in directory:', directory);
    console.log('Using run command:', runCommand);
    
    // Kill existing process if running
    if (appState.hasRunningApp(directory)) {
      const existingPid = appState.getRunningApp(directory);
      console.log('Killing existing process:', existingPid);
      
      await new Promise((resolve) => {
        kill(existingPid, 'SIGTERM', () => {
          appState.removeRunningApp(directory);
          resolve();
        });
      });
    }
    
    // Parse the command and arguments
    const { baseCommand, args } = parseCommand(runCommand);
    
    const command = spawn(baseCommand, args, { 
      cwd: directory, 
      shell: true 
    });
    
    // Track this process
    appState.addRunningApp(directory, command.pid);
    
    command.stdout.on('data', (data) => {
      sendOutput(event, 'app_output', data.toString(), param.progress, param.rowCounter, command.pid);
    });
    
    command.stderr.on('data', (data) => {
      sendOutput(event, 'app_output', data.toString(), param.progress, param.rowCounter, command.pid);
    });
    
    command.on('close', (code) => {
      console.log('App process exited with code:', code);
      appState.removeRunningApp(directory);
    });
    
    command.on('exit', (code) => {
      appState.removeRunningApp(directory);
    });

    command.on('error', (error) => {
      console.error('App process error:', error);
      appState.removeRunningApp(directory);
      sendOutput(event, 'app_output', `Error: ${error.message}`, param.progress, param.rowCounter, command.pid);
    });

  } catch (error) {
    console.error('Run app error:', error);
    sendOutput(event, 'app_output', `Error: ${error.message}`, param.progress, param.rowCounter, null);
  }
});

// Restart application
ipcMain.handle('restart_app', async (event, param) => {
  try {
    const appConfig = JSON.parse(param.path);
    const directory = appConfig.path;
    const runCommand = appConfig.runCommand || 'npm run start';
    
    console.log('Restarting app in directory:', directory);
    console.log('Using run command:', runCommand);
    
    // Kill existing process first
    if (appState.hasRunningApp(directory)) {
      const existingPid = appState.getRunningApp(directory);
      console.log('Killing existing process for restart:', existingPid);
      
      await new Promise((resolve) => {
        kill(existingPid, 'SIGTERM', (err) => {
          if (err) {
            console.error('Error killing existing process:', err);
          }
          appState.removeRunningApp(directory);
          resolve();
        });
      });
    }
    
    // Start new process
    const { baseCommand, args } = parseCommand(runCommand);
    
    const command = spawn(baseCommand, args, { 
      cwd: directory, 
      shell: true 
    });
    
    // Track this process
    appState.addRunningApp(directory, command.pid);
    
    command.stdout.on('data', (data) => {
      sendOutput(event, 'app_output', data.toString(), param.progress, param.rowCounter, command.pid);
    });
    
    command.stderr.on('data', (data) => {
      sendOutput(event, 'app_output', data.toString(), param.progress, param.rowCounter, command.pid);
    });
    
    command.on('close', (code) => {
      console.log('Restart app process exited with code:', code);
      appState.removeRunningApp(directory);
    });
    
    command.on('exit', (code) => {
      appState.removeRunningApp(directory);
    });

    command.on('error', (error) => {
      console.error('Restart app process error:', error);
      appState.removeRunningApp(directory);
      sendOutput(event, 'app_output', `Error: ${error.message}`, param.progress, param.rowCounter, command.pid);
    });

  } catch (error) {
    console.error('Restart app error:', error);
    sendOutput(event, 'app_output', `Error: ${error.message}`, param.progress, param.rowCounter, null);
  }
});

/**
 * Copy files from source to destination
 */
function copyToDestination(event, param) {
  try {
    const sourceConfig = JSON.parse(param.source);
    const destConfig = JSON.parse(param.destination);
    
    const sourceDirectory = sourceConfig.path;
    const sourceLibDirectory = sourceConfig.node_path;
    const destinationDirectory = destConfig.path;

    const sourcePattern = `${sourceDirectory}/dist/**/*`;
    const destinationPath = `${destinationDirectory}/${sourceLibDirectory}`;

    console.log(`Copying from: ${sourcePattern}`);
    console.log(`Copying to: ${destinationPath}`);

    const command = spawn('cpx', [sourcePattern, destinationPath]);

    command.stdout.on('data', (data) => {
      sendOutput(event, 'copy_output', data.toString(), param.progress, false);
    });

    command.stderr.on('data', (data) => {
      sendOutput(event, 'copy_output', data.toString(), param.progress, false);
    });

    command.on('close', (code) => {
      const commandString = `cpx "${sourcePattern}" "${destinationPath}"`;
      sendOutput(event, 'copy_output', commandString, param.progress, false);
      sendOutput(event, 'copy_output', `Copy completed with exit code: ${code}`, param.progress, true);
      
      if (code !== 0) {
        console.error(`Copy failed with exit code: ${code}`);
      } else {
        console.log('Copy completed successfully');
      }
    });

    command.on('error', (error) => {
      console.error('Copy process error:', error);
      sendOutput(event, 'copy_output', `Error: ${error.message}`, param.progress, true);
    });

  } catch (error) {
    console.error('Copy destination error:', error);
    sendOutput(event, 'copy_output', `Error: ${error.message}`, param.progress, true);
  }
}