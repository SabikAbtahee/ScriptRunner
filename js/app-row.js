import { DOMUtils } from './dom-utils.js';
import { ConfigManager } from './config-manager.js';

/**
 * Application Row Component
 * Handles the creation and management of application rows
 */
export class AppRow {
  constructor(container, processManager, timeTracker, rowId, onRemove = null) {
    this.container = container;
    this.processManager = processManager;
    this.timeTracker = timeTracker;
    this.rowId = rowId;
    this.element = null;
    this.onRemove = onRemove;
    
    // Individual timer properties
    this.currentOperationStart = null;
    this.currentOperationTime = 0;
    this.timerInterval = null;
  }

  async create() {
    try {
      const config = await ConfigManager.getConfig();
      this.element = this.createRowElement(config);
      this.container.appendChild(this.element);
      
      // Register this instance with the process manager
      this.processManager.registerAppRow(this.rowId, this);
      
      return this.element;
    } catch (error) {
      console.error('Failed to create app row:', error);
      throw error;
    }
  }

  createRowElement(config) {
    const row = DOMUtils.createElement('div', {
      className: 'row u-fade-in',
      id: `app-row-${this.rowId}`
    });

    const content = DOMUtils.createElement('div', {
      className: 'row__content'
    });

    // Create app selector
    const selectorDiv = this.createSelectorSection(config);
    content.appendChild(selectorDiv);

    // Create terminal
    const terminal = DOMUtils.createElement('pre', {
      id: `app-progress-${this.rowId}`,
      className: 'terminal u-hidden'
    });
    content.appendChild(terminal);

    // Create controls
    const controls = this.createControlsSection();
    
    row.appendChild(content);
    row.appendChild(controls);

    return row;
  }

  createSelectorSection(config) {
    const selectorDiv = DOMUtils.createElement('div', {
      className: 'app-row__selector'
    });

    const select = this.createApplicationSelect(config);
    selectorDiv.appendChild(select);

    return selectorDiv;
  }

  createApplicationSelect(config) {
    const select = DOMUtils.createSelect({
      placeholder: 'Select an application',
      id: `app-select-${this.rowId}`
    });

    Object.keys(config.Application || {}).forEach(key => {
      const app = config.Application[key];
      const option = DOMUtils.createElement('option', {
        textContent: app.name,
        attributes: {
          value: JSON.stringify({
            path: app.path,
            runCommand: app.runCommand
          })
        }
      });
      select.appendChild(option);
    });

    return select;
  }

  createControlsSection() {
    const controls = DOMUtils.createElement('div', {
      className: 'row__controls'
    });

    const actions = DOMUtils.createElement('div', {
      className: 'row__actions'
    });

    // Run button
    const runButton = DOMUtils.createButton('Run', {
      id: `run-button-${this.rowId}`,
      variant: 'btn--run',
      icon: DOMUtils.getButtonIcon('run')
    });
    DOMUtils.addSafeEventListener(runButton, 'click', () => this.handleRun());

    // Restart button
    const restartButton = DOMUtils.createButton('Restart', {
      id: `restart-button-${this.rowId}`,
      variant: 'btn--restart',
      icon: DOMUtils.getButtonIcon('restart')
    });
    DOMUtils.addSafeEventListener(restartButton, 'click', () => this.handleRestart());

    // Close button
    const closeButton = DOMUtils.createElement('button', {
      className: 'btn btn--error btn--icon',
      id: `app-close-button-${this.rowId}`,
      innerHTML: DOMUtils.createIcon('m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'),
      attributes: { title: 'Remove application' }
    });
    DOMUtils.addSafeEventListener(closeButton, 'click', () => this.handleClose());

    // Status indicator
    const statusDiv = DOMUtils.createElement('div', {
      className: 'status u-hidden',
      id: `app-status-${this.rowId}`
    });

    // Individual time display for this app
    const timeDiv = DOMUtils.createElement('div', {
      className: 'app-time u-hidden',
      id: `app-time-${this.rowId}`,
      innerHTML: '<span class="app-time__label">Time Spent:</span> <span class="app-time__value">0s</span>'
    });

    actions.appendChild(runButton);
    actions.appendChild(restartButton);
    
    controls.appendChild(actions);
    controls.appendChild(closeButton);
    controls.appendChild(statusDiv);
    controls.appendChild(timeDiv);

    return controls;
  }

  handleRun() {
    const appSelect = document.getElementById(`app-select-${this.rowId}`);
    
    if (!appSelect.value) {
      alert('Please select an application');
      return;
    }

    // Disable run button and remove focus
    const runButton = document.getElementById(`run-button-${this.rowId}`);
    runButton.classList.add('btn--disabled');
    runButton.blur(); // Remove focus from the button

    // Update status
    this.updateStatus('running', 'Running');
    
    // Start individual timer for this operation
    this.startIndividualTimer();
    
    // Update close button to handle process killing
    this.setupProcessKillHandler();

    // Start timing for this operation
    const operationId = `run-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'run');

    this.processManager.runApp(
      appSelect.value,
      `app-progress-${this.rowId}`,
      this.rowId,
      operationId // Pass operation ID for timer tracking
    );
  }

  handleRestart() {
    const appSelect = document.getElementById(`app-select-${this.rowId}`);
    
    if (!appSelect.value) {
      alert('Please select an application');
      return;
    }

    // Disable restart button and remove focus
    const restartButton = document.getElementById(`restart-button-${this.rowId}`);
    restartButton.classList.add('btn--disabled');
    restartButton.blur(); // Remove focus from the button

    // Update status
    this.updateStatus('building', 'Restarting');
    
    // Start individual timer for this operation (reset from previous)
    this.startIndividualTimer();
    
    // Update close button to handle process killing
    this.setupProcessKillHandler();

    // Start timing for this operation
    const operationId = `restart-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'restart');

