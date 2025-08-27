import { BuildRow } from './build-row.js';
import { AppRow } from './app-row.js';
import { ProcessManager } from './process-manager.js';
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
      this.createInitialBuildRow();
      
      console.log('Script Runner 2.0 initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupEventListeners() {
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
      const buildRow = new BuildRow(this.container, this.processManager, this.rowCounter);
      await buildRow.create();
      
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
      const appRow = new AppRow(this.container, this.processManager, this.rowCounter);
      await appRow.create();
      
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
}

// Initialize the application
new ScriptRunnerApp();
