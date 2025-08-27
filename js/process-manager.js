/**
 * Process Manager
 * Handles all process-related operations (build, copy, run, etc.)
 */
export class ProcessManager {
  constructor() {
    this.appRows = new Map(); // Track app row instances
    this.setupEventListeners();
  }

  // Register an app row instance
  registerAppRow(rowCounter, appRowInstance) {
    this.appRows.set(rowCounter, appRowInstance);
  }

  // Unregister an app row instance
  unregisterAppRow(rowCounter) {
    this.appRows.delete(rowCounter);
  }

  setupEventListeners() {
    // Build output listener
    window.API.build_output((data, progress, isDone) => {
      this.handleBuildOutput(data, progress, isDone);
    });

    // Copy output listener
    window.API.copy_output((data, progress, isDone) => {
      this.handleCopyOutput(data, progress, isDone);
    });

    // Watch output listener
    window.API.watch_output((data, progress, rowCounter, pid) => {
      this.handleWatchOutput(data, progress, rowCounter, pid);
    });

    // App output listener
    window.API.app_output((data, progress, rowCounter, pid) => {
      this.handleAppOutput(data, progress, rowCounter, pid);
    });
  }

  async buildAndCopy(source, destination, progressId) {
    try {
      await window.API.build_copy({ source, destination, progress: progressId });
    } catch (error) {
      console.error('Build and copy failed:', error);
      this.showError(progressId, 'Build and copy failed');
    }
  }

  async copy(source, destination, progressId) {
    try {
      await window.API.copy({ source, destination, progress: progressId });
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError(progressId, 'Copy failed');
    }
  }

  async watch(source, destination, progressId, rowCounter) {
    try {
      await window.API.watch({ source, destination, progress: progressId, rowCounter });
    } catch (error) {
      console.error('Watch failed:', error);
      this.showError(progressId, 'Watch failed');
    }
  }

  async runApp(appPath, progressId, rowCounter) {
    try {
      const progressElement = document.getElementById(progressId);
      if (progressElement) {
        this.resetTerminal(progressElement);
      }
      await window.API.run_app({ path: appPath, progress: progressId, rowCounter });
    } catch (error) {
      console.error('App run failed:', error);
      this.showError(progressId, 'Failed to run application');
    }
  }

  async restartApp(appPath, progressId, rowCounter) {
    try {
      const progressElement = document.getElementById(progressId);
      if (progressElement) {
        this.resetTerminal(progressElement);
      }
      await window.API.restart_app({ path: appPath, progress: progressId, rowCounter });
    } catch (error) {
      console.error('App restart failed:', error);
      this.showError(progressId, 'Failed to restart application');
    }
  }

  async killProcess(pid) {
    try {
      await window.API.kill({ command: parseInt(pid) });
    } catch (error) {
      console.error('Failed to kill process:', error);
    }
  }

  resetTerminal(element) {
    element.className = 'terminal';
    element.innerText = '';
  }

  showError(progressId, message) {
    const element = document.getElementById(progressId);
    if (element) {
      element.className = 'terminal terminal--error';
      element.innerText = `ERROR: ${message}`;
    }
  }

  handleBuildOutput(data, progress, isDone) {
    if (!isDone) {
      const element = document.getElementById(`build-${progress}`);
      if (element) {
        element.classList.remove('u-hidden');
        element.innerText += data + '\n';
        element.scrollTop = element.scrollHeight;
      }
    } else {
      const element = document.getElementById(progress);
      if (element) {
        element.classList.remove('u-hidden');
        const now = new Date();
        element.innerText = `Build Done: ${now.toLocaleTimeString()}\n`;
      }
      
      // Re-enable build button - extract row ID from progress ID
      const rowId = progress.replace('progress-', '');
      const buildButton = document.getElementById(`build-button-${rowId}`);
      if (buildButton) buildButton.classList.remove('btn--disabled');
    }
  }

  handleCopyOutput(data, progress, isDone) {
    if (!isDone) {
      const element = document.getElementById(`build-${progress}`);
      if (element) {
        element.classList.remove('u-hidden');
        element.innerText += data + '\n';
        element.scrollTop = element.scrollHeight;
      }
    } else {
      const element = document.getElementById(progress);
      if (element) {
        element.classList.remove('u-hidden');
        const now = new Date();
        element.innerText += `Copied: ${now.toLocaleTimeString()}\n`;
      }
      
      // Re-enable buttons - extract row ID from progress ID
      const rowId = progress.replace('progress-', '');
      const buildButton = document.getElementById(`build-button-${rowId}`);
      const copyButton = document.getElementById(`copy-button-${rowId}`);
      if (buildButton) buildButton.classList.remove('btn--disabled');
      if (copyButton) copyButton.classList.remove('btn--disabled');
    }
  }

  handleWatchOutput(data, progress, rowCounter, pid) {
    const element = document.getElementById(`build-${progress}`);
    if (element) {
      element.classList.remove('u-hidden');
      element.innerText += data + '\n';
      element.scrollTop = element.scrollHeight;
    }

    // Update close button to kill process
    const closeButton = document.getElementById(`close-button-${rowCounter}`);
    if (closeButton) {
      closeButton.dataset.pid = pid;
    }
  }

  handleAppOutput(data, progress, rowCounter, pid) {
    const element = document.getElementById(progress);
    if (element) {
      element.classList.remove('u-hidden');
      element.innerText += data + '\n';
      element.scrollTop = element.scrollHeight;

      // Update terminal styling and status based on output
      if (this.isCompilationSuccessful(data)) {
        element.className = 'terminal terminal--success';
        
        // Update app row status to compiled
        const appRowInstance = this.appRows.get(rowCounter);
        if (appRowInstance) {
          appRowInstance.setCompiledStatus();
        }
      } else if (data.includes('ERROR') || data.includes('error') || data.includes('Error')) {
        element.className = 'terminal terminal--error';
      }
    }

    // Update close button with PID
    const closeButton = document.getElementById(`app-close-button-${rowCounter}`);
    if (closeButton) {
      closeButton.dataset.pid = pid;
    }
  }

  // Check if the output indicates successful compilation
  isCompilationSuccessful(data) {
    const successPatterns = [
      '✔ Compiled successfully.',
      'Compiled successfully',
      'webpack compiled successfully',
      'Build completed successfully',
      'Compilation complete',
      '✓ Compiled'
    ];
    
    return successPatterns.some(pattern => 
      data.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
