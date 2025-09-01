/**
 * Process Manager
 * Handles all process-related operations (build, copy, run, etc.)
 */
export class ProcessManager {
  constructor(timeTracker = null) {
    this.timeTracker = timeTracker;
    this.appRows = new Map(); // Track app row instances
    this.buildRows = new Map(); // Track build row instances
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

  // Register a build row instance
  registerBuildRow(rowCounter, buildRowInstance) {
    this.buildRows.set(rowCounter, buildRowInstance);
  }

  // Unregister a build row instance
  unregisterBuildRow(rowCounter) {
    this.buildRows.delete(rowCounter);
  }

  // Register a linker row instance
  registerLinkerRow(rowCounter, linkerRowInstance) {
    this.linkerRows = this.linkerRows || new Map();
    this.linkerRows.set(rowCounter, linkerRowInstance);
  }

  // Unregister a linker row instance
  unregisterLinkerRow(rowCounter) {
    if (this.linkerRows) {
      this.linkerRows.delete(rowCounter);
    }
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

    // Install output listener
    window.API.install_output((data, progress, isDone) => {
      this.handleInstallOutput(data, progress, isDone);
    });

    // Link output listener
    window.API.link_output((data, progress, isDone, exitCode) => {
      this.handleLinkOutput(data, progress, isDone, exitCode);
    });

    // Unlink output listener
    window.API.unlink_output((data, progress, isDone, exitCode) => {
      this.handleUnlinkOutput(data, progress, isDone, exitCode);
    });

    // Copy Assets output listener  
    window.API.copy_assets_output((data, progress, isDone, libraryName) => {
      this.handleCopyAssetsOutput(data, progress, isDone, libraryName);
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

  async install(path, progressId, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }
      
      await window.API.npm_install({ path, progress: progressId });
    } catch (error) {
      console.error('Install failed:', error);
      this.showError(progressId, 'Install failed');
      
      // Stop timer on error
      this.stopTimerForOperation(progressId);
    }
  }

  async linkLibraries(libraries, destination, progressId, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }

      // Store the linking operation state
      this.linkingOperations = this.linkingOperations || new Map();
      this.linkingOperations.set(progressId, {
        libraries,
        destination,
        currentLibraryIndex: 0,
        completedLibraries: [],
        operationId
      });

      // Start linking the first library
      await this.linkNextLibrary(progressId);
    } catch (error) {
      console.error('Link libraries failed:', error);
      this.showError(progressId, 'Link failed');
      this.stopTimerForOperation(progressId);
    }
  }

