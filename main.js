const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const kill = require('tree-kill');
const fs = require('fs');
const os = require('os');

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
  // Determine the appropriate icon file based on platform
  let iconPath;
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets/icon.icns');
  } else if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'assets/icon.ico');
  } else {
    iconPath = path.join(__dirname, 'assets/icon.png');
  }

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
    icon: fs.existsSync(iconPath) ? iconPath : undefined, // Only set icon if file exists
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

/**
 * Get system configuration including npm/nvm paths
 */
function getSystemConfig() {
  try {
    const data = fs.readFileSync(appState.configPath, 'utf8');
    const config = JSON.parse(data);
    return config.System || {};
  } catch (error) {
    console.error('Error loading system config:', error);
    return {};
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
  const baseCommand = parts[0];
  const args = parts.slice(1);
  
  // For Angular CLI commands, use npx for better reliability in packaged apps
  if (baseCommand === 'ng') {
    return {
      baseCommand: resolveCommand('npx'),
      args: ['ng', ...args]
    };
  }
  
  // For npm commands, try to resolve the full path
  if (baseCommand === 'npm') {
    return {
      baseCommand: resolveCommand('npm'),
      args
    };
  }
  
  // For other commands, try to resolve
  return {
    baseCommand: resolveCommand(baseCommand),
    args
  };
}

/**
 * Get extended PATH that includes common Node.js installation locations
 */
function getExtendedPath() {
  const originalPath = process.env.PATH || '';
  const commonPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/Users/' + os.userInfo().username + '/.npm-global/bin',
    process.cwd() + '/node_modules/.bin'
  ];
  
  const allPaths = [originalPath, ...commonPaths].filter(Boolean);
  return allPaths.join(':');
}

/**
 * Try to resolve the full path to a command
 */
function resolveCommand(command) {
  const { execSync } = require('child_process');
  
  try {
    // Try to find the command using which
    const result = execSync(`which ${command}`, { 
      encoding: 'utf8',
      env: { ...process.env, PATH: getExtendedPath() }
    }).trim();
    return result || command;
  } catch (error) {
    console.log(`Could not resolve path for ${command}, using as-is`);
    return command;
  }
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

// Get version information for configured Node.js tools
ipcMain.handle('get-version-info', async () => {
  try {
    const systemConfig = getSystemConfig();
    const npmConfig = systemConfig.npm || {};
    const versions = {};
    
    // Get Node.js version
    if (npmConfig.nodePath && fs.existsSync(npmConfig.nodePath)) {
      try {
        const { execSync } = require('child_process');
        const nodeVersion = execSync(`"${npmConfig.nodePath}" --version`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: getExtendedPath() }
        }).trim();
        versions.node = nodeVersion;
        versions.nodePath = npmConfig.nodePath;
      } catch (error) {
        versions.node = 'Error getting version';
        versions.nodePath = npmConfig.nodePath;
      }
    }
    
    // Get npm version
    if (npmConfig.npmPath && fs.existsSync(npmConfig.npmPath)) {
      try {
        const { execSync } = require('child_process');
        const npmVersion = execSync(`"${npmConfig.npmPath}" --version`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: getExtendedPath() }
        }).trim();
        versions.npm = npmVersion;
        versions.npmPath = npmConfig.npmPath;
      } catch (error) {
        versions.npm = 'Error getting version';
        versions.npmPath = npmConfig.npmPath;
      }
    }
    
    // Get npx version
    if (npmConfig.npxPath && fs.existsSync(npmConfig.npxPath)) {
      try {
        const { execSync } = require('child_process');
        const npxVersion = execSync(`"${npmConfig.npxPath}" --version`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: getExtendedPath() }
        }).trim();
        versions.npx = npxVersion;
        versions.npxPath = npmConfig.npxPath;
      } catch (error) {
        versions.npx = 'Error getting version';
        versions.npxPath = npmConfig.npxPath;
      }
    }
    
    // Also try to get system versions as fallback
    if (!versions.node) {
      try {
        const { execSync } = require('child_process');
        const nodeVersion = execSync('node --version', { 
          encoding: 'utf8',
          env: { ...process.env, PATH: getExtendedPath() }
        }).trim();
        versions.node = nodeVersion + ' (system)';
        versions.nodePath = 'system PATH';
      } catch (error) {
        versions.node = 'Not found';
        versions.nodePath = 'Not found';
      }
    }
    
    if (!versions.npm) {
      try {
        const { execSync } = require('child_process');
        const npmVersion = execSync('npm --version', { 
          encoding: 'utf8',
          env: { ...process.env, PATH: getExtendedPath() }
        }).trim();
        versions.npm = npmVersion + ' (system)';
        versions.npmPath = 'system PATH';
      } catch (error) {
        versions.npm = 'Not found';
        versions.npmPath = 'Not found';
      }
    }
    
    if (!versions.npx) {
      try {
        const { execSync } = require('child_process');
        const npxVersion = execSync('npx --version', { 
          encoding: 'utf8',
          env: { ...process.env, PATH: getExtendedPath() }
        }).trim();
        versions.npx = npxVersion + ' (system)';
        versions.npxPath = 'system PATH';
      } catch (error) {
        versions.npx = 'Not found';
        versions.npxPath = 'Not found';
      }
    }
    
    return versions;
  } catch (error) {
    console.error('Error getting version info:', error);
    throw new Error('Failed to get version information');
  }
});

