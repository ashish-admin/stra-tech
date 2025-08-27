/**
 * useErrorTesting Hook
 * 
 * React hook for managing error testing functionality in development.
 * Provides state management and utilities for error boundary testing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getErrorRegistry,
  isDevToolsEnabled,
  clearErrorHistory,
  triggerCustomError
} from '../utils/devTools';

/**
 * Custom hook for error testing functionality
 */
export const useErrorTesting = (options = {}) => {
  const {
    autoSubscribe = true,
    maxHistorySize = 50,
    enableKeyboardShortcuts = true,
    onError = null
  } = options;

  const [isEnabled, setIsEnabled] = useState(isDevToolsEnabled());
  const [errorHistory, setErrorHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(true);
  const unsubscribeRef = useRef(null);

  // Subscribe to error registry updates
  useEffect(() => {
    if (!isEnabled || !autoSubscribe) return;

    const registry = getErrorRegistry();
    if (!registry) return;

    // Subscribe to new errors
    const unsubscribe = registry.subscribe((errorRecord) => {
      if (!isRecording) return;

      setErrorHistory(prev => {
        const updated = [errorRecord, ...prev];
        return updated.slice(0, maxHistorySize);
      });

      // Call external error handler if provided
      if (onError) {
        try {
          onError(errorRecord);
        } catch (e) {
          console.warn('Error in useErrorTesting onError handler:', e);
        }
      }
    });

    unsubscribeRef.current = unsubscribe;

    // Load initial history
    const initialHistory = registry.getErrorHistory();
    setErrorHistory(initialHistory.slice(-maxHistorySize));

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isEnabled, autoSubscribe, isRecording, maxHistorySize, onError]);

  // Keyboard shortcuts for common error testing
  useEffect(() => {
    if (!isEnabled || !enableKeyboardShortcuts) return;

    const handleKeyDown = (event) => {
      // Alt+Shift combinations for error testing
      if (event.altKey && event.shiftKey) {
        let handled = false;

        switch (event.key.toLowerCase()) {
          case 't':
            // Alt+Shift+T - Toggle error recording
            event.preventDefault();
            setIsRecording(prev => !prev);
            console.log('🎥 Error recording:', !isRecording ? 'ON' : 'OFF');
            handled = true;
            break;
          case 'c':
            // Alt+Shift+C - Clear error history
            event.preventDefault();
            clearAllErrors();
            console.log('🧹 Error history cleared via shortcut');
            handled = true;
            break;
          case 'h':
            // Alt+Shift+H - Show error history
            event.preventDefault();
            console.table(errorHistory);
            console.log('📊 Total errors:', errorHistory.length);
            handled = true;
            break;
        }

        if (handled) {
          return false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, enableKeyboardShortcuts, isRecording, errorHistory]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    if (!isEnabled) return;
    
    clearErrorHistory();
    setErrorHistory([]);
  }, [isEnabled]);

  // Toggle recording state
  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
  }, []);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    if (!isEnabled) return null;

    const stats = errorHistory.reduce((acc, error) => {
      acc.total++;
      acc.byType[error.type] = (acc.byType[error.type] || 0) + 1;
      acc.byComponent[error.componentName] = (acc.byComponent[error.componentName] || 0) + 1;
      
      const hourAgo = Date.now() - (60 * 60 * 1000);
      if (error.timestamp > hourAgo) {
        acc.recentCount++;
      }
      
      return acc;
    }, {
      total: 0,
      byType: {},
      byComponent: {},
      recentCount: 0
    });

    return stats;
  }, [isEnabled, errorHistory]);

  // Trigger test error for specific component
  const triggerTestError = useCallback((componentName, errorType = 'Test') => {
    if (!isEnabled) {
      console.warn('Error testing not enabled');
      return;
    }

    try {
      triggerCustomError(
        errorType,
        `Test error triggered for ${componentName}`,
        componentName
      );
    } catch (error) {
      console.log('✅ Test error triggered for', componentName);
    }
  }, [isEnabled]);

  // Get recent errors (last N)
  const getRecentErrors = useCallback((count = 10) => {
    if (!isEnabled) return [];
    return errorHistory.slice(0, count);
  }, [isEnabled, errorHistory]);

  // Filter errors by criteria
  const filterErrors = useCallback((criteria = {}) => {
    if (!isEnabled) return [];

    const { type, componentName, timeRange, searchText } = criteria;
    
    return errorHistory.filter(error => {
      if (type && error.type !== type) return false;
      if (componentName && error.componentName !== componentName) return false;
      if (timeRange && error.timestamp < (Date.now() - timeRange)) return false;
      if (searchText && !error.error.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [isEnabled, errorHistory]);

  // Export error history
  const exportErrorHistory = useCallback(() => {
    if (!isEnabled) return null;

    const exportData = {
      timestamp: new Date().toISOString(),
      totalErrors: errorHistory.length,
      errors: errorHistory.map(error => ({
        ...error,
        timestamp: new Date(error.timestamp).toISOString()
      })),
      stats: getErrorStats()
    };

    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `lokdarpan-error-testing-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return exportData;
  }, [isEnabled, errorHistory, getErrorStats]);

  // Component testing utilities
  const componentTestingUtils = {
    // Test error boundary for specific component
    testErrorBoundary: (componentName) => {
      triggerTestError(componentName, 'ErrorBoundaryTest');
    },

    // Test async error handling
    testAsyncHandling: async (componentName) => {
      try {
        const error = new Error(`Async error test for ${componentName}`);
        error.name = 'AsyncTestError';
        throw error;
      } catch (error) {
        if (onError) onError({ type: 'async-test', error: error.message, componentName, timestamp: Date.now() });
        throw error;
      }
    },

    // Test network error simulation
    testNetworkError: (componentName, endpoint = '/api/test') => {
      const error = new Error(`Network error test for ${componentName} at ${endpoint}`);
      error.name = 'NetworkTestError';
      if (onError) onError({ type: 'network-test', error: error.message, componentName, timestamp: Date.now() });
      throw error;
    }
  };

  return {
    // State
    isEnabled,
    errorHistory,
    isRecording,

    // Actions
    clearAllErrors,
    toggleRecording,
    triggerTestError,

    // Queries
    getErrorStats,
    getRecentErrors,
    filterErrors,

    // Utilities
    exportErrorHistory,
    componentTestingUtils
  };
};

/**
 * Hook for component-specific error testing
 */
export const useComponentErrorTesting = (componentName, options = {}) => {
  const { autoInitialize = false, testOnMount = false } = options;
  
  const errorTesting = useErrorTesting({
    onError: (errorRecord) => {
      console.log(`🧪 Error in ${componentName}:`, errorRecord);
    }
  });

  // Component-specific test functions
  const testComponentError = useCallback(() => {
    errorTesting.triggerTestError(componentName, 'ComponentTest');
  }, [componentName, errorTesting]);

  const testComponentAsync = useCallback(async () => {
    return errorTesting.componentTestingUtils.testAsyncHandling(componentName);
  }, [componentName, errorTesting]);

  const testComponentNetwork = useCallback((endpoint) => {
    return errorTesting.componentTestingUtils.testNetworkError(componentName, endpoint);
  }, [componentName, errorTesting]);

  // Auto-initialize testing on mount if enabled
  useEffect(() => {
    if (testOnMount && errorTesting.isEnabled) {
      console.log(`🧪 Auto-testing error boundaries for ${componentName}`);
      // Delay to allow component to fully mount
      setTimeout(() => {
        try {
          testComponentError();
        } catch (e) {
          console.log('✅ Component error boundary test completed');
        }
      }, 100);
    }
  }, [componentName, testOnMount, errorTesting.isEnabled, testComponentError]);

  return {
    ...errorTesting,
    
    // Component-specific methods
    testComponentError,
    testComponentAsync, 
    testComponentNetwork,
    
    // Component context
    componentName,
    
    // Component-specific stats
    getComponentErrors: () => errorTesting.filterErrors({ componentName }),
    getComponentErrorCount: () => errorTesting.filterErrors({ componentName }).length
  };
};

export default useErrorTesting;