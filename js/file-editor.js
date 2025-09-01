import { DOMUtils } from './dom-utils.js';

/**
 * File Editor Component
 * Provides a modal editor for TypeScript files
 */
export class FileEditor {
  constructor() {
    this.modal = null;
    this.editor = null;
    this.currentFilePath = null;
    this.originalContent = null;
    this.isModified = false;
  }

  /**
   * Open a file in the editor
   * @param {string} filePath - Path to the file to edit
   * @param {string} fileName - Display name for the file
   */
  async openFile(filePath, fileName = null) {
    try {
      console.log('Opening file:', filePath);
      console.log('window.API available:', !!window.API);
      console.log('window.API.read_file available:', !!window.API?.read_file);
      
      // Check if API is available
      if (!window.API || !window.API.read_file) {
        throw new Error('File API is not available. Make sure the application is properly loaded.');
      }
      
      // Read file content
      const result = await window.API.read_file(filePath);
      console.log('File read result:', result);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.currentFilePath = filePath;
      this.originalContent = result.content;
      this.isModified = false;

      // Create and show modal
      this.createModal(fileName || this.getFileName(filePath), result.content);
      this.showModal();
      
    } catch (error) {
      console.error('Failed to open file:', error);
      this.showError(`Failed to open file: ${error.message}`);
    }
  }

  /**
   * Create the editor modal
   */
  createModal(fileName, content) {
    // Remove existing modal if any
    this.destroyModal();

    this.modal = DOMUtils.createElement('div', {
      className: 'file-editor-modal u-hidden',
      id: 'file-editor-modal'
    });

    const overlay = DOMUtils.createElement('div', {
      className: 'file-editor-modal__overlay'
    });

    const dialog = DOMUtils.createElement('div', {
      className: 'file-editor-modal__dialog'
    });

    // Header
    const header = this.createHeader(fileName);
    dialog.appendChild(header);

    // Editor container
    const editorContainer = DOMUtils.createElement('div', {
      className: 'file-editor-modal__editor-container'
    });

    this.editor = DOMUtils.createElement('textarea', {
      className: 'file-editor-modal__editor',
      id: 'file-editor-textarea',
      attributes: {
        spellcheck: 'false',
        'data-language': 'typescript'
      }
    });

    this.editor.value = content;
    editorContainer.appendChild(this.editor);

    // Footer with buttons
    const footer = this.createFooter();
    dialog.appendChild(editorContainer);
    dialog.appendChild(footer);

    this.modal.appendChild(overlay);
    this.modal.appendChild(dialog);

    // Add to DOM first
    document.body.appendChild(this.modal);

    // Setup event listeners after adding to DOM with a small delay
    setTimeout(() => {
      this.setupEventListeners();
    }, 10);
  }

  /**
   * Create modal header
   */
  createHeader(fileName) {
    const header = DOMUtils.createElement('div', {
      className: 'file-editor-modal__header'
    });

    const title = DOMUtils.createElement('h3', {
      className: 'file-editor-modal__title',
      textContent: `Edit: ${fileName}`
    });

    const modifiedIndicator = DOMUtils.createElement('span', {
      className: 'file-editor-modal__modified u-hidden',
      id: 'file-editor-modified',
      textContent: '●'
    });

    const closeButton = DOMUtils.createElement('button', {
      className: 'btn btn--icon btn--small file-editor-modal__close',
      id: 'file-editor-close',
      innerHTML: DOMUtils.createIcon('m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'),
      attributes: { title: 'Close editor' }
    });

    header.appendChild(title);
    header.appendChild(modifiedIndicator);
    header.appendChild(closeButton);

    return header;
  }

  /**
   * Create modal footer
   */
  createFooter() {
    const footer = DOMUtils.createElement('div', {
      className: 'file-editor-modal__footer'
    });

    const leftActions = DOMUtils.createElement('div', {
      className: 'file-editor-modal__actions-left'
    });

    const rightActions = DOMUtils.createElement('div', {
      className: 'file-editor-modal__actions-right'
    });

    // File info
    const fileInfo = DOMUtils.createElement('span', {
      className: 'file-editor-modal__file-info',
      textContent: 'TypeScript'
    });

    // Buttons
    const cancelButton = DOMUtils.createButton('Cancel', {
      id: 'file-editor-cancel',
      variant: 'btn--secondary'
    });

    const saveButton = DOMUtils.createButton('Save', {
      id: 'file-editor-save',
      variant: 'btn--success',
      icon: DOMUtils.getButtonIcon('save')
    });

    leftActions.appendChild(fileInfo);
    rightActions.appendChild(cancelButton);
    rightActions.appendChild(saveButton);

    footer.appendChild(leftActions);
    footer.appendChild(rightActions);

    return footer;
  }

