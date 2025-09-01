const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const kill = require('tree-kill');
const fs = require('fs');
const os = require('os');
const net = require('node:net');

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
  console.log(`Killing ${appState.runningApps.size} running processes`);
  appState.runningApps.forEach((pid, directory) => {
    console.log(`Killing process ${pid} for ${directory}`);
    kill(pid, 'SIGTERM', (err) => {
      if (err) {
        console.log(`SIGTERM failed for ${pid}, trying SIGKILL:`, err.message);
        kill(pid, 'SIGKILL', (killErr) => {
          if (killErr) {
            console.error(`Error killing process ${pid}:`, killErr);
          } else {
            console.log(`Successfully killed process ${pid} with SIGKILL`);
          }
        });
      } else {
        console.log(`Successfully killed process ${pid} with SIGTERM`);
      }
    });
  });
  appState.runningApps.clear();
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function waitForExit(pid, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (!processExists(pid) || Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 200);
  });
}

async function terminateProcessTree(pid, timeoutMs = 8000) {
  return new Promise((resolve) => {
    console.log(`Terminating process tree for PID: ${pid}`);
    
    // Use tree-kill to properly kill the process tree on all platforms
    kill(pid, 'SIGTERM', (err) => {
      if (err) {
        console.log(`SIGTERM failed for PID ${pid}, trying SIGKILL:`, err.message);
        // If SIGTERM fails, try SIGKILL
        kill(pid, 'SIGKILL', (killErr) => {
          if (killErr) {
            console.error(`SIGKILL also failed for PID ${pid}:`, killErr.message);
          } else {
            console.log(`Successfully killed process tree for PID ${pid} with SIGKILL`);
          }
          resolve();
        });
      } else {
        console.log(`Successfully killed process tree for PID ${pid} with SIGTERM`);
        resolve();
      }
    });
    
    // Timeout fallback
    setTimeout(() => {
      console.log(`Timeout reached for killing PID ${pid}, proceeding anyway`);
      resolve();
    }, timeoutMs);
  });
}

