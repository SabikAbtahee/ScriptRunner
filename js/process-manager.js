/**
 * Process Manager
 * Handles all process-related operations (build, copy, run, etc.)
 */
export class ProcessManager {
  constructor(timeTracker = null) {
    this.timeTracker = timeTracker;
    this.appRows = new Map(); // Track app row instances
    this.operationTimers = new Map(); // Track operation timers by progressId
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

  async buildAndCopy(source, destination, progressId, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }
      
      await window.API.build_copy({ source, destination, progress: progressId });
    } catch (error) {
      console.error('Build and copy failed:', error);
      this.showError(progressId, 'Build and copy failed');
      
      // Stop timer on error
      this.stopTimerForOperation(progressId);
    }
  }

  async copy(source, destination, progressId, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }
      
      await window.API.copy({ source, destination, progress: progressId });
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError(progressId, 'Copy failed');
      
      // Stop timer on error
      this.stopTimerForOperation(progressId);
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

  async runApp(appPath, progressId, rowCounter, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }
      
      const progressElement = document.getElementById(progressId);
      if (progressElement) {
        this.resetTerminal(progressElement);
      }
      await window.API.run_app({ path: appPath, progress: progressId, rowCounter });
    } catch (error) {
      console.error('App run failed:', error);
      this.showError(progressId, 'Failed to run application');
      
      // Stop timer on error
      this.stopTimerForOperation(progressId);
    }
  }

  async restartApp(appPath, progressId, rowCounter, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }
      
      const progressElement = document.getElementById(progressId);
      if (progressElement) {
        this.resetTerminal(progressElement);
      }
      await window.API.restart_app({ path: appPath, progress: progressId, rowCounter });
    } catch (error) {
      console.error('App restart failed:', error);
      this.showError(progressId, 'Failed to restart application');
      
      // Stop timer on error
      this.stopTimerForOperation(progressId);
    }
  }

  async killProcess(pid) {
    try {
      await window.API.kill({ command: parseInt(pid) });
    } catch (error) {
      console.error('Failed to kill process:', error);
    }
  }

  /**
   * Stop timer for an operation and clean up
   */
  stopTimerForOperation(progressId) {
    const operationId = this.operationTimers.get(progressId);
    if (operationId && this.timeTracker) {
      this.timeTracker.stopTimer(operationId);
      this.operationTimers.delete(progressId);
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
      
      // Stop timer for this operation
      this.stopTimerForOperation(progress);
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
      
      // Stop timer for this operation
      this.stopTimerForOperation(progress);
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
      
      // Check if this is a warning and if "Compiled successfully" already exists
      if (this.isWarningOutput(data) && this.hasCompiledSuccessfully(element)) {
        // Remove the "Compiled successfully" message temporarily
        const successMessage = this.extractAndRemoveSuccessMessage(element);
        
        // Add the warning
        element.innerText += data + '\n';
        
        // Re-append the success message at the end
        if (successMessage) {
          element.innerText += successMessage;
        }
      } else {
        // Normal output handling
        element.innerText += data + '\n';
      }
      
      element.scrollTop = element.scrollHeight;

      // Apply success styling when compilation is successful
      if (this.isCompilationSuccessful(data)) {
        element.className = 'terminal terminal--success';
        
        // Update app row status to compiled
        const appRowInstance = this.appRows.get(rowCounter);
        if (appRowInstance) {
          appRowInstance.setCompiledStatus();
        }
        
        // Stop timer for this operation (run/restart completed successfully)
        this.stopTimerForOperation(progress);
      } else if (data.includes('ERROR') || data.includes('error') || data.includes('Error')) {
        element.className = 'terminal terminal--error';
        
        // Stop timer on error as well
        this.stopTimerForOperation(progress);
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
      'Compiled successfully.',
      'webpack compiled successfully',
      'Build completed successfully',
      'Compilation complete',
      '✓ Compiled'
    ];
    
    // Also check for patterns that indicate compilation is done with warnings
    const completionPatterns = [
      'compiled successfully in',
      'webpack compiled with',
      'Compiled with warnings'
    ];
    
    return successPatterns.some(pattern => 
      data.toLowerCase().includes(pattern.toLowerCase())
    ) || completionPatterns.some(pattern => 
      data.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Check if the output is a warning
  isWarningOutput(data) {
    const warningPatterns = [
      'warning',
      'warn:',
      'deprecated',
      'module not found'
    ];
    
    return warningPatterns.some(pattern => 
      data.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Check if the terminal already contains "Compiled successfully"
  hasCompiledSuccessfully(element) {
    return element.innerText.toLowerCase().includes('compiled successfully');
  }

  // Extract and remove the "Compiled successfully" message from terminal
  extractAndRemoveSuccessMessage(element) {
    const lines = element.innerText.split('\n');
    let successMessage = '';
    const filteredLines = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes('compiled successfully')) {
        successMessage = line + '\n';
      } else {
        filteredLines.push(line);
      }
    }
    
    // Update element without the success message
    element.innerText = filteredLines.join('\n');
    
    return successMessage;
  }
}