// Get system configuration
ipcMain.handle('get-system-config', async () => {
  try {
    return getSystemConfig();
  } catch (error) {
    console.error('Error loading system config:', error);
    throw new Error('Failed to load system configuration');
  }
});

// Build and copy process
ipcMain.handle('build_copy', async (event, param) => {
  try {
    const config = JSON.parse(param.source);
    const directory = config.path;
    
    sendOutput(event, 'build_output', `Starting build in: ${directory}`, param.progress, false);
    
    const command = spawn(resolveCommand('npm'), ['run', 'build'], { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
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
    
    sendOutput(event, 'watch_output', `Starting watch in: ${directory}`, param.progress, param.rowCounter, null);
    
    const command = spawn(resolveCommand('npx'), ['ng', 'build', '--watch'], { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
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

// Install dependencies
ipcMain.handle('npm_install', async (event, param) => {
  try {
    const config = JSON.parse(param.path);
    const directory = config.path;
    
    sendOutput(event, 'install_output', `Starting npm install in: ${directory}`, param.progress, false);
    
    const command = spawn(resolveCommand('npm'), ['install'], { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });

    command.stdout.on('data', (data) => {
      sendOutput(event, 'install_output', data.toString(), param.progress, false);
    });

    command.stderr.on('data', (data) => {
      sendOutput(event, 'install_output', data.toString(), param.progress, false);
    });

    command.on('close', (code) => {
      console.log(`Install process exited with code: ${code}`);
      sendOutput(event, 'install_output', `Install completed with exit code: ${code}`, param.progress, true);
    });

    command.on('error', (error) => {
      console.error('Install process error:', error);
      sendOutput(event, 'install_output', `Error: ${error.message}`, param.progress, true);
    });

  } catch (error) {
    console.error('Failed to start install:', error);
    sendOutput(event, 'install_output', `Failed to start install: ${error.message}`, param.progress, true);
  }
});

// Kill process
ipcMain.handle('kill', async (event, param) => {
  const pid = param.command;
  
  return new Promise((resolve) => {
    // First try SIGTERM (graceful shutdown)
    kill(pid, 'SIGTERM', (err) => {
      if (err) {
        console.error('Error killing process with SIGTERM:', err);
        // If SIGTERM fails, try SIGKILL (force kill)
        kill(pid, 'SIGKILL', (err2) => {
          if (err2) {
            console.error('Error killing process with SIGKILL:', err2);
            resolve({ success: false, error: err2.message });
          } else {
            console.log('Process force killed successfully:', pid);
            resolve({ success: true });
          }
        });
      } else {
        console.log('Process terminated gracefully:', pid);
        resolve({ success: true });
      }
    });
  });
});

// Kill process by port (useful for Angular dev servers)
ipcMain.handle('kill-by-port', async (event, param) => {
  const port = param.port;
  
  try {
    const { execSync } = require('child_process');
    let command;
    
    if (process.platform === 'win32') {
      // Windows: find process using port and kill it
      command = `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`;
    } else {
      // Unix: find process using port and kill it
      command = `lsof -ti:${port} | xargs kill -9`;
    }
    
    execSync(command, { shell: true });
    console.log(`Successfully killed process using port ${port}`);
    return { success: true, message: `Port ${port} freed` };
  } catch (error) {
    console.error(`Error killing process on port ${port}:`, error);
    return { success: false, error: error.message };
  }
});

// Enhanced kill-by-port with UI output
ipcMain.handle('kill-by-port-with-output', async (event, param) => {
  const { port, outputChannel, progress, rowCounter } = param;
  
  try {
    const { execSync } = require('child_process');
    let command;
    
    if (process.platform === 'win32') {
      // Windows: find process using port and kill it
      command = `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`;
    } else {
      // Unix: find process using port and kill it
      command = `lsof -ti:${port} | xargs kill -9`;
    }
    
    // Send status to UI
    if (outputChannel && event) {
      sendOutput(event, outputChannel, `Attempting to free port ${port}...`, progress, rowCounter, null);
    }
    
    execSync(command, { shell: true });
    
    // Send success message to UI
    if (outputChannel && event) {
      sendOutput(event, outputChannel, `Successfully freed port ${port}`, progress, rowCounter, null);
    }
    
    console.log(`Successfully killed process using port ${port}`);
    return { success: true, message: `Port ${port} freed` };
  } catch (error) {
    // Send error message to UI
    if (outputChannel && event) {
      sendOutput(event, outputChannel, `Error freeing port ${port}: ${error.message}`, progress, rowCounter, null);
    }
    
    console.error(`Error killing process on port ${port}:`, error);
    return { success: false, error: error.message };
  }
});

// Run application
ipcMain.handle('run_app', async (event, param) => {
  try {
    const appConfig = JSON.parse(param.path);
    const directory = appConfig.path;
    const runCommand = appConfig.runCommand || 'npm run start';
    
    // Send status messages to UI
    sendOutput(event, 'app_output', `Starting app in directory: ${directory}`, param.progress, param.rowCounter, null);
    sendOutput(event, 'app_output', `Using run command: ${runCommand}`, param.progress, param.rowCounter, null);
    
    // Kill existing process if running
    if (appState.hasRunningApp(directory)) {
      const existingPid = appState.getRunningApp(directory);
      sendOutput(event, 'app_output', `Killing existing process: ${existingPid}`, param.progress, param.rowCounter, null);
      
      await new Promise((resolve) => {
        kill(existingPid, 'SIGTERM', () => {
          appState.removeRunningApp(directory);
          resolve();
        });
      });
    }
    
    // Also kill any process using the configured port
    let portToKill = null;
    if (appConfig.port) {
      portToKill = appConfig.port.toString();
      sendOutput(event, 'app_output', `Using configured port: ${portToKill}`, param.progress, param.rowCounter, null);
    } else if (runCommand.includes('ng serve') || runCommand.includes('ng serve --port=')) {
      const portMatch = runCommand.match(/--port=(\d+)/);
      if (portMatch) {
        portToKill = portMatch[1];
        sendOutput(event, 'app_output', `Extracted port from command: ${portToKill}`, param.progress, param.rowCounter, null);
      }
    }
    
    if (portToKill) {
      try {
        await ipcMain.handle('kill-by-port-with-output', event, { 
          port: portToKill, 
          outputChannel: 'app_output', 
          progress: param.progress, 
          rowCounter: param.rowCounter 
        });
      } catch (error) {
        sendOutput(event, 'app_output', `Could not free port ${portToKill}: ${error.message}`, param.progress, param.rowCounter, null);
      }
    }
    
    // Parse the command and arguments
    const { baseCommand, args } = parseCommand(runCommand);
    
    const command = spawn(baseCommand, args, { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
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
    
    // Send status messages to UI
    sendOutput(event, 'app_output', `Restarting app in directory: ${directory}`, param.progress, param.rowCounter, null);
    sendOutput(event, 'app_output', `Using run command: ${runCommand}`, param.progress, param.rowCounter, null);
    
    // Kill existing process first with enhanced cleanup
    if (appState.hasRunningApp(directory)) {
      const existingPid = appState.getRunningApp(directory);
      sendOutput(event, 'app_output', `Killing existing process for restart: ${existingPid}`, param.progress, param.rowCounter, null);
      
      await new Promise((resolve) => {
        // First try graceful shutdown
        kill(existingPid, 'SIGTERM', (err) => {
          if (err) {
            sendOutput(event, 'app_output', `Error killing existing process with SIGTERM: ${err.message}`, param.progress, param.rowCounter, null);
          }
          
          // Wait a bit for graceful shutdown, then force kill if needed
          setTimeout(() => {
            kill(existingPid, 'SIGKILL', (err2) => {
              if (err2) {
                sendOutput(event, 'app_output', `Error force killing existing process: ${err2.message}`, param.progress, param.rowCounter, null);
              }
              appState.removeRunningApp(directory);
              resolve();
            });
          }, 2000); // Wait 2 seconds for graceful shutdown
        });
      });
    }
    
    // Extract port from config or runCommand
    let portToKill = null;
    
    // First try to get port from config
    if (appConfig.port) {
      portToKill = appConfig.port.toString();
      sendOutput(event, 'app_output', `Using configured port: ${portToKill}`, param.progress, param.rowCounter, null);
    } else if (runCommand.includes('ng serve') || runCommand.includes('ng serve --port=')) {
      // Fallback to extracting from runCommand
      const portMatch = runCommand.match(/--port=(\d+)/);
      if (portMatch) {
        portToKill = portMatch[1];
        sendOutput(event, 'app_output', `Extracted port from command: ${portToKill}`, param.progress, param.rowCounter, null);
      } else {
        // Default Angular port is 4200
        portToKill = '4200';
        sendOutput(event, 'app_output', `Using default Angular port: ${portToKill}`, param.progress, param.rowCounter, null);
      }
    }
    
    // Kill any process using this port
    if (portToKill) {
      try {
        await ipcMain.handle('kill-by-port-with-output', event, { 
          port: portToKill, 
          outputChannel: 'app_output', 
          progress: param.progress, 
          rowCounter: param.rowCounter 
        });
        // Wait a bit for port to be fully released
        await new Promise(resolve => setTimeout(resolve, 1000));
        sendOutput(event, 'app_output', `Port ${portToKill} should be free now`, param.progress, param.rowCounter, null);
      } catch (error) {
        sendOutput(event, 'app_output', `Could not free port ${portToKill}: ${error.message}`, param.progress, param.rowCounter, null);
      }
    }
    
    // Start new process
    const { baseCommand, args } = parseCommand(runCommand);
    
    const command = spawn(baseCommand, args, { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
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

    const command = spawn(resolveCommand('npx'), ['cpx', sourcePattern, destinationPath], {
      env: { ...process.env, PATH: getExtendedPath() }
    });

    command.stdout.on('data', (data) => {
      sendOutput(event, 'copy_output', data.toString(), param.progress, false);
    });

    command.stderr.on('data', (data) => {
      sendOutput(event, 'copy_output', data.toString(), param.progress, false);
    });

    command.on('close', (code) => {
      const commandString = `cpx "${sourcePattern}" "${destinationPath}"`;
      sendOutput(event, 'copy_output', commandString, param.progress, false);
      
      if (code !== 0) {
        console.error(`Copy failed with exit code: ${code}`);
        sendOutput(event, 'copy_output', `Copy failed with exit code: ${code}`, param.progress, true);
      } else {
        console.log('Copy completed successfully');
        sendOutput(event, 'copy_output', 'Copy completed successfully', param.progress, false);
        sendOutput(event, 'copy_output', `${code}`, param.progress, true);
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