  async copyAssets(libraryPath, buildAssetsCommand, libraryName, progressId, operationId = null, isLast = true) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }
      
      await window.API.npm_custom_command({
        path: libraryPath,
        command: buildAssetsCommand,
        libraryName: libraryName,
        progress: progressId,
        isLast: isLast
      });

      console.log(`Copy assets process started for ${libraryName}`);
    } catch (error) {
      console.error(`Copy assets failed for ${libraryName}:`, error);
      this.showError(progressId, `Copy assets failed for ${libraryName}`);
      
      // Stop timer on error
      this.stopTimerForOperation(progressId);
    }
  }

  async linkNextLibrary(progressId) {
    const operation = this.linkingOperations.get(progressId);
    if (!operation) return;

    const { libraries, currentLibraryIndex } = operation;
    
    if (currentLibraryIndex >= libraries.length) {
      // All libraries linked, now link to destination
      await this.linkToDestination(progressId);
      return;
    }

    const library = libraries[currentLibraryIndex];
    console.log(`Linking library ${currentLibraryIndex + 1}/${libraries.length}: ${library.libName}`);

    await window.API.npm_link_library({
      linkPath: library.linkPath,
      libName: library.libName,
      progressId: progressId
    });
  }

  async linkToDestination(progressId) {
    const operation = this.linkingOperations.get(progressId);
    if (!operation) return;

    const { destination, completedLibraries } = operation;
    const libNames = completedLibraries.map(lib => lib.libName);

    console.log(`Linking to destination: ${destination.linkPath} with libraries: ${libNames.join(', ')}`);

    await window.API.npm_link_destination({
      linkPath: destination.linkPath,
      libNames: libNames,
      progressId: progressId
    });
  }

  async unlinkLibraries(libraries, destination, progressId, operationId = null) {
    try {
      // Store operation ID for timer tracking
      if (operationId && this.timeTracker) {
        this.operationTimers.set(progressId, operationId);
      }

      // Store the unlinking operation state
      this.unlinkingOperations = this.unlinkingOperations || new Map();
      this.unlinkingOperations.set(progressId, {
        libraries,
        destination,
        currentLibraryIndex: 0,
        completedLibraries: [],
        operationId,
        phase: 'destination' // Start with destination unlink
      });

      // Start with unlinking from destination first
      await this.unlinkFromDestination(progressId);
    } catch (error) {
      console.error('Unlink libraries failed:', error);
      this.showError(progressId, 'Unlink failed');
      this.stopTimerForOperation(progressId);
    }
  }

  async unlinkFromDestination(progressId) {
    const operation = this.unlinkingOperations.get(progressId);
    if (!operation) return;

    const { libraries, destination } = operation;
    const libNames = libraries.map(lib => lib.libName);

    console.log(`Unlinking from destination: ${destination.linkPath} with libraries: ${libNames.join(', ')}`);

    await window.API.npm_unlink_destination({
      linkPath: destination.linkPath,
      libNames: libNames,
      progressId: progressId
    });
  }

  async unlinkNextLibrary(progressId) {
    const operation = this.unlinkingOperations.get(progressId);
    if (!operation) return;

    const { libraries, currentLibraryIndex } = operation;
    
    if (currentLibraryIndex >= libraries.length) {
      // All libraries unlinked - operation complete
      this.stopTimerForOperation(progressId);
      
      // Find the linker row instance and mark complete
      const rowId = progressId.replace(/^linker-progress-/, '');
      const linkerRowInstance = this.linkerRows?.get(parseInt(rowId));
      
      if (linkerRowInstance) {
        linkerRowInstance.setUnlinkCompleteStatus(true);
      }
      
      // Clean up operation
      this.unlinkingOperations.delete(progressId);
      return;
    }

    const library = libraries[currentLibraryIndex];
    console.log(`Unlinking library ${currentLibraryIndex + 1}/${libraries.length}: ${library.libName}`);

    await window.API.npm_unlink_library({
      linkPath: library.linkPath,
      libName: library.libName,
      progressId: progressId
    });
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
        
        // Check for build errors during the process
        if (data.includes('ERROR') || data.includes('Error') || data.includes('error') ||
            data.includes('Build failed') || data.includes('compilation failed') ||
            data.includes('ng build failed') || data.includes('webpack failed') ||
            data.includes('Module not found') || data.includes('Cannot resolve') ||
            data.includes('Compilation error') || data.includes('TypeScript error') ||
            data.includes('✘') || data.includes('✗') || data.includes('Failed to compile')) {
          element.className = 'terminal terminal--error';
        }
        
        // Check for successful build completion
        if (data.includes('✓ Built') || data.includes('✓ Compiled') ||
            data.includes('Build complete') || data.includes('webpack compiled successfully') ||
            data.includes('Application bundle generation complete') ||
            data.includes('build completed successfully')) {
          element.className = 'terminal terminal--success';
        }
      }
    } else {
      // Don't show redundant terminal text, the status indicator will show completion
      
      // Check if build failed based on exit code or final output
      const element = document.getElementById(`build-${progress}`);
      const isBuildError = element && (element.className.includes('terminal--error') || 
                                     data !== '0'); // Non-zero exit code indicates failure
      
      // Re-enable build button - extract row ID from progress ID
      const rowId = progress.replace('progress-', '');
      const buildButton = document.getElementById(`build-button-${rowId}`);
      if (buildButton) buildButton.classList.remove('btn--disabled');
      
      // Stop individual timer for build row and show completion status
      const buildRowInstance = this.buildRows.get(parseInt(rowId));
      if (buildRowInstance) {
        if (isBuildError) {
          buildRowInstance.setBuildCompleteStatus('build', false); // false indicates failure
        } else {
          buildRowInstance.setBuildCompleteStatus('build', true); // true indicates success
        }
      }
      
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
        
        // Check for copy errors during the process
        if (data.includes('ERROR') || data.includes('Error') || data.includes('error') ||
            data.includes('permission denied') || data.includes('ENOENT') ||
            data.includes('EACCES') || data.includes('cannot copy') ||
            data.includes('failed to copy') || data.includes('no such file')) {
          element.className = 'terminal terminal--error';
        }
        
        // Check for successful copy completion
        if (data.includes('Copy completed successfully') || data.includes('copied successfully') || 
            data.includes('copy completed') || data.includes('files copied') || data.includes('✓')) {
          element.className = 'terminal terminal--success';
        }
      }
    } else {
      // Don't show redundant terminal text, the status indicator will show completion
      
      // Check if copy failed based on terminal content or exit code
      const element = document.getElementById(`build-${progress}`);
      const isCopyError = element && (element.className.includes('terminal--error') || 
                                     data !== '0'); // Non-zero exit code indicates failure
      
      // Re-enable buttons - extract row ID from progress ID
      const rowId = progress.replace('progress-', '');
      const buildButton = document.getElementById(`build-button-${rowId}`);
      const copyButton = document.getElementById(`copy-button-${rowId}`);
      if (buildButton) buildButton.classList.remove('btn--disabled');
      if (copyButton) copyButton.classList.remove('btn--disabled');
      
      // Stop individual timer for build row and show completion status
      const buildRowInstance = this.buildRows.get(parseInt(rowId));
      if (buildRowInstance) {
        buildRowInstance.setBuildCompleteStatus('copy', !isCopyError);
      }
      
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
        
        // Update app row to stop individual timer on error
        const appRowInstance = this.appRows.get(rowCounter);
        if (appRowInstance) {
          appRowInstance.stopIndividualTimer();
        }
        
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

  handleInstallOutput(data, progress, isDone) {
    const element = document.getElementById(progress);
    if (element) {
      element.classList.remove('u-hidden');
      element.innerText += data + '\n';
      element.scrollTop = element.scrollHeight;

      // Check for successful installation patterns
      if (data.includes('added') && data.includes('packages') || 
          data.includes('up to date') || 
          data.includes('audited') && data.includes('packages') ||
          data.includes('found 0 vulnerabilities')) {
        element.className = 'terminal terminal--success';
      }
      
      // Check for errors - npm specific error patterns
      if (data.includes('ERROR') || data.includes('error') || data.includes('Error') ||
          data.includes('ENOENT') || data.includes('EACCES') || data.includes('npm ERR!') ||
          data.includes('ERESOLVE') || data.includes('permission denied') ||
          data.includes('ENOTFOUND') || data.includes('network error') ||
          data.includes('code E') || data.includes('errno -')) {
        element.className = 'terminal terminal--error';
      }

      if (isDone) {
        // Stop timer for this operation
        this.stopTimerForOperation(progress);
        
        // Determine if installation was successful or failed
        const isSuccess = element && !element.className.includes('terminal--error');
        
        // Find the row instance and re-enable buttons
        const rowId = progress.replace(/^(app|build)-progress-/, '');
        const buildRowInstance = this.buildRows.get(parseInt(rowId));
        const appRowInstance = this.appRows.get(parseInt(rowId));
        
        if (buildRowInstance) {
          buildRowInstance.onInstallComplete(isSuccess);
        }
        
        if (appRowInstance) {
          appRowInstance.onInstallComplete(isSuccess);
        }
      }
    }
  }

  handleLinkOutput(data, progress, isDone, exitCode) {
    const element = document.getElementById(progress);
    if (element) {
      element.classList.remove('u-hidden');
      element.innerText += data + '\n';
      element.scrollTop = element.scrollHeight;

      // Check for successful npm link patterns
      if (data.includes('linked') || data.includes('symlink') || 
          data.includes('successfully linked') || data.includes('npm link completed')) {
        element.className = 'terminal terminal--success';
      }
      
      // Check for errors - npm link specific error patterns
      if (data.includes('ERROR') || data.includes('error') || data.includes('Error') ||
          data.includes('ENOENT') || data.includes('EACCES') || data.includes('npm ERR!') ||
          data.includes('permission denied') || data.includes('ENOTFOUND') ||
          data.includes('code E') || data.includes('errno -') || 
          data.includes('Cannot resolve') || data.includes('Module not found')) {
        element.className = 'terminal terminal--error';
      }

      if (isDone) {
        const operation = this.linkingOperations?.get(progress);
        if (operation) {
          const isSuccess = exitCode === 0 && !element.className.includes('terminal--error');
          
          if (isSuccess) {
            // Move to next library or destination
            const { libraries, currentLibraryIndex } = operation;
            
            if (currentLibraryIndex < libraries.length) {
              // We just completed linking a library
              operation.completedLibraries.push(libraries[currentLibraryIndex]);
              operation.currentLibraryIndex++;
              
              // Continue with next library
              this.linkNextLibrary(progress);
            } else {
              // We just completed linking to destination - operation complete
              this.stopTimerForOperation(progress);
              
              // Find the linker row instance and mark complete
              const rowId = progress.replace(/^linker-progress-/, '');
              const linkerRowInstance = this.linkerRows?.get(parseInt(rowId));
              
              if (linkerRowInstance) {
                linkerRowInstance.setLinkCompleteStatus(true);
              }
              
              // Clean up operation
              this.linkingOperations.delete(progress);
            }
          } else {
            // Link failed - stop operation
            this.stopTimerForOperation(progress);
            
            const rowId = progress.replace(/^linker-progress-/, '');
            const linkerRowInstance = this.linkerRows?.get(parseInt(rowId));
            
            if (linkerRowInstance) {
              linkerRowInstance.setLinkCompleteStatus(false);
            }
            
            // Clean up operation
            this.linkingOperations.delete(progress);
          }
        }
      }
    }
  }

  handleUnlinkOutput(data, progress, isDone, exitCode) {
    const element = document.getElementById(progress);
    if (element) {
      element.classList.remove('u-hidden');
      element.innerText += data + '\n';
      element.scrollTop = element.scrollHeight;

      // Check for successful npm unlink patterns
      if (data.includes('unlinked') || data.includes('removed') || 
          data.includes('successfully unlinked') || data.includes('npm unlink completed')) {
        element.className = 'terminal terminal--success';
      }
      
      // Check for errors - npm unlink specific error patterns
      if (data.includes('ERROR') || data.includes('error') || data.includes('Error') ||
          data.includes('ENOENT') || data.includes('EACCES') || data.includes('npm ERR!') ||
          data.includes('permission denied') || data.includes('ENOTFOUND') ||
          data.includes('code E') || data.includes('errno -') || 
          data.includes('Cannot resolve') || data.includes('Module not found')) {
        element.className = 'terminal terminal--error';
      }

      if (isDone) {
        const operation = this.unlinkingOperations?.get(progress);
        if (operation) {
          const isSuccess = exitCode === 0 && !element.className.includes('terminal--error');
          
          if (isSuccess) {
            const { phase, currentLibraryIndex, libraries } = operation;
            
            if (phase === 'destination') {
              // Destination unlink completed, now start unlinking libraries
              operation.phase = 'libraries';
              operation.currentLibraryIndex = 0;
              this.unlinkNextLibrary(progress);
            } else if (phase === 'libraries') {
              // We just completed unlinking a library
              operation.completedLibraries.push(libraries[currentLibraryIndex]);
              operation.currentLibraryIndex++;
              
              // Continue with next library
              this.unlinkNextLibrary(progress);
            }
          } else {
            // Unlink failed - stop operation
            this.stopTimerForOperation(progress);
            
            const rowId = progress.replace(/^linker-progress-/, '');
            const linkerRowInstance = this.linkerRows?.get(parseInt(rowId));
            
            if (linkerRowInstance) {
              linkerRowInstance.setUnlinkCompleteStatus(false);
            }
            
            // Clean up operation
            this.unlinkingOperations.delete(progress);
          }
        }
      }
    }
  }

  handleCopyAssetsOutput(data, progress, isDone, libraryName) {
    const element = document.getElementById(progress);
    if (element) {
      element.classList.remove('u-hidden');
      element.innerText += data + '\n';
      element.scrollTop = element.scrollHeight;

      // Check for successful build patterns
      if (data.includes('successfully') || data.includes('complete') || 
          data.includes('✓') || data.includes('Done') ||
          data.includes('Build finished') || data.includes('assets copied')) {
        element.className = 'terminal terminal--success';
      }
      
      // Check for errors
      if (data.includes('ERROR') || data.includes('error') || data.includes('Error') ||
          data.includes('failed') || data.includes('FAILED') || data.includes('ENOENT') ||
          data.includes('EACCES') || data.includes('permission denied') ||
          data.includes('code E') || data.includes('errno -')) {
        element.className = 'terminal terminal--error';
      }

      if (isDone) {
        // Stop timer for this operation
        this.stopTimerForOperation(progress);
        
        // Check if operation was successful
        const isSuccess = !element.className.includes('terminal--error');
        
        // Handle linker rows
        if (progress.startsWith('linker-progress-')) {
          const rowId = progress.replace(/^linker-progress-/, '');
          const linkerRowInstance = this.linkerRows?.get(parseInt(rowId));
          
          if (linkerRowInstance) {
            if (isSuccess) {
              linkerRowInstance.updateStatus('success', `Copy Assets completed for ${libraryName}`);
            } else {
              linkerRowInstance.updateStatus('error', `Copy Assets failed for ${libraryName}`);
            }
            
            // Re-enable the copy assets button
            const copyAssetsButton = document.getElementById(`copy-assets-button-${rowId}`);
            if (copyAssetsButton) {
              copyAssetsButton.classList.remove('btn--disabled');
            }
          }
        }
        
        // Handle build rows
        if (progress.startsWith('build-progress-')) {
          const rowId = progress.replace(/^build-progress-/, '');
          const buildRowInstance = this.buildRows?.get(parseInt(rowId));
          
          if (buildRowInstance && buildRowInstance.onCopyAssetsComplete) {
            buildRowInstance.onCopyAssetsComplete(isSuccess);
          }
        }
      }
    }
  }

  // Check if the output indicates successful compilation
  isCompilationSuccessful(data) {
    const successPatterns = [
      'Compiled successfully.',
      'webpack compiled successfully',
      'Build completed successfully',
      'Compilation complete',
      '✓ Compiled',
      'Application bundle generation complete.'
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
