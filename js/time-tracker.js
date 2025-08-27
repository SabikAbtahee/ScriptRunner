/**
 * Time Tracker Component
 * Tracks time spent on build and run operations
 */
export class TimeTracker {
  constructor() {
    this.totalTimeSpent = 0; // Total time in seconds
    this.activeTimers = new Map(); // Track active timers by operation ID
    this.displayElement = null;
    this.storageKey = 'scriptrunner_time_spent';
    
    this.init();
  }

  init() {
    // Load saved time from localStorage
    this.loadTimeFromStorage();
    
    // Get display element
    this.displayElement = document.getElementById('timeSpentDisplay');
    
    // Add double-click handler to reset timer
    if (this.displayElement) {
      this.displayElement.addEventListener('dblclick', () => {
        if (confirm('Reset time tracking? This cannot be undone.')) {
          this.resetTimer();
        }
      });
      
      // Add hover tooltip
      this.displayElement.title = 'Double-click to reset timer';
    }
    
    // Setup clear timer button
    this.setupClearButton();
    
    // Update display
    this.updateDisplay();
  }

  /**
   * Setup the clear timer button functionality
   */
  setupClearButton() {
    const clearButton = document.getElementById('clearTimerButton');
    if (clearButton) {
      clearButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirm('Clear all time tracking data? This cannot be undone.')) {
          this.resetTimer();
        }
      });
    }
  }

  /**
   * Start timing for an operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {string} operationType - Type of operation (build, copy, run, restart)
   */
  startTimer(operationId, operationType) {
    const startTime = Date.now();
    this.activeTimers.set(operationId, {
      startTime,
      operationType
    });
    
    console.log(`⏱️ Started timer for ${operationType} operation: ${operationId}`);
  }

  /**
   * Stop timing for an operation and add to total
   * @param {string} operationId - Unique identifier for the operation
   */
  stopTimer(operationId) {
    const timer = this.activeTimers.get(operationId);
    
    if (!timer) {
      console.warn(`No active timer found for operation: ${operationId}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - timer.startTime) / 1000); // Convert to seconds
    
    // Add to total time
    this.totalTimeSpent += duration;
    
    // Remove from active timers
    this.activeTimers.delete(operationId);
    
    // Save to storage
    this.saveTimeToStorage();
    
    // Update display
    this.updateDisplay();
    
    console.log(`⏱️ Stopped timer for ${timer.operationType} operation: ${operationId} (${duration}s)`);
    console.log(`📊 Total time spent: ${this.formatTime(this.totalTimeSpent)}`);
    
    return duration;
  }

  /**
   * Reset the total time spent
   */
  resetTimer() {
    this.totalTimeSpent = 0;
    this.activeTimers.clear();
    this.saveTimeToStorage();
    this.updateDisplay();
    
    // Show brief confirmation feedback
    if (this.displayElement) {
      const originalColor = this.displayElement.style.color;
      this.displayElement.style.color = 'var(--error-color)';
      this.displayElement.style.transition = 'color 0.3s ease';
      
      setTimeout(() => {
        this.displayElement.style.color = originalColor;
      }, 500);
    }
    
    console.log('⏱️ Timer reset - all time tracking data cleared');
  }

  /**
   * Get current total time spent
   * @returns {number} Total time in seconds
   */
  getTotalTime() {
    return this.totalTimeSpent;
  }

  /**
   * Format time in seconds to human readable format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
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

  /**
   * Update the display element with current time
   */
  updateDisplay() {
    if (this.displayElement) {
      this.displayElement.textContent = this.formatTime(this.totalTimeSpent);
      
      // Add a subtle animation when time updates
      this.displayElement.style.transition = 'color 0.3s ease';
      this.displayElement.style.color = 'var(--success-color)';
      
      setTimeout(() => {
        this.displayElement.style.color = '';
      }, 300);
    }
  }

  /**
   * Save time to localStorage
   */
  saveTimeToStorage() {
    try {
      localStorage.setItem(this.storageKey, this.totalTimeSpent.toString());
    } catch (error) {
      console.error('Failed to save time to storage:', error);
    }
  }

  /**
   * Load time from localStorage
   */
  loadTimeFromStorage() {
    try {
      const savedTime = localStorage.getItem(this.storageKey);
      if (savedTime !== null) {
        this.totalTimeSpent = parseInt(savedTime, 10) || 0;
      }
    } catch (error) {
      console.error('Failed to load time from storage:', error);
      this.totalTimeSpent = 0;
    }
  }

  /**
   * Get all active timers (for debugging)
   */
  getActiveTimers() {
    return Array.from(this.activeTimers.entries()).map(([id, timer]) => ({
      operationId: id,
      operationType: timer.operationType,
      startTime: timer.startTime,
      currentDuration: Math.round((Date.now() - timer.startTime) / 1000)
    }));
  }
}
