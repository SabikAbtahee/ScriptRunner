/**
 * Dynamic Port Configuration Examples
 * 
 * This file shows how to use the new dynamic port system in ScriptRunner
 */

// Example 1: Get port from app config
async function getAppPort() {
  const appConfig = {
    name: "Admin",
    path: "/path/to/admin",
    runCommand: "ng serve --port=4201",
    port: 4201
  };
  
  // Get port from config (priority 1)
  const port = window.portUtils.getPortFromConfig(appConfig);
  console.log(`App port: ${port}`); // Output: 4201
  
  // Get port from command (priority 2) - if no port in config
  const appConfigNoPort = {
    name: "Dashboard",
    path: "/path/to/dashboard",
    runCommand: "ng serve --port=4200"
    // No port property
  };
  
  const portFromCommand = window.portUtils.getPortFromConfig(appConfigNoPort);
  console.log(`Port from command: ${portFromCommand}`); // Output: 4200
}

// Example 2: Ensure port is free before starting
async function startAppSafely(appConfig) {
  try {
    // First ensure the port is free
    const portFreed = await window.portUtils.ensurePortFree(appConfig);
    
    if (portFreed) {
      console.log(`Port ${appConfig.port} is free, starting app...`);
      
      // Now start the app
      const result = await window.electronAPI.invoke('run_app', {
        path: JSON.stringify(appConfig),
        progress: true
      });
      
      return result;
    } else {
      console.log(`Could not free port ${appConfig.port}, app might fail to start`);
      // Still try to start the app
      return await window.electronAPI.invoke('run_app', {
        path: JSON.stringify(appConfig),
        progress: true
      });
    }
  } catch (error) {
    console.error('Failed to start app:', error);
    throw error;
  }
}

// Example 3: Smart restart with dynamic port detection
async function restartAppSmart(appConfig) {
  try {
    console.log(`Smart restart for ${appConfig.name} on port ${appConfig.port}`);
    
    // This will automatically:
    // 1. Detect the port from config
    // 2. Kill any existing process
    // 3. Free the port
    // 4. Restart the app
    const result = await window.portUtils.smartRestart(appConfig, true);
    
    return result;
  } catch (error) {
    console.error('Smart restart failed:', error);
    throw error;
  }
}

// Example 4: Manual port cleanup for specific apps
async function cleanupAppPorts() {
  const apps = [
    { name: "Admin", port: 4201 },
    { name: "Dashboard", port: 4200 },
    { name: "AiAssistant", port: 4203 }
  ];
  
  for (const app of apps) {
    try {
      console.log(`Cleaning up port ${app.port} for ${app.name}`);
      await window.portUtils.quickPortCleanup(app.port.toString());
      console.log(`Port ${app.port} cleaned up`);
    } catch (error) {
      console.log(`Could not cleanup port ${app.port}:`, error);
    }
  }
}

// Example 5: Check port availability before starting
async function checkPortsBeforeStart() {
  const apps = [
    { name: "Admin", port: 4201 },
    { name: "Dashboard", port: 4200 },
    { name: "AiAssistant", port: 4203 }
  ];
  
  for (const app of apps) {
    const isAvailable = await window.portUtils.checkPortAvailability(app.port.toString());
    console.log(`Port ${app.port} for ${app.name}: ${isAvailable ? 'Available' : 'In Use'}`);
    
    if (!isAvailable) {
      console.log(`Port ${app.port} is in use, cleaning up...`);
      await window.portUtils.quickPortCleanup(app.port.toString());
    }
  }
}

// Example 6: Using the enhanced restart from main process
async function useEnhancedRestart(appConfig) {
  try {
    // This uses the enhanced restart in main.js that:
    // 1. Reads port from appConfig.port
    // 2. Kills existing process gracefully
    // 3. Frees the port
    // 4. Waits for port release
    // 5. Starts new process
    const result = await window.electronAPI.invoke('restart_app', {
      path: JSON.stringify(appConfig),
      progress: true
    });
    
    return result;
  } catch (error) {
    console.error('Enhanced restart failed:', error);
    throw error;
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAppPort,
    startAppSafely,
    restartAppSmart,
    cleanupAppPorts,
    checkPortsBeforeStart,
    useEnhancedRestart
  };
}

// Make functions available globally
window.dynamicPortExamples = {
  getAppPort,
  startAppSafely,
  restartAppSmart,
  cleanupAppPorts,
  checkPortsBeforeStart,
  useEnhancedRestart
};