  /**
   * Setup event listeners for the modal
   */
  setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Close button
    const closeButton = document.getElementById('file-editor-close');
    console.log('Close button found:', !!closeButton);
    DOMUtils.addSafeEventListener(closeButton, 'click', () => {
      console.log('Close button clicked');
      this.handleClose();
    });

    // Cancel button
    const cancelButton = document.getElementById('file-editor-cancel');
    console.log('Cancel button found:', !!cancelButton);
    DOMUtils.addSafeEventListener(cancelButton, 'click', () => {
      console.log('Cancel button clicked');
      this.handleClose();
    });

    // Save button
    const saveButton = document.getElementById('file-editor-save');
    console.log('Save button found:', !!saveButton);
    DOMUtils.addSafeEventListener(saveButton, 'click', () => {
      console.log('Save button clicked');
      this.handleSave();
    });

    // Editor content change
    DOMUtils.addSafeEventListener(this.editor, 'input', () => this.handleContentChange());

    // Keyboard shortcuts
    DOMUtils.addSafeEventListener(this.editor, 'keydown', (e) => this.handleKeydown(e));

    // Overlay click to close
    const overlay = this.modal?.querySelector('.file-editor-modal__overlay');
    console.log('Overlay found:', !!overlay);
    DOMUtils.addSafeEventListener(overlay, 'click', () => {
      console.log('Overlay clicked');
      this.handleClose();
    });

    // Prevent dialog click from closing
    const dialog = this.modal?.querySelector('.file-editor-modal__dialog');
    console.log('Dialog found:', !!dialog);
    DOMUtils.addSafeEventListener(dialog, 'click', (e) => {
      console.log('Dialog clicked');
      e.stopPropagation();
    });

