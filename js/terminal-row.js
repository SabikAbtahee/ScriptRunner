import { DOMUtils } from './dom-utils.js';

/**
 * TerminalRow Class
 * Creates and manages a terminal row with xterm.js integration
 */
export class TerminalRow {
  constructor(container, processManager, timeTracker, rowId, onRemove) {
    this.container = container;
    this.processManager = processManager;
    this.timeTracker = timeTracker;
    this.rowId = rowId;
    this.onRemove = onRemove;
    this.element = null;
    this.terminal = null;
    this.fitAddon = null;
    this.ptyProcess = null;
    this.isDestroyed = false;
  }

  async create() {
    try {
      // Create the main row element
      this.element = DOMUtils.createElement('div', {
        className: 'terminal-row u-fade-in',
        attributes: {
          'data-row-id': this.rowId,
          'data-row-type': 'terminal'
        }
      });

      // Create the terminal header (close button)
      const header = this.createHeader();
      this.element.appendChild(header);

      // Create the terminal container
      const terminalContainer = DOMUtils.createElement('div', {
        className: 'terminal-container',
        attributes: {
          id: `terminal-${this.rowId}`
        }
      });
      this.element.appendChild(terminalContainer);

      // Add to container
      this.container.appendChild(this.element);

      // Initialize the terminal
      await this.initializeTerminal(terminalContainer);

      console.log(`Terminal row ${this.rowId} created successfully`);
    } catch (error) {
      console.error('Failed to create terminal row:', error);
      throw error;
    }
  }

  createHeader() {
    const header = DOMUtils.createElement('div', {
      className: 'terminal-header'
    });

    // Close button (top left)
    const closeButton = DOMUtils.createElement('button', {
      className: 'terminal-close-btn',
      title: 'Close Terminal',
      innerHTML: `
        <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14">
          <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
        </svg>
      `
    });

    // Add event listener
    DOMUtils.addSafeEventListener(closeButton, 'click', () => {
      this.destroy();
    });

    header.appendChild(closeButton);

    return header;
  }

