/**
 * Configuration Button Integration Example
 * 
 * This file shows how to integrate the new version display with your existing config button
 */

// Example 1: Enhanced config button click handler
async function handleConfigButtonClick() {
  try {
    // Your existing config loading logic here
    console.log('Loading configuration...');
    
    // After config is loaded, show enhanced message with versions
    await window.configUtils.showConfigLoaded('app_output', true, 0);
    
    // You can also validate the configuration
    await window.configUtils.showValidationResults('app_output', true, 0);
    
  } catch (error) {
    console.error('Error handling config button click:', error);
  }
}

// Example 2: Replace existing "Configuration loaded and saved" message
async function showEnhancedConfigMessage() {
  try {
    // Instead of just showing "Configuration loaded and saved"
    // Now you'll see:
    // ✅ Configuration loaded and saved successfully!
    // 📋 Node.js Tools Version Information:
    // 🟢 Node.js: v22.14.0
    //    Path: /Users/sabik.abtahee@iqvia.com/.nvm/versions/node/v22.14.0/bin/node
    // 🟢 npm: 10.9.0
    //    Path: /Users/sabik.abtahee@iqvia.com/.nvm/versions/node/v22.14.0/bin/npm
    // 🟢 npx: 10.9.0
    //    Path: /Users/sabik.abtahee@iqvia.com/.nvm/versions/node/v22.14.0/bin/npx
    // ⚙️ Configuration Summary:
    //    Node.js: /Users/sabik.abtahee@iqvia.com/.nvm/versions/node/v22.14.0/bin/node
    //    npm: /Users/sabik.abtahee@iqvia.com/.nvm/versions/node/v22.14.0/bin/npm
    //    npx: /Users/sabik.abtahee@iqvia.com/.nvm/versions/node/v22.14.0/bin/npx
    
    await window.configUtils.showConfigLoaded('app_output', true, 0);
    
  } catch (error) {
    console.error('Error showing enhanced config message:', error);
  }
}

// Example 3: Show configuration status in different output channels
async function showConfigStatusInChannels() {
  try {
    // Show in app output
    await window.configUtils.showConfigLoaded('app_output', true, 0);
    
    // Show in build output
    await window.configUtils.showConfigLoaded('build_output', true, 0);
    
    // Show in install output
    await window.configUtils.showConfigLoaded('install_output', true, 0);
    
  } catch (error) {
    console.error('Error showing config status in channels:', error);
  }
}

// Example 4: Configuration validation button
async function handleConfigValidationClick() {
  try {
    console.log('Validating configuration...');
    
    // Show validation results
    await window.configUtils.showValidationResults('app_output', true, 0);
    
  } catch (error) {
    console.error('Error validating configuration:', error);
  }
}

// Example 5: Detailed configuration button
async function handleDetailedConfigClick() {
  try {
    console.log('Showing detailed configuration...');
    
    // Show detailed configuration information
    await window.configUtils.showDetailedConfig('app_output', true, 0);
    
  } catch (error) {
    console.error('Error showing detailed configuration:', error);
  }
}

// Example 6: Refresh configuration button
async function handleRefreshConfigClick() {
  try {
    console.log('Refreshing configuration...');
    
    // Refresh and show updated information
    await window.configManagerUI.refreshConfig();
    await window.configUtils.showConfigLoaded('app_output', true, 0);
    
  } catch (error) {
    console.error('Error refreshing configuration:', error);
  }
}

// Example 7: Integration with existing config loading
async function loadConfigurationWithVersions() {
  try {
    // Your existing config loading code here
    const config = await window.electronAPI.invoke('get-config');
    console.log('Configuration loaded:', config);
    
    // Now show enhanced message with versions
    await window.configUtils.showConfigLoaded('app_output', true, 0);
    
    // Check if configuration is valid
    const validation = await window.configUtils.validateConfig();
    if (!validation.isValid) {
      console.warn('Configuration has issues:', validation.issues);
      // You might want to show a warning to the user
    }
    
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

// Example 8: Show configuration info on app startup
async function showStartupConfigInfo() {
  try {
    // Show configuration status when app starts
    await window.configUtils.showConfigLoaded('app_output', false, 0);
    
  } catch (error) {
    console.error('Error showing startup config info:', error);
  }
}

// Example 9: Configuration change notification
async function notifyConfigChanged() {
  try {
    console.log('Configuration changed, showing updated info...');
    
    // Refresh and show new configuration
    await window.configManagerUI.refreshConfig();
    await window.configUtils.showConfigLoaded('app_output', true, 0);
    
  } catch (error) {
    console.error('Error notifying config change:', error);
  }
}

// Example 10: Get version info programmatically
async function getVersionInfoProgrammatically() {
  try {
    const versionInfo = await window.configUtils.getVersionInfo();
    const systemConfig = await window.configUtils.getSystemConfig();
    
    console.log('Version Info:', versionInfo);
    console.log('System Config:', systemConfig);
    
    // You can use this information in your UI
    return { versionInfo, systemConfig };
    
  } catch (error) {
    console.error('Error getting version info:', error);
    return null;
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleConfigButtonClick,
    showEnhancedConfigMessage,
    showConfigStatusInChannels,
    handleConfigValidationClick,
    handleDetailedConfigClick,
    handleRefreshConfigClick,
    loadConfigurationWithVersions,
    showStartupConfigInfo,
    notifyConfigChanged,
    getVersionInfoProgrammatically
  };
}

// Make functions available globally
window.configButtonExamples = {
  handleConfigButtonClick,
  showEnhancedConfigMessage,
  showConfigStatusInChannels,
  handleConfigValidationClick,
  handleDetailedConfigClick,
  handleRefreshConfigClick,
  loadConfigurationWithVersions,
  showStartupConfigInfo,
  notifyConfigChanged,
  getVersionInfoProgrammatically
};