function parsePortFromCommandString(cmd) {
  if (!cmd) return null;
  const m1 = cmd.match(/--port(?:=|\s+)(\d{2,5})/);
  if (m1) return parseInt(m1[1], 10);
  const m2 = cmd.match(/-p\s+(\d{2,5})/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function waitForPortFree(port, timeoutMs = 8000) {
  if (!port) return Promise.resolve();
  const start = Date.now();
  return new Promise((resolve) => {
    const tryListen = () => {
      const server = net.createServer();
      server.once('error', () => {
        server.close();
        if (Date.now() - start >= timeoutMs) return resolve();
        setTimeout(tryListen, 250);
      });
      server.once('listening', () => {
        server.close(() => resolve());
      });
      server.listen(port, '127.0.0.1');
    };
    tryListen();
  });
}

function parseCommand(command) {
  const parts = command.trim().split(' ');
  const baseCommand = parts[0];
  const args = parts.slice(1);
  
  // For Angular CLI commands, use npx for better reliability in packaged apps
  if (baseCommand === 'ng') {
    const resolvedNpx = resolveCommand('npx');
    return {
      baseCommand: resolvedNpx.includes(' ') ? `"${resolvedNpx}"` : resolvedNpx,
      args: ['ng', ...args]
    };
  }
  
  // For npm commands, try to resolve the full path
  if (baseCommand === 'npm') {
    const resolvedNpm = resolveCommand('npm');
    return {
      baseCommand: resolvedNpm.includes(' ') ? `"${resolvedNpm}"` : resolvedNpm,
      args
    };
  }
  
  // For other commands, try to resolve
  const resolvedCommand = resolveCommand(baseCommand);
  return {
    baseCommand: resolvedCommand.includes(' ') ? `"${resolvedCommand}"` : resolvedCommand,
    args
  };
}

/**
 * Get extended PATH that includes common Node.js installation locations
 */
function getExtendedPath() {
  const originalPath = process.env.PATH || '';
  const home = os.homedir();
  
  let commonPaths = [];
  
  if (process.platform === 'win32') {
    // Windows-specific paths
    commonPaths = [
      'C:\\Program Files\\nodejs',
      'C:\\Program Files (x86)\\nodejs',
      path.join(home, 'AppData', 'Roaming', 'npm'),
      path.join(home, 'AppData', 'Roaming', 'nvm'),
      process.cwd() + '\\node_modules\\.bin'
    ];
    
    // Add NVM for Windows paths
    const nvmHome = process.env.NVM_HOME || path.join(home, 'AppData', 'Roaming', 'nvm');
    if (fs.existsSync(nvmHome)) {
      try {
        const entries = fs.readdirSync(nvmHome, { withFileTypes: true });
        entries.forEach((entry) => {
          if (entry.isDirectory() && entry.name.startsWith('v')) {
            commonPaths.push(path.join(nvmHome, entry.name));
          }
        });
      } catch (_) {}
    }
  } else {
    // Unix-like systems
    commonPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      path.join(home, '.npm-global', 'bin'),
      process.cwd() + '/node_modules/.bin'
    ];
    
    // Add NVM paths for Unix-like systems
    const nvmDir = process.env.NVM_DIR || path.join(home, '.nvm');
    const nvmPaths = [];
    if (fs.existsSync(nvmDir)) {
      nvmPaths.push(path.join(nvmDir, 'bin'));
      const versionsDir = path.join(nvmDir, 'versions', 'node');
      if (fs.existsSync(versionsDir)) {
        try {
          const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
          entries.forEach((entry) => {
            if (entry.isDirectory()) {
              nvmPaths.push(path.join(versionsDir, entry.name, 'bin'));
            }
          });
        } catch (_) {}
      }
    }
    commonPaths.push(...nvmPaths);
    
    const voltaPath = path.join(home, '.volta', 'bin');
    commonPaths.push(voltaPath);
  }
  
  const allPaths = [originalPath, ...commonPaths].filter(Boolean);
  return allPaths.join(process.platform === 'win32' ? ';' : ':');
}

/**
 * Try to resolve the full path to a command
 */
function resolveCommand(command) {
  const { execSync } = require('child_process');
  const getConfig = () => {
    try {
      const data = fs.readFileSync(appState.configPath, 'utf8');
      return JSON.parse(data);
    } catch (_) {
      return {};
    }
  };
  const getOverride = (tool) => {
    try {
      const cfg = getConfig();
      const section = cfg.NodeTools || cfg.nodeTools || cfg.node || {};
      const p = section[tool];
      if (p && fs.existsSync(p)) return p;
      return null;
    } catch (_) {
      return null;
    }
  };
  const override = ['node', 'npm', 'npx'].includes(command) ? getOverride(command) : null;
  if (override) return override;
  
  try {
    // For Windows, try nvm which first for node-related commands
    if (process.platform === 'win32' && ['node', 'npm', 'npx'].includes(command)) {
      try {
        const nvmResult = execSync(`nvm which current`, { encoding: 'utf8' }).trim();
        if (nvmResult && fs.existsSync(nvmResult)) {
          const nvmDir = path.dirname(nvmResult);
          let targetCommand;
          if (command === 'node') {
            targetCommand = nvmResult;
          } else if (command === 'npm') {
            targetCommand = path.join(nvmDir, 'npm.cmd');
          } else if (command === 'npx') {
            targetCommand = path.join(nvmDir, 'npx.cmd');
          }
          
          if (targetCommand && fs.existsSync(targetCommand)) {
            console.log(`Resolved ${command} via NVM: ${targetCommand}`);
            return targetCommand;
          }
        }
      } catch (nvmError) {
        console.log(`NVM lookup failed for ${command}, falling back to standard resolution`);
      }
    }
    
    // Try to find the command using which (Unix) or where (Windows)
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${whichCommand} ${command}`, { 
      encoding: 'utf8',
      env: { ...process.env, PATH: getExtendedPath() }
    }).trim();
    
    // On Windows, 'where' might return multiple paths, take the first one
    const resolvedPath = process.platform === 'win32' ? result.split('\n')[0] : result;
    
    // Verify the resolved path exists
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      console.log(`Resolved ${command}: ${resolvedPath}`);
      return resolvedPath;
    }
    
    console.log(`Could not verify path for ${command}: ${resolvedPath}`);
    return command;
  } catch (error) {
    console.log(`Could not resolve path for ${command}, using as-is:`, error.message);
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

// Build and copy process
ipcMain.handle('build_copy', async (event, param) => {
  try {
    const config = JSON.parse(param.source);
    const directory = config.path;
    
    console.log(`Starting build in: ${directory}`);
    
    const npmPath = resolveCommand('npm');
    const executablePath = npmPath.includes(' ') ? `"${npmPath}"` : npmPath;
    
    const command = spawn(executablePath, ['run', 'build'], { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    sendOutput(event, 'build_output', '$ npm run build', param.progress, false);

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
    
    const npxPath = resolveCommand('npx');
    const executablePath = npxPath.includes(' ') ? `"${npxPath}"` : npxPath;
    
    const command = spawn(executablePath, ['ng', 'build', '--watch'], { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    sendOutput(event, 'watch_output', '$ npx ng build --watch', param.progress, param.rowCounter, null);

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
    
    console.log(`Starting npm install in: ${directory}`);
    
    const npmPath = resolveCommand('npm');
    const executablePath = npmPath.includes(' ') ? `"${npmPath}"` : npmPath;
    
    const command = spawn(executablePath, ['install'], { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    sendOutput(event, 'install_output', '$ npm install', param.progress, false);

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
    console.log(`Killing process ${pid} using tree-kill`);
    kill(pid, 'SIGTERM', (err) => {
      if (err) {
        console.log(`SIGTERM failed for ${pid}, trying SIGKILL:`, err.message);
        // If SIGTERM fails, try SIGKILL
        kill(pid, 'SIGKILL', (killErr) => {
          if (killErr) {
            console.error('Error killing process with SIGKILL:', killErr);
            resolve({ success: false, error: killErr.message });
          } else {
            console.log('Process killed successfully with SIGKILL:', pid);
            resolve({ success: true });
          }
        });
      } else {
        console.log('Process killed successfully with SIGTERM:', pid);
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
      await terminateProcessTree(existingPid);
      appState.removeRunningApp(directory);
      
      // Wait a bit for process cleanup on Windows
      if (process.platform === 'win32') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Parse the command and arguments
    const { baseCommand, args } = parseCommand(runCommand);
    const port = parsePortFromCommandString(runCommand);
    await waitForPortFree(port);
    
    const command = spawn(baseCommand, args, { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    
    // Track this new process immediately
    appState.addRunningApp(directory, command.pid);
    console.log(`Added new running app for ${directory} with PID: ${command.pid}`);
    
    sendOutput(event, 'app_output', `$ ${runCommand}`, param.progress, param.rowCounter, command.pid);
    
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
      console.log('App process exit event with code:', code);
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

// NPM Link operations
ipcMain.handle('npm_link_library', async (event, param) => {
  try {
    const { linkPath, libName, progressId } = param;
    
    console.log(`Starting npm link in: ${linkPath} for library: ${libName}`);
    
    const command = spawn(resolveCommand('npm'), ['link'], {
      cwd: linkPath,
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    
    sendOutput(event, 'link_output', `$ npm link (in ${linkPath})`, progressId, false);
    
    command.stdout.on('data', (data) => {
      sendOutput(event, 'link_output', data.toString(), progressId, false);
    });
    
    command.stderr.on('data', (data) => {
      sendOutput(event, 'link_output', data.toString(), progressId, false);
    });
    
    command.on('close', (code) => {
      console.log(`npm link process exited with code: ${code} for ${libName}`);
      sendOutput(event, 'link_output', `npm link completed for ${libName} with exit code: ${code}`, progressId, true, code);
    });
    
    command.on('error', (error) => {
      console.error('npm link process error:', error);
      sendOutput(event, 'link_output', `Error: ${error.message}`, progressId, true, -1);
    });
    
  } catch (error) {
    console.error('Failed to start npm link:', error);
    sendOutput(event, 'link_output', `Failed to start npm link: ${error.message}`, param.progressId, true, -1);
  }
});

ipcMain.handle('npm_link_destination', async (event, param) => {
  try {
    const { linkPath, libNames, progressId } = param;
    
    console.log(`Starting npm link in destination: ${linkPath} for libraries: ${libNames.join(', ')}`);
    
    const command = spawn(resolveCommand('npm'), ['link', ...libNames], {
      cwd: linkPath,
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    
    sendOutput(event, 'link_output', `$ npm link ${libNames.join(' ')} (in ${linkPath})`, progressId, false);
    
    command.stdout.on('data', (data) => {
      sendOutput(event, 'link_output', data.toString(), progressId, false);
    });
    
    command.stderr.on('data', (data) => {
      sendOutput(event, 'link_output', data.toString(), progressId, false);
    });
    
    command.on('close', (code) => {
      console.log(`npm link destination process exited with code: ${code}`);
      sendOutput(event, 'link_output', `npm link destination completed with exit code: ${code}`, progressId, true, code);
    });
    
    command.on('error', (error) => {
      console.error('npm link destination process error:', error);
      sendOutput(event, 'link_output', `Error: ${error.message}`, progressId, true, -1);
    });
    
  } catch (error) {
    console.error('Failed to start npm link destination:', error);
    sendOutput(event, 'link_output', `Failed to start npm link destination: ${error.message}`, param.progressId, true, -1);
  }
});

// NPM Unlink operations
ipcMain.handle('npm_unlink_destination', async (event, param) => {
  try {
    const { linkPath, libNames, progressId } = param;
    
    console.log(`Starting npm unlink in destination: ${linkPath} for libraries: ${libNames.join(', ')}`);
    
    const command = spawn(resolveCommand('npm'), ['unlink', ...libNames], {
      cwd: linkPath,
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    
    sendOutput(event, 'unlink_output', `$ npm unlink ${libNames.join(' ')} (in ${linkPath})`, progressId, false);
    
    command.stdout.on('data', (data) => {
      sendOutput(event, 'unlink_output', data.toString(), progressId, false);
    });
    
    command.stderr.on('data', (data) => {
      sendOutput(event, 'unlink_output', data.toString(), progressId, false);
    });
    
    command.on('close', (code) => {
      console.log(`npm unlink destination process exited with code: ${code}`);
      sendOutput(event, 'unlink_output', `npm unlink destination completed with exit code: ${code}`, progressId, true, code);
    });
    
    command.on('error', (error) => {
      console.error('npm unlink destination process error:', error);
      sendOutput(event, 'unlink_output', `Error: ${error.message}`, progressId, true, -1);
    });
    
  } catch (error) {
    console.error('Failed to start npm unlink destination:', error);
    sendOutput(event, 'unlink_output', `Failed to start npm unlink destination: ${error.message}`, param.progressId, true, -1);
  }
});

ipcMain.handle('npm_unlink_library', async (event, param) => {
  try {
    const { linkPath, libName, progressId } = param;
    
    console.log(`Starting npm unlink -g in: ${linkPath} for library: ${libName}`);
    
    const command = spawn(resolveCommand('npm'), ['unlink', '-g', libName], {
      cwd: linkPath,
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    
    sendOutput(event, 'unlink_output', `$ npm unlink -g ${libName} (in ${linkPath})`, progressId, false);
    
    command.stdout.on('data', (data) => {
      sendOutput(event, 'unlink_output', data.toString(), progressId, false);
    });
    
    command.stderr.on('data', (data) => {
      sendOutput(event, 'unlink_output', data.toString(), progressId, false);
    });
    
    command.on('close', (code) => {
      console.log(`npm unlink -g process exited with code: ${code} for ${libName}`);
      sendOutput(event, 'unlink_output', `npm unlink -g completed for ${libName} with exit code: ${code}`, progressId, true, code);
    });
    
    command.on('error', (error) => {
      console.error('npm unlink -g process error:', error);
      sendOutput(event, 'unlink_output', `Error: ${error.message}`, progressId, true, -1);
    });
    
  } catch (error) {
    console.error('Failed to start npm unlink -g:', error);
    sendOutput(event, 'unlink_output', `Failed to start npm unlink -g: ${error.message}`, param.progressId, true, -1);
  }
});

// File operations for editor
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    console.log('Main process: Reading file:', filePath);
    console.log('Main process: File exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('Main process: File read successfully, content length:', content.length);
    return { success: true, content };
  } catch (error) {
    console.error('Main process: Error reading file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    // Create backup before writing
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`Created backup: ${backupPath}`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully wrote to: ${filePath}`);
    return { success: true };
  } catch (error) {
    console.error('Error writing file:', error);
    return { success: false, error: error.message };
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
      await terminateProcessTree(existingPid);
      appState.removeRunningApp(directory);
      
      // Wait a bit for process cleanup on Windows
      if (process.platform === 'win32') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Start new process
    const { baseCommand, args } = parseCommand(runCommand);
    const port = parsePortFromCommandString(runCommand);
    await waitForPortFree(port);
    
    const command = spawn(baseCommand, args, { 
      cwd: directory, 
      shell: true,
      env: { ...process.env, PATH: getExtendedPath() }
    });
    
    // Track this new process immediately
    appState.addRunningApp(directory, command.pid);
    console.log(`Added new running app for restart ${directory} with PID: ${command.pid}`);
    
    sendOutput(event, 'app_output', `$ ${runCommand}`, param.progress, param.rowCounter, command.pid);
    
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
      console.log('Restart app exit event with code:', code);
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

    const npxPath = resolveCommand('npx');
    console.log(`Using npx path: ${npxPath}`);
    
    // Verify npx exists before spawning
    const cleanNpxPath = npxPath.replace(/^"(.*)"$/, '$1');
    if (!fs.existsSync(cleanNpxPath)) {
      const errorMsg = `npx not found at path: ${cleanNpxPath}`;
      console.error(errorMsg);
      sendOutput(event, 'copy_output', errorMsg, param.progress, true);
      return;
    }

    // Quote the path if it contains spaces
    const executablePath = npxPath.includes(' ') ? `"${npxPath}"` : npxPath;
    
    const command = spawn(executablePath, ['cpx', sourcePattern, destinationPath], {
      env: { ...process.env, PATH: getExtendedPath() },
      shell: true
    });
    sendOutput(event, 'copy_output', `$ npx cpx ${sourcePattern} ${destinationPath}`, param.progress, false);

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