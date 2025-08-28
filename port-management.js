/**
 * Port Management Utilities for ScriptRunner
 * Handles port conflicts and process cleanup for Angular applications
 */

class PortManager {
  constructor() {
    this.knownPorts = new Map(); // Map of app directory to port
  }

  /**
   * Extract port from Angular serve command or config
   */
  extractPortFromCommand(command, appConfig = null) {
    // First try to get port from config
    if (appConfig && appConfig.port) {
      return appConfig.port.toString();
    }
    
    // Fallback to extracting from command
    if (command.includes('ng serve') || command.includes('ng serve --port=')) {
      const portMatch = command.match(/--port=(\d+)/);
      if (portMatch) {
        return portMatch[1];
      } else {
        // Default Angular port is 4200
        return '4200';
      }
    }
    return null;
  }

  /**
   * Kill process by port
   */
  async killProcessByPort(port, outputChannel = null, progress = null, rowCounter = null) {
    try {
      let result;
      
      if (outputChannel) {
        // Use enhanced version with UI output
        result = await window.electronAPI.invoke('kill-by-port-with-output', { 
          port, 
          outputChannel, 
          progress, 
          rowCounter 
        });
      } else {
        // Use basic version
        result = await window.electronAPI.invoke('kill-by-port', { port });
      }
      
      if (result.success) {
        console.log(`Successfully freed port ${port}`);
        return true;
      } else {
        console.error(`Failed to free port ${port}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`Error killing process on port ${port}:`, error);
      return false;
    }
  }

  /**
   * Enhanced restart with port cleanup
   */
  async restartWithPortCleanup(appConfig, progressCallback) {
    try {
      const directory = appConfig.path;
      const runCommand = appConfig.runCommand || 'npm run start';
      
      console.log('Enhanced restart for:', directory);
      console.log('Command:', runCommand);
      
      // Extract port from config or command
      const port = this.extractPortFromCommand(runCommand, appConfig);
      if (port) {
        console.log(`Detected port ${port} for Angular app (${appConfig.name || 'Unknown'})`);
        
        // Kill any process using this port
        const portFreed = await this.killProcessByPort(port);
        if (portFreed) {
          // Wait for port to be fully released
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log(`Port ${port} should be free now`);
        }
      }
      
      // Now restart the application
      const result = await window.electronAPI.invoke('restart_app', {
        path: JSON.stringify(appConfig),
        progress: progressCallback
      });
      
      return result;
    } catch (error) {
      console.error('Enhanced restart failed:', error);
      throw error;
    }
  }

  /**
   * Check if port is in use
   */
  async isPortInUse(port) {
    try {
      // Try to kill any process on the port
      const result = await this.killProcessByPort(port);
      return !result; // If we can't kill anything, port might be free
    } catch (error) {
      return false; // Assume port is free if we can't check
    }
  }

  /**
   * Force cleanup all known ports
   */
  async cleanupAllPorts() {
    const ports = Array.from(this.knownPorts.values());
    console.log('Cleaning up all known ports:', ports);
    
    for (const port of ports) {
      try {
        await this.killProcessByPort(port);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between ports
      } catch (error) {
        console.log(`Could not cleanup port ${port}:`, error);
      }
    }
    
    this.knownPorts.clear();
  }

  /**
   * Register an app with its port
   */
  registerAppPort(directory, port) {
    if (port) {
      this.knownPorts.set(directory, port);
      console.log(`Registered app ${directory} with port ${port}`);
    }
  }

  /**
   * Unregister an app
   */
  unregisterApp(directory) {
    this.knownPorts.delete(directory);
    console.log(`Unregistered app ${directory}`);
  }
}

// Create global instance
window.portManager = new PortManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortManager;
}

// Example usage functions
window.portUtils = {
  /**
   * Quick port check and cleanup
   */
  async quickPortCleanup(port, outputChannel = null, progress = null, rowCounter = null) {
    return await window.portManager.killProcessByPort(port, outputChannel, progress, rowCounter);
  },

  /**
   * Smart restart that handles port conflicts
   */
  async smartRestart(appConfig, progressCallback) {
    return await window.portManager.restartWithPortCleanup(appConfig, progressCallback);
  },

  /**
   * Check if a specific port is available
   */
  async checkPortAvailability(port) {
    return !(await window.portManager.isPortInUse(port));
  },

  /**
   * Get port from app config or command
   */
  getPortFromConfig(appConfig, runCommand = null) {
    // First try to get port from config
    if (appConfig && appConfig.port) {
      return appConfig.port;
    }
    
    // Fallback to extracting from command
    if (runCommand && (runCommand.includes('ng serve') || runCommand.includes('ng serve --port='))) {
      const portMatch = runCommand.match(/--port=(\d+)/);
      if (portMatch) {
        return parseInt(portMatch[1]);
      }
    }
    
    // Default Angular port
    return 4200;
  },

  /**
   * Ensure port is free before starting app
   */
  async ensurePortFree(appConfig, runCommand = null, outputChannel = null, progress = null, rowCounter = null) {
    const port = this.getPortFromConfig(appConfig, runCommand);
    console.log(`Ensuring port ${port} is free for ${appConfig.name || 'Unknown App'}`);
    
    try {
      const result = await this.killProcessByPort(port.toString(), outputChannel, progress, rowCounter);
      if (result) {
        console.log(`Port ${port} is now free`);
        return true;
      }
    } catch (error) {
      console.log(`Could not free port ${port}:`, error);
    }
    return false;
  }
};