    // ESC key to close
    DOMUtils.addSafeEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('u-hidden')) {
        console.log('ESC key pressed');
        this.handleClose();
      }
    });
  }

  /**
   * Handle content changes in the editor
   */
  handleContentChange() {
    const currentContent = this.editor.value;
    this.isModified = currentContent !== this.originalContent;
    
    const modifiedIndicator = document.getElementById('file-editor-modified');
    if (modifiedIndicator) {
      if (this.isModified) {
        modifiedIndicator.classList.remove('u-hidden');
      } else {
        modifiedIndicator.classList.add('u-hidden');
      }
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeydown(e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.handleSave();
    }
    
    // Ctrl/Cmd + / to toggle comments
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      this.toggleComment();
    }
    
    // Tab key handling for better code editing
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.editor.selectionStart;
      const end = this.editor.selectionEnd;
      
      // Insert tab character
      this.editor.value = this.editor.value.substring(0, start) + '  ' + this.editor.value.substring(end);
      this.editor.selectionStart = this.editor.selectionEnd = start + 2;
      
      // Trigger change event
      this.handleContentChange();
    }
  }

  /**
   * Toggle TypeScript comments on selected lines
   */
  toggleComment() {
    const textarea = this.editor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // Find the start and end of the lines that contain the selection
    let lineStart = start;
    let lineEnd = end;
    
    // Find the beginning of the first line
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Find the end of the last line
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    // Get the selected lines
    const selectedText = text.substring(lineStart, lineEnd);
    const lines = selectedText.split('\n');
    
    // Check if all non-empty lines are commented
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const allCommented = nonEmptyLines.length > 0 && nonEmptyLines.every(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//');
    });
    
    // Toggle comments
    const newLines = lines.map(line => {
      if (line.trim().length === 0) {
        // Keep empty lines as they are
        return line;
      }
      
      if (allCommented) {
        // Uncomment: remove // from the beginning
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) {
          // Find the position of // in the original line
          const commentIndex = line.indexOf('//');
          // Remove // and the space after it if present
          let uncommented = line.substring(0, commentIndex) + line.substring(commentIndex + 2);
          if (uncommented[commentIndex] === ' ') {
            uncommented = uncommented.substring(0, commentIndex) + uncommented.substring(commentIndex + 1);
          }
          return uncommented;
        }
        return line;
      } else {
        // Comment: add // at the beginning of the line content
        const leadingWhitespace = line.match(/^\s*/)[0];
        const content = line.substring(leadingWhitespace.length);
        if (content.length > 0) {
          return leadingWhitespace + '// ' + content;
        }
        return line;
      }
    });
    
    // Replace the selected text
    const newText = newLines.join('\n');
    const beforeSelection = text.substring(0, lineStart);
    const afterSelection = text.substring(lineEnd);
    
    // Calculate the offset for cursor position
    const lengthDiff = newText.length - selectedText.length;
    
    // Update the textarea
    textarea.value = beforeSelection + newText + afterSelection;
    
    // Restore selection, adjusting for the length change
    if (start === end) {
      // Single cursor position
      const newCursorPos = Math.min(start + lengthDiff, textarea.value.length);
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    } else {
      // Selection range
      textarea.selectionStart = lineStart;
      textarea.selectionEnd = lineStart + newText.length;
    }
    
    // Trigger change event
    this.handleContentChange();
    
    // Focus back to the editor
    textarea.focus();
  }

  /**
   * Handle save operation
   */
  async handleSave() {
    if (!this.currentFilePath) {
      return;
    }

    try {
      console.log('Saving file:', this.currentFilePath);
      console.log('window.API.write_file available:', !!window.API?.write_file);
      
      // Check if API is available
      if (!window.API || !window.API.write_file) {
        throw new Error('File API is not available. Make sure the application is properly loaded.');
      }
      
      const saveButton = document.getElementById('file-editor-save');
      const originalText = saveButton.textContent;
      
      // Show saving state
      saveButton.textContent = 'Saving...';
      saveButton.classList.add('btn--disabled');

      const content = this.editor.value;
      const result = await window.API.write_file(this.currentFilePath, content);
      console.log('File write result:', result);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update original content and reset modified state
      this.originalContent = content;
      this.isModified = false;
      this.handleContentChange(); // Update UI

      this.showSuccess('File saved successfully!');
      
      // Reset button state
      saveButton.textContent = originalText;
      saveButton.classList.remove('btn--disabled');

    } catch (error) {
      console.error('Failed to save file:', error);
      this.showError(`Failed to save file: ${error.message}`);
      
      // Reset button state
      const saveButton = document.getElementById('file-editor-save');
      saveButton.textContent = 'Save';
      saveButton.classList.remove('btn--disabled');
    }
  }

  /**
   * Handle close operation
   */
  handleClose() {
    console.log('handleClose called, isModified:', this.isModified);
    if (this.isModified) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) {
        console.log('Close cancelled by user');
        return;
      }
    }

    console.log('Closing modal');
    this.hideModal();
  }

  /**
   * Show the modal
   */
  showModal() {
    if (this.modal) {
      console.log('Showing modal');
      this.modal.classList.remove('u-hidden');
      this.modal.style.display = 'flex'; // Ensure it's visible
      // Focus the editor
      setTimeout(() => {
        if (this.editor) {
          this.editor.focus();
          console.log('Editor focused');
        }
      }, 100);
    } else {
      console.error('Modal not found when trying to show');
    }
  }

  /**
   * Hide the modal
   */
  hideModal() {
    if (this.modal) {
      console.log('Hiding modal');
      this.modal.classList.add('u-hidden');
      this.modal.style.display = 'none'; // Ensure it's hidden
      setTimeout(() => {
        this.destroyModal();
      }, 300); // Wait for animation
    }
  }

  /**
   * Destroy the modal
   */
  destroyModal() {
    if (this.modal) {
      DOMUtils.removeElement(this.modal);
      this.modal = null;
      this.editor = null;
      this.currentFilePath = null;
      this.originalContent = null;
      this.isModified = false;
    }
  }

  /**
   * Get filename from path
   */
  getFileName(filePath) {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * Show error message
   */
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
          z-index: 2000;
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

  /**
   * Show success message
   */
  showSuccess(message) {
    // Create a temporary success notification
    const successDiv = DOMUtils.createElement('div', {
      className: 'success-notification',
      textContent: message,
      attributes: {
        style: `
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: var(--success-color);
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          z-index: 2000;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        `
      }
    });

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      DOMUtils.removeElement(successDiv);
    }, 3000);
  }
}
