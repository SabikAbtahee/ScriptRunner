/**
 * DOM Utility functions
 * Common DOM manipulation helpers
 */
export class DOMUtils {
  /**
   * Create an element with optional attributes and content
   */
  static createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.id) {
      element.id = options.id;
    }
    
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    if (options.dataset) {
      Object.entries(options.dataset).forEach(([key, value]) => {
        element.dataset[key] = value;
      });
    }
    
    return element;
  }

  /**
   * Create a select element with options
   */
  static createSelect(options = {}) {
    const select = this.createElement('select', {
      className: 'form-select',
      ...options
    });
    
    if (options.placeholder) {
      const placeholderOption = this.createElement('option', {
        textContent: options.placeholder,
        attributes: { value: '', disabled: true, selected: true }
      });
      select.appendChild(placeholderOption);
    }
    
    return select;
  }

  /**
   * Create a button with icon and text
   */
  static createButton(text, options = {}) {
    const button = this.createElement('button', {
      className: `btn ${options.variant || 'btn--primary'}`,
      ...options
    });
    
    if (options.icon) {
      button.innerHTML = `${options.icon}<span>${text}</span>`;
      button.classList.add('btn--with-icon');
    } else {
      button.textContent = text;
    }
    
    return button;
  }

  /**
   * Create an SVG icon
   */
  static createIcon(pathData, size = 24) {
    return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 -960 960 960" width="${size}">
      <path d="${pathData}"/>
    </svg>`;
  }

  /**
   * Get predefined icons for common button types
   */
  static getButtonIcon(buttonType, size = 20) {
    const icons = {
      'build': 'M240-120q-50 0-85-35t-35-85v-480q0-50 35-85t85-35h240q50 0 85 35t35 85v40q0 17-11.5 28.5T560-240q-17 0-28.5-11.5T520-280v-40H240v480h280v-40q0-17 11.5-28.5T560-120q17 0 28.5 11.5T600-80v40q0 50-35 85t-85 35H240Zm440-280v-120q0-17 11.5-28.5T720-560q17 0 28.5 11.5T760-520v120h120q17 0 28.5 11.5T920-360q0 17-11.5 28.5T880-320H760v120q0 17-11.5 28.5T720-168q-17 0-28.5-11.5T680-208v-120H560q-17 0-28.5-11.5T520-368q0-17 11.5-28.5T560-408h120Z', // build icon
      'copy': 'M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560q0-17 11.5-28.5T160-760q17 0 28.5 11.5T200-720v560h560q17 0 28.5 11.5T772-120q0 17-11.5 28.5T744-80H200Zm160-240v-480 480Z', // copy icon
      'watch': 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm40-320v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 8 3 15.5t9 13.5l132 132q11 11 28 11t28-11q11-11 11-28t-11-28L520-480Z', // watch icon
      'run': 'M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z', // play/run icon
      'restart': 'M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Z', // restart icon
      'install': 'M480-320q-75 0-127.5-52.5T300-500q0-75 52.5-127.5T480-680q75 0 127.5 52.5T660-500q0 75-52.5 127.5T480-320Zm-40-480v-120q0-17 11.5-28.5T480-960q17 0 28.5 11.5T520-920v120h120q17 0 28.5 11.5T680-760q0 17-11.5 28.5T640-720H520v120q0 17-11.5 28.5T480-560q-17 0-28.5-11.5T440-600v-120H320q-17 0-28.5-11.5T280-760q0-17 11.5-28.5T320-800h120ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80H240Zm0-80h480v-640H240v640Z', // install icon
      'link': 'M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z', // link icon
      'unlink': 'M200-280q-17 0-28.5-11.5T160-320q0-17 11.5-28.5T200-360h160q17 0 28.5 11.5T400-320q0 17-11.5 28.5T360-280H200Zm400 0q-17 0-28.5-11.5T560-320q0-17 11.5-28.5T600-360h160q17 0 28.5 11.5T800-320q0 17-11.5 28.5T760-280H600ZM280-600q-83 0-141.5 58.5T80-400q0 83 58.5 141.5T280-200h160v80H280q-117 0-198.5-81.5T0-400q0-117 81.5-198.5T280-680h160v80H280Zm400 0H520v-80h160q117 0 198.5 81.5T960-400q0 117-81.5 198.5T680-120H520v-80h160q83 0 141.5-58.5T880-400q0-83-58.5-141.5T680-600Z', // unlink icon
      'edit': 'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z', // edit icon
      'save': 'M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160Zm-80 34L646-760H200v560h560v-446ZM480-240q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM240-560h360v-160H240v160Zm-40-86v446-560 114Z' // save icon
    };
    
    return this.createIcon(icons[buttonType] || '', size);
  }

  /**
   * Show/hide elements with animation
   */
  static toggleElement(element, show = true) {
    if (show) {
      element.classList.remove('u-hidden');
      element.classList.add('u-fade-in');
    } else {
      element.classList.add('u-hidden');
      element.classList.remove('u-fade-in');
    }
  }

  /**
   * Safely remove an element
   */
  static removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Create a multiselect dropdown
   */
  static createMultiSelect(options = {}) {
    const container = this.createElement('div', {
      className: 'multiselect-container',
      id: options.id
    });

    // Create the display area that shows selected items
    const display = this.createElement('div', {
      className: 'multiselect-display',
      textContent: options.placeholder || 'Select libraries...'
    });

    // Create the dropdown list (initially hidden)
    const dropdown = this.createElement('div', {
      className: 'multiselect-dropdown u-hidden'
    });

    // Track selected values
    const selectedValues = new Set();
    const selectedItems = new Map(); // value -> {name, data}

    // Update display text based on selections
    const updateDisplay = () => {
      if (selectedValues.size === 0) {
        display.textContent = options.placeholder || 'Select libraries...';
        display.classList.remove('has-selections');
      } else {
        const names = Array.from(selectedItems.values()).map(item => item.name);
        display.textContent = names.join(', ');
        display.classList.add('has-selections');
      }
    };

    // Toggle dropdown visibility
    const toggleDropdown = () => {
      dropdown.classList.toggle('u-hidden');
    };

    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
      if (!container.contains(e.target)) {
        dropdown.classList.add('u-hidden');
      }
    };

    // Add click listener to display
    this.addSafeEventListener(display, 'click', toggleDropdown);

    // Add global click listener to close dropdown
    document.addEventListener('click', closeDropdown);

    // Store cleanup function
    container._cleanup = () => {
      document.removeEventListener('click', closeDropdown);
    };

    // Add methods to the container
    container.addOption = (value, text, data = null) => {
      const option = this.createElement('div', {
        className: 'multiselect-option',
        innerHTML: `
          <input type="checkbox" class="multiselect-checkbox" value="${value}">
          <span class="multiselect-label">${text}</span>
        `
      });

      const checkbox = option.querySelector('.multiselect-checkbox');
      
      this.addSafeEventListener(checkbox, 'change', (e) => {
        e.stopPropagation();
        
        if (checkbox.checked) {
          selectedValues.add(value);
          selectedItems.set(value, { name: text, data: data });
        } else {
          selectedValues.delete(value);
          selectedItems.delete(value);
        }
        
        updateDisplay();
        
        // Trigger custom change event
        const changeEvent = new CustomEvent('multiselect-change', {
          detail: {
            selectedValues: Array.from(selectedValues),
            selectedItems: Array.from(selectedItems.entries()).map(([value, item]) => ({
              value,
              name: item.name,
              data: item.data
            }))
          }
        });
        container.dispatchEvent(changeEvent);
      });

      dropdown.appendChild(option);
    };

    container.getSelectedValues = () => Array.from(selectedValues);
    container.getSelectedItems = () => Array.from(selectedItems.entries()).map(([value, item]) => ({
      value,
      name: item.name,
      data: item.data
    }));

    container.clearSelections = () => {
      selectedValues.clear();
      selectedItems.clear();
      dropdown.querySelectorAll('.multiselect-checkbox').forEach(cb => cb.checked = false);
      updateDisplay();
    };

    container.appendChild(display);
    container.appendChild(dropdown);

    return container;
  }

  /**
   * Add event listener with error handling
   */
  static addSafeEventListener(element, event, handler) {
    if (!element) {
      console.error(`Cannot add ${event} listener: element is null or undefined`);
      return;
    }
    
    element.addEventListener(event, (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }
}
