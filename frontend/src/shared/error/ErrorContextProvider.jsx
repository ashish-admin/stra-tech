/**
 * Error Context Provider for LokDarpan
 * 
 * Provides centralized error context management across the application
 * with political campaign context awareness and recovery state persistence.
 * 
 * Features:
 * - Error context preservation across component boundaries
 * - Political campaign context integration
 * - Recovery state management with React context
 * - Feature flag integration for error handling behavior
 * - Telemetry integration for error tracking
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { enhancementFlags } from '../../config/features';
import { getTelemetryIntegration } from '../../services/telemetryIntegration';
import { errorRecoveryManager, errorContextManager } from './ErrorRecovery';

// Error Context
const ErrorContext = createContext(null);

// Action types
const ERROR_ACTIONS = {
  ERROR_OCCURRED: 'ERROR_OCCURRED',
  ERROR_RECOVERED: 'ERROR_RECOVERED',
  RECOVERY_STARTED: 'RECOVERY_STARTED',
  RECOVERY_FAILED: 'RECOVERY_FAILED',
  CONTEXT_UPDATED: 'CONTEXT_UPDATED',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_POLITICAL_CONTEXT: 'SET_POLITICAL_CONTEXT'
};

// Initial state
const initialState = {
  errors: new Map(),
  recoveryStates: new Map(),
  politicalContext: {
    ward: null,
    campaign: null,
    userRole: null,
    session: null
  },
  globalErrorState: {
    hasActiveErrors: false,
    totalErrors: 0,
    recoveredErrors: 0,
    lastErrorTime: null
  }
};

/**
 * Error reducer for managing error state
 */
function errorReducer(state, action) {
  switch (action.type) {
    case ERROR_ACTIONS.ERROR_OCCURRED: {
      const { errorId, error, componentId, context } = action.payload;
      const newErrors = new Map(state.errors);
      
      newErrors.set(errorId, {
        id: errorId,
        error,
        componentId,
        context,
        timestamp: Date.now(),
        status: 'active',
        recoveryAttempts: 0
      });

      return {
        ...state,
        errors: newErrors,
        globalErrorState: {
          ...state.globalErrorState,
          hasActiveErrors: true,
          totalErrors: state.globalErrorState.totalErrors + 1,
          lastErrorTime: Date.now()
        }
      };
    }

    case ERROR_ACTIONS.RECOVERY_STARTED: {
      const { errorId, strategy } = action.payload;
      const newErrors = new Map(state.errors);
      const newRecoveryStates = new Map(state.recoveryStates);
      
      if (newErrors.has(errorId)) {
        const error = newErrors.get(errorId);
        newErrors.set(errorId, {
          ...error,
          status: 'recovering',
          recoveryAttempts: error.recoveryAttempts + 1,
          currentStrategy: strategy
        });
      }

      newRecoveryStates.set(errorId, {
        isRecovering: true,
        strategy,
        startTime: Date.now(),
        attempts: (state.recoveryStates.get(errorId)?.attempts || 0) + 1
      });

      return {
        ...state,
        errors: newErrors,
        recoveryStates: newRecoveryStates
      };
    }

    case ERROR_ACTIONS.ERROR_RECOVERED: {
      const { errorId, recoveryTime } = action.payload;
      const newErrors = new Map(state.errors);
      const newRecoveryStates = new Map(state.recoveryStates);
      
      if (newErrors.has(errorId)) {
        const error = newErrors.get(errorId);
        newErrors.set(errorId, {
          ...error,
          status: 'recovered',
          recoveredAt: Date.now(),
          recoveryTime
        });
      }

      newRecoveryStates.set(errorId, {
        ...state.recoveryStates.get(errorId),
        isRecovering: false,
        recovered: true,
        recoveryTime
      });

      // Check if this was the last active error
      const hasActiveErrors = Array.from(newErrors.values()).some(
        error => error.status === 'active' || error.status === 'recovering'
      );

      return {
        ...state,
        errors: newErrors,
        recoveryStates: newRecoveryStates,
        globalErrorState: {
          ...state.globalErrorState,
          hasActiveErrors,
          recoveredErrors: state.globalErrorState.recoveredErrors + 1
        }
      };
    }

    case ERROR_ACTIONS.RECOVERY_FAILED: {
      const { errorId, reason } = action.payload;
      const newErrors = new Map(state.errors);
      const newRecoveryStates = new Map(state.recoveryStates);
      
      if (newErrors.has(errorId)) {
        const error = newErrors.get(errorId);
        newErrors.set(errorId, {
          ...error,
          status: 'failed',
          recoveryFailReason: reason,
          failedAt: Date.now()
        });
      }

      newRecoveryStates.set(errorId, {
        ...state.recoveryStates.get(errorId),
        isRecovering: false,
        recovered: false,
        failed: true,
        failReason: reason
      });

      return {
        ...state,
        errors: newErrors,
        recoveryStates: newRecoveryStates
      };
    }

    case ERROR_ACTIONS.SET_POLITICAL_CONTEXT: {
      return {
        ...state,
        politicalContext: {
          ...state.politicalContext,
          ...action.payload
        }
      };
    }

    case ERROR_ACTIONS.CLEAR_ERROR: {
      const { errorId } = action.payload;
      const newErrors = new Map(state.errors);
      const newRecoveryStates = new Map(state.recoveryStates);
      
      newErrors.delete(errorId);
      newRecoveryStates.delete(errorId);

      const hasActiveErrors = Array.from(newErrors.values()).some(
        error => error.status === 'active' || error.status === 'recovering'
      );

      return {
        ...state,
        errors: newErrors,
        recoveryStates: newRecoveryStates,
        globalErrorState: {
          ...state.globalErrorState,
          hasActiveErrors
        }
      };
    }

    case ERROR_ACTIONS.CONTEXT_UPDATED: {
      return {
        ...state,
        politicalContext: {
          ...state.politicalContext,
          ...action.payload
        }
      };
    }

    default:
      return state;
  }
}

