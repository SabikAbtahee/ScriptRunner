/**
 * Configuration Manager UI Utilities
 * 
 * This file provides utilities for displaying configuration and version information in the UI
 */

class ConfigManagerUI {
  constructor() {
    this.versionInfo = null;
    this.systemConfig = null;
  }

  /**
   * Load configuration and version information
   */
  async loadConfigInfo() {
    try {
      // Get system configuration
      this.systemConfig = await window.API.get_system_config();
      
      // Get version information
      this.versionInfo = await window.API.get_version_info();
      
      return {
        systemConfig: this.systemConfig,
        versionInfo: this.versionInfo
      };
    } catch (error) {
      console.error('Error loading config info:', error);
      throw error;
    }
  }

  /**
   * Display configuration loaded message with version details
   */
  async showConfigLoadedMessage(outputChannel = 'app_output', progress = false, rowCounter = null) {
    try {
      await this.loadConfigInfo();
      
      // Show basic config loaded message
      this.sendOutput(outputChannel, '✅ Configuration loaded and saved successfully!', progress, rowCounter);
      
      // Show version information
      this.showVersionInfo(outputChannel, progress, rowCounter);
      
      // Show configuration summary
      this.showConfigSummary(outputChannel, progress, rowCounter);
      
    } catch (error) {
      this.sendOutput(outputChannel, `❌ Error loading configuration: ${error.message}`, progress, rowCounter);
    }
  }

  /**
   * Display version information
   */
  showVersionInfo(outputChannel, progress, rowCounter) {
    if (!this.versionInfo) return;
    
    this.sendOutput(outputChannel, '📋 Node.js Tools Version Information:', progress, rowCounter);
    this.sendOutput(outputChannel, '', progress, rowCounter); // Empty line for spacing
    
    // Node.js version
    if (this.versionInfo.node) {
      this.sendOutput(outputChannel, `🟢 Node.js: ${this.versionInfo.node}`, progress, rowCounter);
      this.sendOutput(outputChannel, `   Path: ${this.versionInfo.nodePath}`, progress, rowCounter);
    } else {
      this.sendOutput(outputChannel, `🔴 Node.js: Not found`, progress, rowCounter);
    }
    
    // npm version
    if (this.versionInfo.npm) {
      this.sendOutput(outputChannel, `🟢 npm: ${this.versionInfo.npm}`, progress, rowCounter);
      this.sendOutput(outputChannel, `   Path: ${this.versionInfo.npmPath}`, progress, rowCounter);
    } else {
      this.sendOutput(outputChannel, `🔴 npm: Not found`, progress, rowCounter);
    }
    
    // npx version
    if (this.versionInfo.npx) {
      this.sendOutput(outputChannel, `🟢 npx: ${this.versionInfo.npx}`, progress, rowCounter);
      this.sendOutput(outputChannel, `   Path: ${this.versionInfo.npxPath}`, progress, rowCounter);
    } else {
      this.sendOutput(outputChannel, `🔴 npx: Not found`, progress, rowCounter);
    }
    
    this.sendOutput(outputChannel, '', progress, rowCounter); // Empty line for spacing
  }

  /**
   * Display configuration summary
   */
  showConfigSummary(outputChannel, progress, rowCounter) {
    if (!this.systemConfig || !this.systemConfig.npm) return;
    
    const npmConfig = this.systemConfig.npm;
    
    this.sendOutput(outputChannel, '⚙️ Configuration Summary:', progress, rowCounter);
    
    // Show configured paths
    if (npmConfig.nodePath) {
      this.sendOutput(outputChannel, `   Node.js: ${npmConfig.nodePath}`, progress, rowCounter);
    }
    
    if (npmConfig.npmPath) {
      this.sendOutput(outputChannel, `   npm: ${npmConfig.npmPath}`, progress, rowCounter);
    }
    
    if (npmConfig.npxPath) {
      this.sendOutput(outputChannel, `   npx: ${npmConfig.npxPath}`, progress, rowCounter);
    }
    
    // Show if using system fallback
    if (!npmConfig.nodePath && !npmConfig.npmPath && !npmConfig.npxPath) {
      this.sendOutput(outputChannel, `   Using system PATH for all tools`, progress, rowCounter);
    }
    
    this.sendOutput(outputChannel, '', progress, rowCounter); // Empty line for spacing
  }

  /**
   * Display detailed configuration information
   */
  async showDetailedConfig(outputChannel = 'app_output', progress = false, rowCounter = null) {
    try {
      await this.loadConfigInfo();
      
      this.sendOutput(outputChannel, '🔍 Detailed Configuration Information:', progress, rowCounter);
      this.sendOutput(outputChannel, '', progress, rowCounter);
      
      // Show system configuration
      if (this.systemConfig) {
        this.sendOutput(outputChannel, '📁 System Configuration:', progress, rowCounter);
        this.sendOutput(outputChannel, JSON.stringify(this.systemConfig, null, 2), progress, rowCounter);
        this.sendOutput(outputChannel, '', progress, rowCounter);
      }
      
      // Show version information
      if (this.versionInfo) {
        this.sendOutput(outputChannel, '📊 Version Information:', progress, rowCounter);
        this.sendOutput(outputChannel, JSON.stringify(this.versionInfo, null, 2), progress, rowCounter);
        this.sendOutput(outputChannel, '', progress, rowCounter);
      }
      
    } catch (error) {
      this.sendOutput(outputChannel, `❌ Error showing detailed config: ${error.message}`, progress, rowCounter);
    }
  }

