import { BuildRow } from './build-row.js';
import { AppRow } from './app-row.js';
import { ProcessManager } from './process-manager.js';
import { ConfigManager } from './config-manager.js';
import { DOMUtils } from './dom-utils.js';

/**
 * Main Application Class
 * Orchestrates the entire application
 */
class ScriptRunnerApp {
  constructor() {
    this.processManager = new ProcessManager();
    this.rowCounter = 0;
    this.container = null;
    this.buildRows = new Map(); // Track build row instances
    this.appRows = new Map(); // Track app row instances
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupApp());
    } else {
      this.setupApp();
    }
  }

  setupApp() {
    try {
      this.container = document.getElementById('rowsContainer');
      if (!this.container) {
        throw new Error('Rows container not found');
      }

      this.setupEventListeners();
      this.checkSavedConfig();
      this.createInitialBuildRow();
      
      console.log('Script Runner 3.0 initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupEventListeners() {
    // Load config button
    const loadConfigButton = document.getElementById('loadConfigButton');
    const configFileInput = document.getElementById('configFileInput');
    
    if (loadConfigButton && configFileInput) {
      DOMUtils.addSafeEventListener(loadConfigButton, 'click', () => {
        configFileInput.click();
      });
      
      DOMUtils.addSafeEventListener(configFileInput, 'change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          await this.handleConfigFileLoad(file);
        }
      });
    }

    // Add build row button
    const addBuildRowButton = document.getElementById('addBuildRowButton');
    if (addBuildRowButton) {
      DOMUtils.addSafeEventListener(addBuildRowButton, 'click', () => {
        this.createBuildRow();
      });
    }

    // Add app row button
    const addAppRowButton = document.getElementById('addAppRowButton');
    if (addAppRowButton) {
      DOMUtils.addSafeEventListener(addAppRowButton, 'click', () => {
        this.createAppRow();
      });
    }

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            this.createBuildRow();
            break;
          case 'a':
            e.preventDefault();
            this.createAppRow();
            break;
        }
      }
    });
  }

  async createBuildRow() {
    try {
      this.rowCounter++;
      const buildRow = new BuildRow(
        this.container, 
        this.processManager, 
        this.rowCounter,
        (rowId, type) => this.handleRowRemoval(rowId, type)
      );
      await buildRow.create();
      
      // Store reference to the row instance
      this.buildRows.set(this.rowCounter, buildRow);
      
      // Scroll to new row
      buildRow.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error('Failed to create build row:', error);
      this.showError('Failed to create build row');
    }
  }

  async createAppRow() {
    try {
      this.rowCounter++;
      const appRow = new AppRow(
        this.container, 
        this.processManager, 
        this.rowCounter,
        (rowId, type) => this.handleRowRemoval(rowId, type)
      );
      await appRow.create();
      
      // Store reference to the row instance
      this.appRows.set(this.rowCounter, appRow);
      
      // Scroll to new row
      appRow.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error('Failed to create app row:', error);
      this.showError('Failed to create application row');
    }
  }

  async createInitialBuildRow() {
    // Create one build row by default
    try {
      await this.createBuildRow();
    } catch (error) {
      console.error('Failed to create initial build row:', error);
    }
  }

  showError(message) {
    // Create a temporary error notification
    const errorDiv = DOMUtils.createElement('div', {
      className: 'error-notification',
      textContent: message,
      attributes: {
        style: `
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: var(--error-color);
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          z-index: 1000;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        `
      }
    });

    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      DOMUtils.removeElement(errorDiv);
    }, 5000);
  }

  async handleConfigFileLoad(file) {
    try {
      // Show loading state
      this.showMessage('Loading configuration...', 'info');
      
      // Load and validate the config file
      const config = await ConfigManager.loadConfigFromFile(file);
      console.log('Config loaded successfully:', config);
      
      // Success message
      this.showMessage(`Configuration loaded and saved: ${file.name}`, 'success');
      
      // Refresh all existing rows to use new config
      await this.refreshAllRows();
      console.log('All rows refreshed');
      
    } catch (error) {
      console.error('Failed to load config file:', error);
      this.showError(`Failed to load config: ${error.message}`);
      
      // Reset file input
      const configFileInput = document.getElementById('configFileInput');
      if (configFileInput) {
        configFileInput.value = '';
      }
    }
  }

  showMessage(message, type = 'info') {
    let statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
      statusElement = DOMUtils.createElement('div', {
        id: 'statusMessage',
        className: `message message--${type}`,
        style: 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; z-index: 1000; background: var(--surface-color); border: 1px solid var(--border-color); box-shadow: var(--shadow-md);'
      });
      document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.className = `message message--${type}`;
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (statusElement && statusElement.parentNode) {
          statusElement.parentNode.removeChild(statusElement);
        }
      }, 3000);
    }
  }

  async refreshAllRows() {
    // Refresh all build rows using stored instances
    for (const [rowId, buildRow] of this.buildRows) {
      try {
        await buildRow.refreshSelectors();
      } catch (error) {
        console.error(`Failed to refresh build row ${rowId}:`, error);
      }
    }
    
    // Refresh all app rows using stored instances
    for (const [rowId, appRow] of this.appRows) {
      try {
        await appRow.refreshSelector();
      } catch (error) {
        console.error(`Failed to refresh app row ${rowId}:`, error);
      }
    }
  }

  checkSavedConfig() {
    const storageInfo = ConfigManager.getStorageInfo();
    if (storageInfo && storageInfo.hasConfig) {
      // Show info message about loaded config
      this.showMessage(`Using saved config (loaded: ${storageInfo.lastLoaded})`, 'info');
    }
  }

  handleRowRemoval(rowId, type) {
    if (type === 'build') {
      this.buildRows.delete(rowId);
    } else if (type === 'app') {
      this.appRows.delete(rowId);
    }
  }
}

// Initialize the application
new ScriptRunnerApp();