/**
 * Error Context Provider Component
 */
export const ErrorContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);
  const telemetry = getTelemetryIntegration();

  // Initialize political context from various sources
  useEffect(() => {
    const initializePoliticalContext = async () => {
      try {
        // Get ward from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const ward = urlParams.get('ward') || localStorage.getItem('selectedWard');
        
        // Get user info from localStorage
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        // Get session ID
        let sessionId = sessionStorage.getItem('lokdarpan_session_id');
        if (!sessionId) {
          sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('lokdarpan_session_id', sessionId);
        }

        dispatch({
          type: ERROR_ACTIONS.SET_POLITICAL_CONTEXT,
          payload: {
            ward,
            userRole: user?.role || 'unknown',
            userId: user?.id || 'anonymous',
            session: sessionId,
            campaign: 'lokdarpan', // Default campaign context
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.warn('Failed to initialize political context:', error);
      }
    };

    initializePoliticalContext();
  }, []);

  // Error occurrence handler
  const handleErrorOccurred = useCallback((error, componentId, context = {}) => {
    if (!enhancementFlags.enableComponentErrorBoundaries) {
      console.error('Error boundaries disabled:', error);
      return null;
    }

    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced context with political information
    const enhancedContext = {
      ...context,
      political: state.politicalContext,
      browser: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      },
      performance: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576)
      } : null
    };

    // Save context in error context manager
    errorContextManager.saveContext(errorId, enhancedContext);

    // Dispatch error occurrence
    dispatch({
      type: ERROR_ACTIONS.ERROR_OCCURRED,
      payload: {
        errorId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          type: error.constructor?.name
        },
        componentId,
        context: enhancedContext
      }
    });

    // Send to telemetry
    if (telemetry && enhancementFlags.enableErrorTelemetry) {
      telemetry.recordEvent('error_context_captured', {
        errorId,
        componentId,
        error: error.message,
        politicalContext: state.politicalContext,
        timestamp: Date.now()
      });
    }

    return errorId;
  }, [state.politicalContext, telemetry]);

  // Recovery handlers
  const handleRecoveryStarted = useCallback((errorId, strategy) => {
    dispatch({
      type: ERROR_ACTIONS.RECOVERY_STARTED,
      payload: { errorId, strategy }
    });

    if (telemetry && enhancementFlags.enableErrorTelemetry) {
      telemetry.recordEvent('error_recovery_started', {
        errorId,
        strategy,
        timestamp: Date.now()
      });
    }
  }, [telemetry]);

  const handleErrorRecovered = useCallback((errorId, recoveryTime) => {
    dispatch({
      type: ERROR_ACTIONS.ERROR_RECOVERED,
      payload: { errorId, recoveryTime }
    });

    if (telemetry && enhancementFlags.enableErrorTelemetry) {
      telemetry.recordEvent('error_recovery_successful', {
        errorId,
        recoveryTime,
        timestamp: Date.now()
      });
    }
  }, [telemetry]);

  const handleRecoveryFailed = useCallback((errorId, reason) => {
    dispatch({
      type: ERROR_ACTIONS.RECOVERY_FAILED,
      payload: { errorId, reason }
    });

    if (telemetry && enhancementFlags.enableErrorTelemetry) {
      telemetry.recordEvent('error_recovery_failed', {
        errorId,
        reason,
        timestamp: Date.now()
      });
    }
  }, [telemetry]);

  // Execute recovery with context
  const executeRecovery = useCallback(async (errorId, strategy, customContext = {}) => {
    const errorData = state.errors.get(errorId);
    if (!errorData) {
      throw new Error(`Error not found: ${errorId}`);
    }

    handleRecoveryStarted(errorId, strategy);

    try {
      const startTime = Date.now();
      
      // Get preserved context
      const preservedContext = errorContextManager.restoreContext(errorId);
      
      // Combine contexts
      const recoveryContext = {
        ...preservedContext,
        ...customContext,
        errorId,
        componentId: errorData.componentId,
        political: state.politicalContext,
        retry: customContext.retry || (() => Promise.resolve(true))
      };

      // Execute recovery
      await errorRecoveryManager.executeRecovery(strategy, errorData.error, recoveryContext);
      
      const recoveryTime = Date.now() - startTime;
      handleErrorRecovered(errorId, recoveryTime);
      
      return true;
      
    } catch (recoveryError) {
      handleRecoveryFailed(errorId, recoveryError.message);
      throw recoveryError;
    }
  }, [state.errors, state.politicalContext, handleRecoveryStarted, handleErrorRecovered, handleRecoveryFailed]);

  // Update political context
  const updatePoliticalContext = useCallback((updates) => {
    dispatch({
      type: ERROR_ACTIONS.SET_POLITICAL_CONTEXT,
      payload: updates
    });
  }, []);

  // Clear error
  const clearError = useCallback((errorId) => {
    dispatch({
      type: ERROR_ACTIONS.CLEAR_ERROR,
      payload: { errorId }
    });
  }, []);

  // Get error summary
  const getErrorSummary = useCallback(() => {
    const activeErrors = Array.from(state.errors.values()).filter(
      error => error.status === 'active'
    );
    
    const recoveringErrors = Array.from(state.errors.values()).filter(
      error => error.status === 'recovering'
    );
    
    const recoveredErrors = Array.from(state.errors.values()).filter(
      error => error.status === 'recovered'
    );

    return {
      total: state.errors.size,
      active: activeErrors.length,
      recovering: recoveringErrors.length,
      recovered: recoveredErrors.length,
      successRate: state.errors.size > 0 ? 
        recoveredErrors.length / state.errors.size : 0,
      hasActiveErrors: state.globalErrorState.hasActiveErrors,
      lastErrorTime: state.globalErrorState.lastErrorTime
    };
  }, [state.errors, state.globalErrorState]);

  // Context value
  const contextValue = {
    // State
    errors: state.errors,
    recoveryStates: state.recoveryStates,
    politicalContext: state.politicalContext,
    globalErrorState: state.globalErrorState,
    
    // Actions
    handleErrorOccurred,
    executeRecovery,
    updatePoliticalContext,
    clearError,
    
    // Utilities
    getErrorSummary,
    
    // Recovery handlers (for error boundary integration)
    handleRecoveryStarted,
    handleErrorRecovered,
    handleRecoveryFailed
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

/**
 * Hook to use error context
 */
export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorContextProvider');
  }
  return context;
};

