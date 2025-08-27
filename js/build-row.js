import { DOMUtils } from './dom-utils.js';
import { ConfigManager } from './config-manager.js';

/**
 * Build Row Component
 * Handles the creation and management of build rows
 */
export class BuildRow {
  constructor(container, processManager, rowId, onRemove = null) {
    this.container = container;
    this.processManager = processManager;
    this.rowId = rowId;
    this.element = null;
    this.onRemove = onRemove;
  }

  async create() {
    try {
      const config = await ConfigManager.getConfig();
      this.element = this.createRowElement(config);
      this.container.appendChild(this.element);
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

    actions.appendChild(buildButton);
    actions.appendChild(copyButton);
    actions.appendChild(watchButton);
    
    controls.appendChild(actions);
    controls.appendChild(closeButton);
    controls.appendChild(progressDiv);

    return controls;
  }

  handleBuildAndCopy() {
    const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
    const destSelect = document.getElementById(`dest-select-${this.rowId}`);
    
    if (!this.validateSelections(sourceSelect, destSelect)) return;

    const buildButton = document.getElementById(`build-button-${this.rowId}`);
    buildButton.classList.add('btn--disabled');
    buildButton.blur(); // Remove focus from the button

    this.processManager.buildAndCopy(
      sourceSelect.value,
      destSelect.value,
      `progress-${this.rowId}`
    );
  }

  handleCopy() {
    const sourceSelect = document.getElementById(`source-select-${this.rowId}`);
    const destSelect = document.getElementById(`dest-select-${this.rowId}`);
    
    if (!this.validateSelections(sourceSelect, destSelect)) return;

    const copyButton = document.getElementById(`copy-button-${this.rowId}`);
    copyButton.classList.add('btn--disabled');
    copyButton.blur(); // Remove focus from the button

    this.processManager.copy(
      sourceSelect.value,
      destSelect.value,
      `progress-${this.rowId}`
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

  handleClose() {
    this.remove();
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

  remove() {
    if (this.element) {
      DOMUtils.removeElement(this.element);
    }
    
    // Notify parent app about removal
    if (this.onRemove) {
      this.onRemove(this.rowId, 'build');
    }
  }
}