  /**
   * Check if configuration is valid
   */
  async validateConfiguration() {
    try {
      await this.loadConfigInfo();
      
      const issues = [];
      
      // Check if configured paths exist
      if (this.systemConfig && this.systemConfig.npm) {
        const npmConfig = this.systemConfig.npm;
        
        if (npmConfig.nodePath && !this.fileExists(npmConfig.nodePath)) {
          issues.push(`Node.js path does not exist: ${npmConfig.nodePath}`);
        }
        
        if (npmConfig.npmPath && !this.fileExists(npmConfig.npmPath)) {
          issues.push(`npm path does not exist: ${npmConfig.npmPath}`);
        }
        
        if (npmConfig.npxPath && !this.fileExists(npmConfig.npxPath)) {
          issues.push(`npx path does not exist: ${npmConfig.npxPath}`);
        }
      }
      
      // Check if versions are accessible
      if (this.versionInfo) {
        if (this.versionInfo.node === 'Not found' || this.versionInfo.node === 'Error getting version') {
          issues.push('Node.js is not accessible');
        }
        
        if (this.versionInfo.npm === 'Not found' || this.versionInfo.npm === 'Error getting version') {
          issues.push('npm is not accessible');
        }
        
        if (this.versionInfo.npx === 'Not found' || this.versionInfo.npx === 'Error getting version') {
          issues.push('npx is not accessible');
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues: issues
      };
      
    } catch (error) {
      return {
        isValid: false,
        issues: [`Error validating configuration: ${error.message}`]
      };
    }
  }

  /**
   * Show configuration validation results
   */
  async showValidationResults(outputChannel = 'app_output', progress = false, rowCounter = null) {
    try {
      const validation = await this.validateConfiguration();
      
      if (validation.isValid) {
        this.sendOutput(outputChannel, '✅ Configuration validation passed! All tools are accessible.', progress, rowCounter);
      } else {
        this.sendOutput(outputChannel, '❌ Configuration validation failed:', progress, rowCounter);
        validation.issues.forEach(issue => {
          this.sendOutput(outputChannel, `   • ${issue}`, progress, rowCounter);
        });
      }
      
      this.sendOutput(outputChannel, '', progress, rowCounter);
      
    } catch (error) {
      this.sendOutput(outputChannel, `❌ Error validating configuration: ${error.message}`, progress, rowCounter);
    }
  }

  /**
   * Helper method to send output
   */
  sendOutput(channel, message, progress, rowCounter) {
    // Use the existing UI output system if available
    if (window.API && window.API[channel]) {
      // For now, we'll use console.log as the output system
      // You can enhance this to use your actual UI output channels
      console.log(`[${channel}] ${message}`);
    } else {
      // Fallback to console
      console.log(`[${channel}] ${message}`);
    }
  }

  /**
   * Helper method to check if file exists
   */
  fileExists(path) {
    // This is a simplified check - in a real implementation,
    // you might want to use the main process to check file existence
    return path && path !== 'Not found' && path !== 'system PATH';
  }

  /**
   * Refresh configuration information
   */
  async refreshConfig() {
    this.versionInfo = null;
    this.systemConfig = null;
    return await this.loadConfigInfo();
  }
}

// Create global instance
window.configManagerUI = new ConfigManagerUI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigManagerUI;
}

// Example usage functions
window.configUtils = {
  /**
   * Show configuration loaded message with versions
   */
  async showConfigLoaded(outputChannel = 'app_output', progress = false, rowCounter = null) {
    return await window.configManagerUI.showConfigLoadedMessage(outputChannel, progress, rowCounter);
  },

  /**
   * Show detailed configuration
   */
  async showDetailedConfig(outputChannel = 'app_output', progress = false, rowCounter = null) {
    return await window.configManagerUI.showDetailedConfig(outputChannel, progress, rowCounter);
  },

  /**
   * Validate configuration
   */
  async validateConfig() {
    return await window.configManagerUI.validateConfiguration();
  },

  /**
   * Show validation results
   */
  async showValidationResults(outputChannel = 'app_output', progress = false, rowCounter = null) {
    return await window.configManagerUI.showValidationResults(outputChannel, progress, rowCounter);
  },

  /**
   * Get version information
   */
  async getVersionInfo() {
    try {
      return await window.API.get_version_info();
    } catch (error) {
      console.error('Error getting version info:', error);
      return null;
    }
  },

  /**
   * Get system configuration
   */
  async getSystemConfig() {
    try {
      return await window.API.get_system_config();
    } catch (error) {
      console.error('Error getting system config:', error);
      return null;
    }
  }
};