/**
 * Hook for component-specific error handling
 */
export const useComponentErrorHandler = (componentId) => {
  const errorContext = useErrorContext();
  
  const handleError = useCallback((error, context = {}) => {
    return errorContext.handleErrorOccurred(error, componentId, context);
  }, [errorContext, componentId]);
  
  const executeRecovery = useCallback((errorId, strategy, context = {}) => {
    return errorContext.executeRecovery(errorId, strategy, {
      ...context,
      componentId
    });
  }, [errorContext, componentId]);
  
  const componentErrors = Array.from(errorContext.errors.values()).filter(
    error => error.componentId === componentId
  );
  
  return {
    handleError,
    executeRecovery,
    errors: componentErrors,
    hasActiveErrors: componentErrors.some(error => 
      error.status === 'active' || error.status === 'recovering'
    ),
    clearError: errorContext.clearError
  };
};

/**
 * Hook for political context management
 */
export const usePoliticalContext = () => {
  const { politicalContext, updatePoliticalContext } = useErrorContext();
  
  const setWard = useCallback((ward) => {
    updatePoliticalContext({ ward });
    // Also update localStorage
    if (ward) {
      localStorage.setItem('selectedWard', ward);
    }
  }, [updatePoliticalContext]);
  
  const setCampaignContext = useCallback((campaign) => {
    updatePoliticalContext({ campaign });
  }, [updatePoliticalContext]);
  
  return {
    politicalContext,
    setWard,
    setCampaignContext,
    updateContext: updatePoliticalContext
  };
};

export default ErrorContextProvider;