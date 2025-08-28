/**
 * Example usage of npm configuration in ScriptRunner
 * This file demonstrates how to use the new npm/nvm path configuration
 */

// Example 1: Get system configuration
async function getSystemConfig() {
  try {
    const systemConfig = await window.electronAPI.invoke('get-system-config');
    console.log('System Configuration:', systemConfig);
    
    if (systemConfig.npm) {
      console.log('NPM Path:', systemConfig.npm.path);
      console.log('Using NVM:', systemConfig.npm.useNvm);
      console.log('NVM Path:', systemConfig.npm.nvmPath);
      console.log('Node Version:', systemConfig.npm.nodeVersion);
    }
    
    return systemConfig;
  } catch (error) {
    console.error('Error getting system config:', error);
  }
}

// Example 2: Execute npm install with configured paths
async function installDependencies(projectPath) {
  try {
    const result = await window.electronAPI.invoke('execute-npm-command', {
      command: 'npm',
      args: ['install'],
      cwd: projectPath
    });
    
    if (result.success) {
      console.log('Dependencies installed successfully');
      console.log('Output:', result.output);
    } else {
      console.error('Installation failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing npm install:', error);
  }
}

// Example 3: Execute npm run build with configured paths
async function buildProject(projectPath) {
  try {
    const result = await window.electronAPI.invoke('execute-npm-command', {
      command: 'npm',
      args: ['run', 'build'],
      cwd: projectPath
    });
    
    if (result.success) {
      console.log('Build completed successfully');
      console.log('Output:', result.output);
    } else {
      console.error('Build failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing npm build:', error);
  }
}

// Example 4: Execute npx command with configured paths
async function runNpxCommand(projectPath, npxArgs) {
  try {
    const result = await window.electronAPI.invoke('execute-npm-command', {
      command: 'npx',
      args: npxArgs,
      cwd: projectPath
    });
    
    if (result.success) {
      console.log('Npx command executed successfully');
      console.log('Output:', result.output);
    } else {
      console.error('Npx command failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing npx command:', error);
  }
}

// Example 5: Check npm version with configured paths
async function checkNpmVersion() {
  try {
    const result = await window.electronAPI.invoke('execute-npm-command', {
      command: 'npm',
      args: ['--version'],
      cwd: process.cwd()
    });
    
    if (result.success) {
      console.log('NPM Version:', result.output.trim());
    } else {
      console.error('Failed to get npm version:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error checking npm version:', error);
  }
}

// Example 6: Check node version with configured paths
async function checkNodeVersion() {
  try {
    const result = await window.electronAPI.invoke('execute-npm-command', {
      command: 'node',
      args: ['--version'],
      cwd: process.cwd()
    });
    
    if (result.success) {
      console.log('Node Version:', result.output.trim());
    } else {
      console.error('Failed to get node version:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error checking node version:', error);
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getSystemConfig,
    installDependencies,
    buildProject,
    runNpxCommand,
    checkNpmVersion,
    checkNodeVersion
  };
}

// Example usage in browser environment
if (typeof window !== 'undefined') {
  window.npmExamples = {
    getSystemConfig,
    installDependencies,
    buildProject,
    runNpxCommand,
    checkNpmVersion,
    checkNodeVersion
  };
}
