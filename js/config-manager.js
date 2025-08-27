/**
 * Configuration Manager
 * Handles all configuration-related operations
 */
export class ConfigManager {
  static currentConfig = null;

  static async getConfig() {
    try {
      if (this.currentConfig) {
        return this.currentConfig;
      }
      return await window.API.get_config();
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error('Configuration could not be loaded');
    }
  }

  static setConfig(config) {
    this.currentConfig = config;
  }

  static resetConfig() {
    this.currentConfig = null;
  }

  static async loadConfigFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target.result);
          if (this.validateConfig(config)) {
            this.setConfig(config);
            resolve(config);
          } else {
            reject(new Error('Invalid configuration format'));
          }
        } catch (error) {
          reject(new Error('Failed to parse JSON file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  static validateConfig(config) {
    // Check if config has the required structure
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check for Library and Application sections
    const hasLibrary = config.Library && typeof config.Library === 'object';
    const hasApplication = config.Application && typeof config.Application === 'object';

    if (!hasLibrary && !hasApplication) {
      return false;
    }

    // Validate Library entries
    if (hasLibrary) {
      for (const [key, library] of Object.entries(config.Library)) {
        if (!library.name || !library.path || typeof library.name !== 'string' || typeof library.path !== 'string') {
          return false;
        }
      }
    }

    // Validate Application entries
    if (hasApplication) {
      for (const [key, app] of Object.entries(config.Application)) {
        if (!app.name || !app.path || typeof app.name !== 'string' || typeof app.path !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  static parseProjectConfig(configString) {
    try {
      return JSON.parse(configString);
    } catch (error) {
      console.error('Failed to parse project configuration:', error);
      return null;
    }
  }

  static validateProjectConfig(config) {
    return config && config.path && typeof config.path === 'string';
  }
}
