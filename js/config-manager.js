/**
 * Configuration Manager
 * Handles all configuration-related operations with persistence
 */
export class ConfigManager {
  static currentConfig = null;
  static STORAGE_KEY = 'scriptrunner_config';

  static async getConfig() {
    try {
      // First check if we have a current config in memory
      if (this.currentConfig) {
        return this.currentConfig;
      }
      
      // Try to load from localStorage
      const savedConfig = this.loadFromStorage();
      if (savedConfig) {
        this.currentConfig = savedConfig;
        return savedConfig;
      }
      
      // Fall back to default config from API
      return await window.API.get_config();
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error('Configuration could not be loaded');
    }
  }

  static setConfig(config) {
    this.currentConfig = config;
    this.saveToStorage(config);
  }

  static saveToStorage(config) {
    try {
      const configData = {
        config: config,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configData));
      console.log('Configuration saved to storage');
    } catch (error) {
      console.error('Failed to save configuration to storage:', error);
    }
  }

  static loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }
      
      const configData = JSON.parse(stored);
      
      // Validate the stored config
      if (configData.config && this.validateConfig(configData.config)) {
        console.log('Configuration loaded from storage');
        return configData.config;
      } else {
        console.warn('Invalid configuration in storage, clearing...');
        this.clearStorage();
        return null;
      }
    } catch (error) {
      console.error('Failed to load configuration from storage:', error);
      this.clearStorage();
      return null;
    }
  }

  static clearStorage() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Configuration storage cleared');
    } catch (error) {
      console.error('Failed to clear configuration storage:', error);
    }
  }

  static getStorageInfo() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }
      
      const configData = JSON.parse(stored);
      return {
        hasConfig: true,
        timestamp: configData.timestamp,
        lastLoaded: new Date(configData.timestamp).toLocaleString(),
        version: configData.version || 'unknown'
      };
    } catch (error) {
      return null;
    }
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