    this.processManager.restartApp(
      appSelect.value,
      `app-progress-${this.rowId}`,
      this.rowId,
      operationId // Pass operation ID for timer tracking
    );
  }

  handleClose() {
    const closeButton = document.getElementById(`app-close-button-${this.rowId}`);
    const pid = closeButton.dataset.pid;
    
    if (pid) {
      this.processManager.killProcess(pid);
    }
    
    // Stop individual timer when closing
    this.stopIndividualTimer();
    
    this.remove();
  }

  setupProcessKillHandler() {
    const closeButton = document.getElementById(`app-close-button-${this.rowId}`);
    closeButton.onclick = () => {
      const pid = closeButton.dataset.pid;
      if (pid) {
        this.processManager.killProcess(pid);
      }
      
      // Stop individual timer when killing process
      this.stopIndividualTimer();
      
      this.remove();
    };
  }

  updateStatus(type, text) {
    const statusDiv = document.getElementById(`app-status-${this.rowId}`);
    if (statusDiv) {
      statusDiv.className = `status status--${type}`;
      statusDiv.innerHTML = `
        <span class="status__dot"></span>
        <span class="status__text">${text}</span>
      `;
      statusDiv.classList.remove('u-hidden');
    }
  }

  setCompiledStatus() {
    // Update status to compiled
    this.updateStatus('compiled', 'Compiled');
    
    // Stop individual timer
    this.stopIndividualTimer();
    
    // Only re-enable restart button, keep run button disabled
    const restartButton = document.getElementById(`restart-button-${this.rowId}`);
    
    if (restartButton) restartButton.classList.remove('btn--disabled');
  }

  /**
   * Start individual timer for this app row
   */
  startIndividualTimer() {
    this.currentOperationStart = Date.now();
    this.currentOperationTime = 0;
    
    // Show time display
    const timeDiv = document.getElementById(`app-time-${this.rowId}`);
    if (timeDiv) {
      timeDiv.classList.remove('u-hidden');
    }
    
    // Update timer every second
    this.timerInterval = setInterval(() => {
      this.updateIndividualTimeDisplay();
    }, 1000);
    
    // Initial display update
    this.updateIndividualTimeDisplay();
  }

  /**
   * Stop individual timer for this app row
   */
  stopIndividualTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Calculate final time
    if (this.currentOperationStart) {
      this.currentOperationTime = Math.round((Date.now() - this.currentOperationStart) / 1000);
      this.currentOperationStart = null;
    }
    
    // Final display update
    this.updateIndividualTimeDisplay();
  }

  /**
   * Reset individual timer (for new operations)
   */
  resetIndividualTimer() {
    this.stopIndividualTimer();
    this.currentOperationTime = 0;
    
    // Hide time display
    const timeDiv = document.getElementById(`app-time-${this.rowId}`);
    if (timeDiv) {
      timeDiv.classList.add('u-hidden');
    }
  }

  /**
   * Update the individual time display
   */
  updateIndividualTimeDisplay() {
    const timeValueSpan = document.querySelector(`#app-time-${this.rowId} .app-time__value`);
    if (timeValueSpan) {
      let currentTime = this.currentOperationTime;
      
      // If timer is running, calculate current elapsed time
      if (this.currentOperationStart) {
        currentTime = Math.round((Date.now() - this.currentOperationStart) / 1000);
      }
      
      timeValueSpan.textContent = this.formatTime(currentTime);
    }
  }

  /**
   * Format time in seconds to human readable format
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes}m`;
      }
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      let result = `${hours}h`;
      if (minutes > 0) {
        result += ` ${minutes}m`;
      }
      if (remainingSeconds > 0) {
        result += ` ${remainingSeconds}s`;
      }
      return result;
    }
  }

  async refreshSelector() {
    try {
      const config = await ConfigManager.getConfig();
      
      // Refresh app selector
      const appSelect = document.getElementById(`app-select-${this.rowId}`);
      if (appSelect) {
        this.populateApplicationSelect(appSelect, config);
      }
    } catch (error) {
      console.error('Failed to refresh app row selector:', error);
    }
  }

  populateApplicationSelect(select, config) {
    // Clear existing options except placeholder
    select.innerHTML = '<option value="" disabled selected>Select an application</option>';
    
    // Add application options
    Object.keys(config.Application || {}).forEach(key => {
      const app = config.Application[key];
      const option = DOMUtils.createElement('option', {
        textContent: app.name,
        attributes: {
          value: JSON.stringify({
            path: app.path,
            runCommand: app.runCommand
          })
        }
      });
      select.appendChild(option);
    });
  }

  remove() {
    // Stop individual timer cleanup
    this.stopIndividualTimer();
    
    // Unregister from process manager
    this.processManager.unregisterAppRow(this.rowId);
    
    if (this.element) {
      DOMUtils.removeElement(this.element);
    }
    
    // Notify parent app about removal
    if (this.onRemove) {
      this.onRemove(this.rowId, 'app');
    }
  }
}