  async waitForXterm() {
    // Wait for xterm.js to be loaded
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (attempts < maxAttempts) {
      if (typeof window.Terminal !== 'undefined' && typeof window.FitAddon !== 'undefined') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('xterm.js libraries failed to load');
  }

  async initializeTerminal(container) {
    try {
      // Wait for xterm to be available
      await this.waitForXterm();

      // Create terminal instance
      this.terminal = new window.Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
        theme: {
          background: '#1a1a1a',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: '#3e4451',
          black: '#000000',
          red: '#e06c75',
          green: '#98c379',
          yellow: '#e5c07b',
          blue: '#61afef',
          magenta: '#c678dd',
          cyan: '#56b6c2',
          white: '#ffffff',
          brightBlack: '#4b5263',
          brightRed: '#e06c75',
          brightGreen: '#98c379',
          brightYellow: '#e5c07b',
          brightBlue: '#61afef',
          brightMagenta: '#c678dd',
          brightCyan: '#56b6c2',
          brightWhite: '#ffffff'
        },
        allowTransparency: true,
        scrollback: 1000,
        rows: 30,
        cols: 120
      });

      // Create fit addon
      this.fitAddon = new window.FitAddon.FitAddon();
      this.terminal.loadAddon(this.fitAddon);

      // Open terminal in container
      this.terminal.open(container);

      // Fit terminal to container
      setTimeout(() => {
        this.fitAddon.fit();
        // Ensure terminal fills the container properly
        this.terminal.refresh(0, this.terminal.rows - 1);
      }, 100);

      // Handle window resize
      const resizeHandler = () => {
        if (this.fitAddon && !this.isDestroyed) {
          setTimeout(() => {
            this.fitAddon.fit();
            this.terminal.refresh(0, this.terminal.rows - 1);
          }, 100);
        }
      };
      window.addEventListener('resize', resizeHandler);

      // Store resize handler for cleanup
      this.resizeHandler = resizeHandler;

      // Create PTY process
      await this.createPtyProcess();

      console.log(`Terminal ${this.rowId} initialized successfully`);
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      // Show error in container
      container.className = 'terminal-container error';
      container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p style="color: #e06c75; margin-bottom: 10px;">Failed to initialize terminal</p>
          <p style="color: #abb2bf; font-size: 14px;">${error.message}</p>
          <p style="color: #abb2bf; font-size: 12px; margin-top: 10px;">
            Please check the console for more details or try refreshing the application.
          </p>
        </div>
      `;
      throw error;
    }
  }

  async createPtyProcess() {
    try {
      // Check if API is available
      if (!window.API || !window.API.create_terminal) {
        throw new Error('Terminal API not available');
      }

      // Create PTY process through IPC
      const result = await window.API.create_terminal({
        terminalId: this.rowId,
        cols: this.terminal.cols,
        rows: this.terminal.rows
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create terminal process');
      }

      this.ptyProcess = result.pid;

      // Set up data handlers
      this.setupTerminalHandlers();

      console.log(`PTY process created for terminal ${this.rowId}, PID: ${this.ptyProcess}`);
    } catch (error) {
      console.error('Failed to create PTY process:', error);
      this.terminal.write('\r\n\x1b[31mFailed to create terminal process: ' + error.message + '\x1b[0m\r\n');
    }
  }

  setupTerminalHandlers() {
    try {
      // Handle terminal input (user typing)
      this.terminal.onData((data) => {
        // Check for Ctrl+L (clear terminal shortcut)
        if (data === '\f') { // Ctrl+L sends form feed character
          this.clearTerminal();
          return;
        }
        
        if (this.ptyProcess && !this.isDestroyed && window.API && window.API.write_to_terminal) {
          window.API.write_to_terminal({
            terminalId: this.rowId,
            data: data
          }).catch(error => {
            console.error('Failed to write to terminal:', error);
          });
        }
      });

      // Handle terminal resize
      this.terminal.onResize((size) => {
        if (this.ptyProcess && !this.isDestroyed && window.API && window.API.resize_terminal) {
          window.API.resize_terminal({
            terminalId: this.rowId,
            cols: size.cols,
            rows: size.rows
          }).catch(error => {
            console.error('Failed to resize terminal:', error);
          });
        }
      });

      // Listen for terminal output from main process
      if (window.API && window.API.on_terminal_data) {
        this.terminalDataCleanup = window.API.on_terminal_data((data) => {
          if (data.terminalId === this.rowId && this.terminal && !this.isDestroyed) {
            this.terminal.write(data.data);
          }
        });
      }

      // Listen for terminal exit
      if (window.API && window.API.on_terminal_exit) {
        this.terminalExitCleanup = window.API.on_terminal_exit((data) => {
          if (data.terminalId === this.rowId && !this.isDestroyed) {
            this.terminal.write(`\r\n\x1b[33mTerminal process exited with code: ${data.exitCode}\x1b[0m\r\n`);
            this.ptyProcess = null;
          }
        });
      }
    } catch (error) {
      console.error('Failed to setup terminal handlers:', error);
    }
  }

  clearTerminal() {
    if (this.terminal && !this.isDestroyed) {
      this.terminal.clear();
    }
  }

  async destroy() {
    try {
      this.isDestroyed = true;

      // Clean up event listeners
      if (this.terminalDataCleanup) {
        this.terminalDataCleanup();
        this.terminalDataCleanup = null;
      }

      if (this.terminalExitCleanup) {
        this.terminalExitCleanup();
        this.terminalExitCleanup = null;
      }

      // Clean up PTY process
      if (this.ptyProcess && window.API && window.API.kill_terminal) {
        try {
          await window.API.kill_terminal({
            terminalId: this.rowId
          });
        } catch (error) {
          console.error('Failed to kill terminal process:', error);
        }
        this.ptyProcess = null;
      }

      // Clean up terminal
      if (this.terminal) {
        this.terminal.dispose();
        this.terminal = null;
      }

      // Clean up fit addon
      if (this.fitAddon) {
        this.fitAddon.dispose();
        this.fitAddon = null;
      }

      // Remove resize handler
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
        this.resizeHandler = null;
      }

      // Remove from DOM
      if (this.element && this.element.parentNode) {
        DOMUtils.removeElement(this.element);
      }

      // Notify parent about removal
      if (this.onRemove) {
        this.onRemove(this.rowId, 'terminal');
      }

      console.log(`Terminal row ${this.rowId} destroyed successfully`);
    } catch (error) {
      console.error('Failed to destroy terminal row:', error);
    }
  }
}
