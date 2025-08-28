/**
 * UI Output Examples for Port Management
 * 
 * This file shows how to use the enhanced UI output system in ScriptRunner
 */

// Example 1: Basic port cleanup with UI output
async function cleanupPortWithUI(port, outputChannel, progress, rowCounter) {
  try {
    // This will show status messages in the UI
    const result = await window.portUtils.quickPortCleanup(
      port.toString(), 
      outputChannel, 
      progress, 
      rowCounter
    );
    
    if (result) {
      console.log(`Port ${port} cleaned up successfully`);
    } else {
      console.log(`Failed to cleanup port ${port}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error cleaning up port ${port}:`, error);
    return false;
  }
}

// Example 2: Ensure port is free with UI output
async function ensurePortFreeWithUI(appConfig, outputChannel, progress, rowCounter) {
  try {
    // This will show all port management steps in the UI
    const result = await window.portUtils.ensurePortFree(
      appConfig, 
      null, // runCommand (optional)
      outputChannel, 
      progress, 
      rowCounter
    );
    
    return result;
  } catch (error) {
    console.error('Error ensuring port is free:', error);
    return false;
  }
}

// Example 3: Smart restart with enhanced UI output
async function smartRestartWithUI(appConfig, progress, rowCounter) {
  try {
    // This will show all restart steps in the UI
    const result = await window.portUtils.smartRestart(
      appConfig, 
      progress
    );
    
    return result;
  } catch (error) {
    console.error('Smart restart failed:', error);
    throw error;
  }
}

// Example 4: Manual port management with UI feedback
async function manualPortManagement(appConfig, progress, rowCounter) {
  try {
    const port = window.portUtils.getPortFromConfig(appConfig);
    console.log(`Managing port ${port} for ${appConfig.name}`);
    
    // Step 1: Check if port is available
    const isAvailable = await window.portUtils.checkPortAvailability(port.toString());
    
    if (!isAvailable) {
      console.log(`Port ${port} is in use, cleaning up...`);
      
      // Step 2: Clean up port with UI output
      await window.portUtils.quickPortCleanup(
        port.toString(), 
        'app_output', // Show in app output channel
        progress, 
        rowCounter
      );
      
      // Step 3: Wait a bit for port to be fully released
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`Port ${port} should be free now`);
    }
    
    // Step 4: Start the app
    const result = await window.electronAPI.invoke('run_app', {
      path: JSON.stringify(appConfig),
      progress: progress
    });
    
    return result;
  } catch (error) {
    console.error('Manual port management failed:', error);
    throw error;
  }
}

// Example 5: Batch port cleanup with UI output
async function batchPortCleanup(apps, outputChannel, progress) {
  const results = [];
  
  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    const rowCounter = i; // Use index as row counter
    
    try {
      console.log(`Cleaning up port ${app.port} for ${app.name}`);
      
      const result = await window.portUtils.quickPortCleanup(
        app.port.toString(),
        outputChannel,
        progress,
        rowCounter
      );
      
      results.push({
        app: app.name,
        port: app.port,
        success: result
      });
      
      // Small delay between ports
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error cleaning up port ${app.port}:`, error);
      results.push({
        app: app.name,
        port: app.port,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Example 6: Using different output channels
async function useDifferentOutputChannels() {
  const appConfig = {
    name: "TestApp",
    path: "/path/to/app",
    port: 4200
  };
  
  // Use app_output channel for app-related messages
  await window.portUtils.ensurePortFree(
    appConfig, 
    null, 
    'app_output', 
    true, 
    0
  );
  
  // Use build_output channel for build-related messages
  await window.portUtils.quickPortCleanup(
    4201, 
    'build_output', 
    true, 
    0
  );
  
  // Use install_output channel for install-related messages
  await window.portUtils.quickPortCleanup(
    4202, 
    'install_output', 
    true, 
    0
  );
}

// Example 7: Enhanced restart with detailed UI feedback
async function enhancedRestartWithFeedback(appConfig, progress, rowCounter) {
  try {
    // This will show detailed restart process in the UI:
    // 1. "Restarting app in directory: /path/to/app"
    // 2. "Using run command: ng serve --port=4200"
    // 3. "Using configured port: 4200"
    // 4. "Attempting to free port 4200..."
    // 5. "Successfully freed port 4200"
    // 6. "Port 4200 should be free now"
    // 7. All the actual app output
    
    const result = await window.electronAPI.invoke('restart_app', {
      path: JSON.stringify(appConfig),
      progress: progress,
      rowCounter: rowCounter
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
    cleanupPortWithUI,
    ensurePortFreeWithUI,
    smartRestartWithUI,
    manualPortManagement,
    batchPortCleanup,
    useDifferentOutputChannels,
    enhancedRestartWithFeedback
  };
}

// Make functions available globally
window.uiOutputExamples = {
  cleanupPortWithUI,
  ensurePortFreeWithUI,
  smartRestartWithUI,
  manualPortManagement,
  batchPortCleanup,
  useDifferentOutputChannels,
  enhancedRestartWithFeedback
};
