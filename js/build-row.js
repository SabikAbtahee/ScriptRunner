import { DOMUtils } from './dom-utils.js';
import { ConfigManager } from './config-manager.js';

/**
 * Build Row Component
 * Handles the creation and management of build rows
 */
export class BuildRow {
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
      this.processManager.registerBuildRow(this.rowId, this);
      
      return this.element;
    } catch (error) {
      console.error('Failed to create build row:', error);
      throw error;
    }
  }

  createRowElement(config) {
    const row = DOMUtils.createElement('div', {
      className: 'row u-fade-in',
      id: `build-row-${this.rowId}`
    });

    const content = DOMUtils.createElement('div', {
      className: 'row__content'
    });

    // Create selectors section
    const selectorsDiv = this.createSelectorsSection(config);
    content.appendChild(selectorsDiv);

    // Create terminal
    const terminal = DOMUtils.createElement('pre', {
      id: `build-progress-${this.rowId}`,
      className: 'terminal u-hidden'
    });
    content.appendChild(terminal);

    // Create controls
    const controls = this.createControlsSection();
    
    row.appendChild(content);
    row.appendChild(controls);

    return row;
  }

  createSelectorsSection(config) {
    const selectorsDiv = DOMUtils.createElement('div', {
      className: 'build-row__selectors'
    });

    // Source selector
    const sourceDiv = DOMUtils.createElement('div', {
      className: 'build-row__selector'
    });
    const sourceSelect = this.createLibrarySelect(config);
    sourceDiv.appendChild(sourceSelect);

    // Arrow
    const arrowDiv = DOMUtils.createElement('div', {
      className: 'build-row__arrow',
      innerHTML: DOMUtils.createIcon('m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z')
    });

    // Destination selector
    const destDiv = DOMUtils.createElement('div', {
      className: 'build-row__selector'
    });
    const destSelect = this.createApplicationSelect(config);
    destDiv.appendChild(destSelect);

    selectorsDiv.appendChild(sourceDiv);
    selectorsDiv.appendChild(arrowDiv);
    selectorsDiv.appendChild(destDiv);

    return selectorsDiv;
  }

  createLibrarySelect(config) {
    const select = DOMUtils.createSelect({
      placeholder: 'Select a library',
      id: `source-select-${this.rowId}`
    });

    Object.keys(config.Library || {}).forEach(key => {
      const library = config.Library[key];
      const option = DOMUtils.createElement('option', {
        textContent: library.name,
        attributes: {
          value: JSON.stringify({
            path: library.path,
            node_path: library.libPath
          })
        }
      });
      select.appendChild(option);
    });

    return select;
  }

  createApplicationSelect(config) {
    const select = DOMUtils.createSelect({
      placeholder: 'Select destination',
      id: `dest-select-${this.rowId}`
    });

    // Add applications
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

    // Add libraries as destinations
    Object.keys(config.Library || {}).forEach(key => {
      const library = config.Library[key];
      const option = DOMUtils.createElement('option', {
        textContent: library.name,
        attributes: {
          value: JSON.stringify({
            path: library.path
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

    // Build & Copy button
    const buildButton = DOMUtils.createButton('Build & Copy', {
      id: `build-button-${this.rowId}`,
      variant: 'btn--primary',
      icon: DOMUtils.getButtonIcon('build')
    });
    DOMUtils.addSafeEventListener(buildButton, 'click', () => this.handleBuildAndCopy());

    // Copy button
    const copyButton = DOMUtils.createButton('Copy', {
      id: `copy-button-${this.rowId}`,
      variant: 'btn--copy',
      icon: DOMUtils.getButtonIcon('copy')
    });
    DOMUtils.addSafeEventListener(copyButton, 'click', () => this.handleCopy());

    // Watch button
    const watchButton = DOMUtils.createButton('Watch', {
      id: `watch-button-${this.rowId}`,
      variant: 'btn--warning',
      icon: DOMUtils.getButtonIcon('watch')
    });
    DOMUtils.addSafeEventListener(watchButton, 'click', () => this.handleWatch());

    // Install button
    const installButton = DOMUtils.createButton('Install', {
      id: `install-button-${this.rowId}`,
      variant: 'btn--install',
      icon: DOMUtils.getButtonIcon('install')
    });
    DOMUtils.addSafeEventListener(installButton, 'click', () => this.handleInstall());

    // Close button
    const closeButton = DOMUtils.createElement('button', {
      className: 'btn btn--error btn--icon',
      id: `close-button-${this.rowId}`,
      innerHTML: DOMUtils.createIcon('m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'),
      attributes: { title: 'Remove row' }
    });
    DOMUtils.addSafeEventListener(closeButton, 'click', () => this.handleClose());

    // Progress display
    const progressDiv = DOMUtils.createElement('pre', {
      id: `progress-${this.rowId}`,
      className: 'terminal terminal--centered u-hidden'
    });

    // Individual time display for this build row
    const timeDiv = DOMUtils.createElement('div', {
      className: 'build-time u-hidden',
      id: `build-time-${this.rowId}`,
      innerHTML: '<span class="build-time__label">Time Spent:</span> <span class="build-time__value">0s</span>'
    });

    // Status indicator for build operations
    const statusDiv = DOMUtils.createElement('div', {
      className: 'status u-hidden',
      id: `build-status-${this.rowId}`
    });

    actions.appendChild(buildButton);
    actions.appendChild(copyButton);
    actions.appendChild(watchButton);
    actions.appendChild(installButton);
    
    controls.appendChild(actions);
    controls.appendChild(closeButton);
    controls.appendChild(progressDiv);
    controls.appendChild(statusDiv);
    controls.appendChild(timeDiv);

    return controls;
  }

  handleBuildAndCopy() {
    const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
    const destSelect = document.getElementById(`dest-select-${this.rowId}`);
    
    if (!this.validateSelections(sourceSelect, destSelect)) return;

    const buildButton = document.getElementById(`build-button-${this.rowId}`);
    buildButton.classList.add('btn--disabled');
    buildButton.blur(); // Remove focus from the button

    // Update status to building
    this.updateStatus('building', 'Building');

    // Start individual timer for this operation
    this.startIndividualTimer();

    // Start timing for this operation
    const operationId = `build-copy-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'build-copy');

    this.processManager.buildAndCopy(
      sourceSelect.value,
      destSelect.value,
      `progress-${this.rowId}`,
      operationId // Pass operation ID for timer tracking
    );
  }

  handleCopy() {
    const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
    const destSelect = document.getElementById(`dest-select-${this.rowId}`);
    
    if (!this.validateSelections(sourceSelect, destSelect)) return;

    const copyButton = document.getElementById(`copy-button-${this.rowId}`);
    copyButton.classList.add('btn--disabled');
    copyButton.blur(); // Remove focus from the button

    // Update status to copying
    this.updateStatus('building', 'Copying');

    // Start individual timer for this operation
    this.startIndividualTimer();

    // Start timing for this operation
    const operationId = `copy-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'copy');

    this.processManager.copy(
      sourceSelect.value,
      destSelect.value,
      `progress-${this.rowId}`,
      operationId // Pass operation ID for timer tracking
    );
  }

  handleWatch() {
    const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
    const destSelect = document.getElementById(`dest-select-${this.rowId}`);
    
    if (!sourceSelect.value) {
      alert('Please select a source library');
      return;
    }

    const watchButton = document.getElementById(`watch-button-${this.rowId}`);
    watchButton.classList.add('btn--disabled');
    watchButton.blur(); // Remove focus from the button

    // Update close button to handle process killing
    const closeButton = document.getElementById(`close-button-${this.rowId}`);
    closeButton.onclick = () => {
      const pid = closeButton.dataset.pid;
      if (pid) {
        this.processManager.killProcess(pid);
      }
      this.remove();
    };

    this.processManager.watch(
      sourceSelect.value,
      destSelect.value || '',
      `progress-${this.rowId}`,
      this.rowId
    );
  }

  handleInstall() {
    const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
    
    if (!sourceSelect.value) {
      alert('Please select a source library');
      return;
    }

    const installButton = document.getElementById(`install-button-${this.rowId}`);
    installButton.classList.add('btn--disabled');
    installButton.blur(); // Remove focus from the button

    // Update status to installing
    this.updateStatus('installing', 'Installing');

    // Start individual timer for this operation
    this.startIndividualTimer();

    // Setup process kill handler
    this.setupProcessKillHandler();

    // Start timing for this operation
    const operationId = `install-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'install');

    this.processManager.install(
      sourceSelect.value,
      `build-progress-${this.rowId}`,
      operationId
    );
  }

  handleClose() {
    this.remove();
  }

  setupProcessKillHandler() {
    const closeButton = document.getElementById(`close-button-${this.rowId}`);
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

  validateSelections(sourceSelect, destSelect) {
    if (!sourceSelect.value || !destSelect.value) {
      alert('Please select both source and destination');
      return false;
    }
    return true;
  }

  async refreshSelectors() {
    try {
      console.log(`Refreshing build row ${this.rowId} selectors`);
      const config = await ConfigManager.getConfig();
      console.log('Config for refresh:', config);
      
      // Refresh source selector (libraries)
      const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
      if (sourceSelect) {
        console.log('Refreshing source selector');
        this.populateLibrarySelect(sourceSelect, config);
      }
      
      // Refresh destination selector (libraries + applications)
      const destSelect = document.getElementById(`dest-select-${this.rowId}`);
      if (destSelect) {
        console.log('Refreshing destination selector');
        this.populateApplicationSelect(destSelect, config);
      }
    } catch (error) {
      console.error('Failed to refresh build row selectors:', error);
    }
  }

  populateLibrarySelect(select, config) {
    // Clear existing options except placeholder
    select.innerHTML = '<option value="" disabled selected>Select a library</option>';
    
    // Add library options
    Object.keys(config.Library || {}).forEach(key => {
      const library = config.Library[key];
      const option = DOMUtils.createElement('option', {
        textContent: library.name,
        attributes: {
          value: JSON.stringify({
            path: library.path,
            node_path: library.libPath
          })
        }
      });
      select.appendChild(option);
    });
  }

  populateApplicationSelect(select, config) {
    // Clear existing options except placeholder
    select.innerHTML = '<option value="" disabled selected>Select destination</option>';
    
    // Add applications
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

    // Add libraries as destinations
    Object.keys(config.Library || {}).forEach(key => {
      const library = config.Library[key];
      const option = DOMUtils.createElement('option', {
        textContent: library.name,
        attributes: {
          value: JSON.stringify({
            path: library.path
          })
        }
      });
      select.appendChild(option);
    });
  }

  /**
   * Update build status display
   */
  updateStatus(type, text) {
    const statusDiv = document.getElementById(`build-status-${this.rowId}`);
    if (statusDiv) {
      statusDiv.className = `status status--${type}`;
      statusDiv.innerHTML = `
        <span class="status__dot"></span>
        <span class="status__text">${text}</span>
      `;
      statusDiv.classList.remove('u-hidden');
    }
  }

  /**
   * Set completed status for build operations
   */
  setBuildCompleteStatus(operationType) {
    // Update status to completed with date
    const statusText = operationType === 'build' ? 'Build Done' : 'Copied';
    const currentDate = new Date().toLocaleString();
    
    // If this is a copy operation and we already have a build status, add copied status
    const statusDiv = document.getElementById(`build-status-${this.rowId}`);
    if (operationType === 'copy' && statusDiv && statusDiv.innerHTML.includes('Build Done')) {
      // Add copied status alongside build done
      statusDiv.innerHTML = `
        <span class="status__dot"></span>
        <span class="status__text">Build Done & Copied - ${currentDate}</span>
      `;
    } else {
      this.updateStatus('compiled', `${statusText} - ${currentDate}`);
    }
    
    // Stop individual timer
    this.stopIndividualTimer();
  }

  /**
   * Handle install completion
   */
  onInstallComplete(data) {
    // Re-enable install button
    const installButton = document.getElementById(`install-button-${this.rowId}`);
    if (installButton) {
      installButton.classList.remove('btn--disabled');
    }

    // Update status to completed with date
    const currentDate = new Date().toLocaleString();
    
    // Check if install was successful
    if (data.includes('exit code: 0') || data.includes('Install completed with exit code: 0')) {
      this.updateStatus('installed', `Install Done - ${currentDate}`);
    } else {
      this.updateStatus('error', `Install Failed - ${currentDate}`);
    }
    
    // Stop individual timer
    this.stopIndividualTimer();
  }

  /**
   * Start individual timer for this build row
   */
  startIndividualTimer() {
    this.currentOperationStart = Date.now();
    this.currentOperationTime = 0;
    
    // Show time display
    const timeDiv = document.getElementById(`build-time-${this.rowId}`);
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
   * Stop individual timer for this build row
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
    const timeDiv = document.getElementById(`build-time-${this.rowId}`);
    if (timeDiv) {
      timeDiv.classList.add('u-hidden');
    }
  }

  /**
   * Update the individual time display
   */
  updateIndividualTimeDisplay() {
    const timeValueSpan = document.querySelector(`#build-time-${this.rowId} .build-time__value`);
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

  remove() {
    // Stop individual timer cleanup
    this.stopIndividualTimer();
    
    // Unregister from process manager
    this.processManager.unregisterBuildRow(this.rowId);
    
    if (this.element) {
      DOMUtils.removeElement(this.element);
    }
    
    // Notify parent app about removal
    if (this.onRemove) {
      this.onRemove(this.rowId, 'build');
    }
  }
}
