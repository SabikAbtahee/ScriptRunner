/**
 * Configuration Manager
 * Handles all configuration-related operations
 */
export class ConfigManager {
  static async getConfig() {
    try {
      return await window.API.get_config();
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error('Configuration could not be loaded');
    }
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
