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
      textContent: text,
      className: `btn ${options.variant || 'btn--primary'}`,
      ...options
    });
    
    if (options.icon) {
      button.innerHTML = `${options.icon} ${text}`;
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
   * Add event listener with error handling
   */
  static addSafeEventListener(element, event, handler) {
    element.addEventListener(event, (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }
}
