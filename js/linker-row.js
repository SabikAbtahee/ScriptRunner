import { DOMUtils } from './dom-utils.js';
import { ConfigManager } from './config-manager.js';

/**
 * Linker Row Component
 * Handles the creation and management of linker rows
 */
export class LinkerRow {
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
      this.processManager.registerLinkerRow(this.rowId, this);
      
      return this.element;
    } catch (error) {
      console.error('Failed to create linker row:', error);
      throw error;
    }
  }

  createRowElement(config) {
    const row = DOMUtils.createElement('div', {
      className: 'row u-fade-in',
      id: `linker-row-${this.rowId}`
    });

    const content = DOMUtils.createElement('div', {
      className: 'row__content'
    });

    // Create selectors section
    const selectorsDiv = this.createSelectorsSection(config);
    content.appendChild(selectorsDiv);

    // Create terminal
    const terminal = DOMUtils.createElement('pre', {
      id: `linker-progress-${this.rowId}`,
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

    // Source selector (Library)
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

    // Destination selector (Applications + Libraries)
    const destDiv = DOMUtils.createElement('div', {
      className: 'build-row__selector'
    });
    const destSelect = this.createDestinationSelect(config);
    destDiv.appendChild(destSelect);

    selectorsDiv.appendChild(sourceDiv);
    selectorsDiv.appendChild(arrowDiv);
    selectorsDiv.appendChild(destDiv);

    return selectorsDiv;
  }

  createLibrarySelect(config) {
    const multiselect = DOMUtils.createMultiSelect({
      placeholder: 'Select libraries...',
      id: `linker-source-select-${this.rowId}`
    });

    Object.keys(config.Library || {}).forEach(key => {
      const library = config.Library[key];
      const value = JSON.stringify({
        path: library.path,
        node_path: library.libPath,
        linkPath: library.linkPath,
        libName: library.libName
      });
      
      multiselect.addOption(value, library.name, {
        path: library.path,
        node_path: library.libPath,
        linkPath: library.linkPath,
        libName: library.libName
      });
    });

    return multiselect;
  }

  createDestinationSelect(config) {
    const select = DOMUtils.createSelect({
      placeholder: 'Select destination',
      id: `linker-dest-select-${this.rowId}`
    });

    // Add applications
    Object.keys(config.Application || {}).forEach(key => {
      const app = config.Application[key];
      const option = DOMUtils.createElement('option', {
        textContent: app.name,
        attributes: {
          value: JSON.stringify({
            path: app.path,
            runCommand: app.runCommand,
            linkPath: app.linkPath
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
            path: library.path,
            linkPath: library.linkPath
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

    // Link button
    const linkButton = DOMUtils.createButton('Link', {
      id: `link-button-${this.rowId}`,
      variant: 'btn--linker',
      icon: DOMUtils.getButtonIcon('link')
    });
    DOMUtils.addSafeEventListener(linkButton, 'click', () => this.handleLink());

    // Unlink button
    const unlinkButton = DOMUtils.createButton('Unlink', {
      id: `unlink-button-${this.rowId}`,
      variant: 'btn--unlinker',
      icon: DOMUtils.getButtonIcon('unlink')
    });
    DOMUtils.addSafeEventListener(unlinkButton, 'click', () => this.handleUnlink());

    // Close button
    const closeButton = DOMUtils.createElement('button', {
      className: 'btn btn--error btn--icon',
      id: `linker-close-button-${this.rowId}`,
      innerHTML: DOMUtils.createIcon('m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'),
      attributes: { title: 'Remove row' }
    });
    DOMUtils.addSafeEventListener(closeButton, 'click', () => this.handleClose());

    // Progress display
    const progressDiv = DOMUtils.createElement('pre', {
      id: `linker-progress-display-${this.rowId}`,
      className: 'terminal terminal--centered u-hidden'
    });

    // Individual time display for this linker row
    const timeDiv = DOMUtils.createElement('div', {
      className: 'build-time u-hidden',
      id: `linker-time-${this.rowId}`,
      innerHTML: '<span class="build-time__label">Time Spent:</span> <span class="build-time__value">0s</span>'
    });

    // Status indicator for link operations
    const statusDiv = DOMUtils.createElement('div', {
      className: 'status u-hidden',
      id: `linker-status-${this.rowId}`
    });

    actions.appendChild(linkButton);
    actions.appendChild(unlinkButton);
    
    controls.appendChild(actions);
    controls.appendChild(closeButton);
    controls.appendChild(progressDiv);
    controls.appendChild(statusDiv);
    controls.appendChild(timeDiv);

    return controls;
  }

  handleLink() {
    const sourceMultiselect = document.getElementById(`linker-source-select-${this.rowId}`);
    const destSelect = document.getElementById(`linker-dest-select-${this.rowId}`);
    
    if (!this.validateSelections(sourceMultiselect, destSelect)) return;

    const linkButton = document.getElementById(`link-button-${this.rowId}`);
    linkButton.classList.add('btn--disabled');
    linkButton.blur(); // Remove focus from the button

    // Update status to linking
    this.updateStatus('building', 'Linking');

    // Start individual timer for this operation
    this.startIndividualTimer();

    // Start timing for this operation
    const operationId = `link-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'link');

    // Get selected libraries and destination
    const selectedLibraries = sourceMultiselect.getSelectedItems();
    const destination = JSON.parse(destSelect.value);

    // Prepare libraries data for linking
    const libraries = selectedLibraries.map(item => {
      const data = JSON.parse(item.value);
      return {
        linkPath: data.linkPath,
        libName: data.libName,
        name: item.name
      };
    });

    // Prepare destination data
    const destinationData = {
      linkPath: destination.linkPath
    };

    // Start the npm link process
    this.processManager.linkLibraries(
      libraries,
      destinationData,
      `linker-progress-${this.rowId}`,
      operationId
    );
  }

  handleUnlink() {
    const sourceMultiselect = document.getElementById(`linker-source-select-${this.rowId}`);
    const destSelect = document.getElementById(`linker-dest-select-${this.rowId}`);
    
    if (!this.validateSelections(sourceMultiselect, destSelect)) return;

    const unlinkButton = document.getElementById(`unlink-button-${this.rowId}`);
    unlinkButton.classList.add('btn--disabled');
    unlinkButton.blur(); // Remove focus from the button

    // Update status to unlinking
    this.updateStatus('building', 'Unlinking');

    // Start individual timer for this operation
    this.startIndividualTimer();

    // Start timing for this operation
    const operationId = `unlink-${this.rowId}`;
    this.timeTracker.startTimer(operationId, 'unlink');

    // Get selected libraries and destination
    const selectedLibraries = sourceMultiselect.getSelectedItems();
    const destination = JSON.parse(destSelect.value);

    // Prepare libraries data for unlinking
    const libraries = selectedLibraries.map(item => {
      const data = JSON.parse(item.value);
      return {
        linkPath: data.linkPath,
        libName: data.libName,
        name: item.name
      };
    });

    // Prepare destination data
    const destinationData = {
      linkPath: destination.linkPath
    };

    // Start the npm unlink process
    this.processManager.unlinkLibraries(
      libraries,
      destinationData,
      `linker-progress-${this.rowId}`,
      operationId
    );
  }

  handleClose() {
    this.remove();
  }

  validateSelections(sourceMultiselect, destSelect) {
    const selectedLibraries = sourceMultiselect.getSelectedValues();
    if (selectedLibraries.length === 0 || !destSelect.value) {
      alert('Please select at least one library and a destination');
      return false;
    }
    return true;
  }

  async refreshSelectors() {
    try {
      console.log(`Refreshing linker row ${this.rowId} selectors`);
      const config = await ConfigManager.getConfig();
      console.log('Config for refresh:', config);
      
      // Refresh source multiselect (libraries)
      const sourceMultiselect = document.getElementById(`linker-source-select-${this.rowId}`);
      if (sourceMultiselect) {
        console.log('Refreshing linker source multiselect');
        this.populateLibraryMultiselect(sourceMultiselect, config);
      }
      
      // Refresh destination selector (libraries + applications)
      const destSelect = document.getElementById(`linker-dest-select-${this.rowId}`);
      if (destSelect) {
        console.log('Refreshing linker destination selector');
        this.populateDestinationSelect(destSelect, config);
      }
    } catch (error) {
      console.error('Failed to refresh linker row selectors:', error);
    }
  }

  populateLibraryMultiselect(multiselect, config) {
    // Clear existing selections and options
    multiselect.clearSelections();
    
    // Clear dropdown options
    const dropdown = multiselect.querySelector('.multiselect-dropdown');
    if (dropdown) {
      dropdown.innerHTML = '';
    }
    
    // Add library options
    Object.keys(config.Library || {}).forEach(key => {
      const library = config.Library[key];
      const value = JSON.stringify({
        path: library.path,
        node_path: library.libPath,
        linkPath: library.linkPath,
        libName: library.libName
      });
      
      multiselect.addOption(value, library.name, {
        path: library.path,
        node_path: library.libPath,
        linkPath: library.linkPath,
        libName: library.libName
      });
    });
  }

  populateDestinationSelect(select, config) {
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
            runCommand: app.runCommand,
            linkPath: app.linkPath
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
            path: library.path,
            linkPath: library.linkPath
          })
        }
      });
      select.appendChild(option);
    });
  }

  /**
   * Update linker status display
   */
  updateStatus(type, text) {
    const statusDiv = document.getElementById(`linker-status-${this.rowId}`);
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
   * Set completed status for link operations
   */
  setLinkCompleteStatus(isSuccess = true) {
    // Update status to completed with date
    const statusText = isSuccess ? 'Link Done' : 'Link Failed';
    const currentDate = new Date().toLocaleString();
    
    const statusType = isSuccess ? 'compiled' : 'error';
    this.updateStatus(statusType, `${statusText} - ${currentDate}`);
    
    // Re-enable link button
    const linkButton = document.getElementById(`link-button-${this.rowId}`);
    if (linkButton) {
      linkButton.classList.remove('btn--disabled');
    }
    
    // Stop individual timer
    this.stopIndividualTimer();
  }

  /**
   * Set completed status for unlink operations
   */
  setUnlinkCompleteStatus(isSuccess = true) {
    // Update status to completed with date
    const statusText = isSuccess ? 'Unlink Done' : 'Unlink Failed';
    const currentDate = new Date().toLocaleString();
    
    const statusType = isSuccess ? 'compiled' : 'error';
    this.updateStatus(statusType, `${statusText} - ${currentDate}`);
    
    // Re-enable unlink button
    const unlinkButton = document.getElementById(`unlink-button-${this.rowId}`);
    if (unlinkButton) {
      unlinkButton.classList.remove('btn--disabled');
    }
    
    // Stop individual timer
    this.stopIndividualTimer();
  }

  /**
   * Start individual timer for this linker row
   */
  startIndividualTimer() {
    this.currentOperationStart = Date.now();
    this.currentOperationTime = 0;
    
    // Show time display
    const timeDiv = document.getElementById(`linker-time-${this.rowId}`);
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
   * Stop individual timer for this linker row
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
    const timeDiv = document.getElementById(`linker-time-${this.rowId}`);
    if (timeDiv) {
      timeDiv.classList.add('u-hidden');
    }
  }

  /**
   * Update the individual time display
   */
  updateIndividualTimeDisplay() {
    const timeValueSpan = document.querySelector(`#linker-time-${this.rowId} .build-time__value`);
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
    
    // Cleanup multiselect event listeners
    const sourceMultiselect = document.getElementById(`linker-source-select-${this.rowId}`);
    if (sourceMultiselect && sourceMultiselect._cleanup) {
      sourceMultiselect._cleanup();
    }
    
    // Unregister from process manager
    this.processManager.unregisterLinkerRow(this.rowId);
    
    if (this.element) {
      DOMUtils.removeElement(this.element);
    }
    
    // Notify parent app about removal
    if (this.onRemove) {
      this.onRemove(this.rowId, 'linker');
    }
  }
}
