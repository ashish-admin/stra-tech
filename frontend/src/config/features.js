/**
 * Feature Flags Configuration
 * Controls the rollout of frontend enhancements
 * ALL FLAGS START AS FALSE for safety
 */

export const enhancementFlags = {
  // Phase 1 - Error Boundaries - WAVE 1 ENABLED
  enableComponentErrorBoundaries: true,
  enableTabErrorBoundaries: true,
  enableSSEErrorBoundaries: true,
  enablePerformanceMonitor: true,
  enableErrorTelemetry: true,
  enableOfflineErrorQueue: true,
  
  // Phase 2 - Component Reorganization
  useNewComponentStructure: false,
  useSharedBaseChart: false,
  useFeatureFolders: false,
  enableComponentLazyLoading: false,
  
  // Phase 3 - SSE Integration  
  enableSSEManager: false,
  enableCircuitBreaker: false,
  enableProgressTracking: false,
  enableReconnectionStrategy: false,
  enableSSEHeartbeat: false,
  enableMessageOrdering: false,
  
  // Phase 4 - Performance
  enablePerformanceBudgets: false,
  enableRUM: false,
  enableAPM: false,
  enableBundleOptimization: false,
  
  // Phase 5 - Advanced Features
  enableAdvancedVisualizations: false,
  enablePredictiveAnalytics: false,
  enable3DMap: false,
  
  // Global kill switch - WAVE 1 ENABLED
  enableFrontendEnhancements: true
};

/**
 * Runtime feature flag manager
 * Allows dynamic toggling without redeploy
 */
class FeatureFlagManager {
  constructor() {
    this.flags = { ...enhancementFlags };
    this.listeners = new Set();
    
    // Check for runtime overrides
    this.loadRuntimeFlags();
    
    // Set up polling for flag updates
    this.startPolling();
  }

  /**
   * Get feature flag value
   */
  isEnabled(flagName) {
    // Global kill switch
    if (!this.flags.enableFrontendEnhancements && flagName !== 'enableFrontendEnhancements') {
      return false;
    }
    
    return this.flags[flagName] || false;
  }

  /**
   * Set feature flag value (development only)
   */
  setFlag(flagName, value) {
    if (process.env.NODE_ENV !== 'production') {
      this.flags[flagName] = value;
      this.notifyListeners(flagName, value);
      this.saveToLocalStorage();
    }
  }

  /**
   * Toggle feature flag (development only)
   */
  toggleFlag(flagName) {
    if (process.env.NODE_ENV !== 'production') {
      this.setFlag(flagName, !this.flags[flagName]);
    }
  }

  /**
   * Load runtime flags from various sources
   */
  loadRuntimeFlags() {
    // 1. Check URL parameters (development only)
    if (process.env.NODE_ENV === 'development') {
      const urlParams = new URLSearchParams(window.location.search);
      for (const [key, value] of urlParams.entries()) {
        if (key.startsWith('ff_')) {
          const flagName = key.substring(3);
          if (flagName in this.flags) {
            this.flags[flagName] = value === 'true';
          }
        }
      }
    }

    // 2. Check localStorage (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const stored = localStorage.getItem('lokdarpan_feature_flags');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(this.flags, parsed);
        }
      } catch (error) {
        console.warn('Failed to load feature flags from localStorage:', error);
      }
    }

    // 3. Check server configuration
    this.fetchServerFlags();
  }

  /**
   * Fetch flags from server
   */
  async fetchServerFlags() {
    try {
      const response = await fetch('/api/v1/feature-flags', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const serverFlags = await response.json();
        Object.assign(this.flags, serverFlags);
        this.notifyAllListeners();
      }
    } catch (error) {
      // Silent fail - use defaults
      console.debug('Feature flags fetch failed, using defaults:', error);
    }
  }

  /**
   * Start polling for flag updates
   */
  startPolling() {
    // Poll every 5 minutes in production
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        this.fetchServerFlags();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Save flags to localStorage (development only)
   */
  saveToLocalStorage() {
    if (process.env.NODE_ENV === 'development') {
      try {
        localStorage.setItem('lokdarpan_feature_flags', JSON.stringify(this.flags));
      } catch (error) {
        console.warn('Failed to save feature flags:', error);
      }
    }
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of flag change
   */
  notifyListeners(flagName, value) {
    this.listeners.forEach(callback => {
      callback(flagName, value);
    });
  }

  /**
   * Notify all listeners
   */
  notifyAllListeners() {
    Object.entries(this.flags).forEach(([flagName, value]) => {
      this.notifyListeners(flagName, value);
    });
  }

  /**
   * Get all flags
   */
  getAllFlags() {
    return { ...this.flags };
  }

  /**
   * Reset all flags to defaults
   */
  reset() {
    this.flags = { ...enhancementFlags };
    this.notifyAllListeners();
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem('lokdarpan_feature_flags');
    }
  }

  /**
   * Get flags by phase
   */
  getPhaseFlags(phase) {
    const phaseMapping = {
      1: [
        'enableComponentErrorBoundaries',
        'enableTabErrorBoundaries',
        'enableSSEErrorBoundaries',
        'enablePerformanceMonitor',
        'enableErrorTelemetry',
        'enableOfflineErrorQueue'
      ],
      2: [
        'useNewComponentStructure',
        'useSharedBaseChart',
        'useFeatureFolders',
        'enableComponentLazyLoading'
      ],
      3: [
        'enableSSEManager',
        'enableCircuitBreaker',
        'enableProgressTracking',
        'enableReconnectionStrategy',
        'enableSSEHeartbeat',
        'enableMessageOrdering'
      ],
      4: [
        'enablePerformanceBudgets',
        'enableRUM',
        'enableAPM',
        'enableBundleOptimization'
      ],
      5: [
        'enableAdvancedVisualizations',
        'enablePredictiveAnalytics',
        'enable3DMap'
      ]
    };

    const phaseFlags = phaseMapping[phase] || [];
    return phaseFlags.reduce((acc, flag) => {
      acc[flag] = this.flags[flag];
      return acc;
    }, {});
  }

  /**
   * Enable all flags for a phase (development only)
   */
  enablePhase(phase) {
    if (process.env.NODE_ENV !== 'production') {
      const flags = Object.keys(this.getPhaseFlags(phase));
      flags.forEach(flag => {
        this.setFlag(flag, true);
      });
      this.setFlag('enableFrontendEnhancements', true);
    }
  }

  /**
   * Disable all flags for a phase (development only)
   */
  disablePhase(phase) {
    if (process.env.NODE_ENV !== 'production') {
      const flags = Object.keys(this.getPhaseFlags(phase));
      flags.forEach(flag => {
        this.setFlag(flag, false);
      });
    }
  }
}

// Create singleton instance
export const featureFlagManager = new FeatureFlagManager();

/**
 * React hook for feature flags
 */
export const useFeatureFlag = (flagName) => {
  const [enabled, setEnabled] = React.useState(
    featureFlagManager.isEnabled(flagName)
  );

  React.useEffect(() => {
    const unsubscribe = featureFlagManager.subscribe((changedFlag, value) => {
      if (changedFlag === flagName) {
        setEnabled(value);
      }
    });

    return unsubscribe;
  }, [flagName]);

  return enabled;
};

/**
 * React hook for all feature flags
 */
export const useFeatureFlags = () => {
  const [flags, setFlags] = React.useState(featureFlagManager.getAllFlags());

  React.useEffect(() => {
    const unsubscribe = featureFlagManager.subscribe(() => {
      setFlags(featureFlagManager.getAllFlags());
    });

    return unsubscribe;
  }, []);

  return flags;
};

/**
 * Development console helpers
 */
if (process.env.NODE_ENV === 'development') {
  window.featureFlags = featureFlagManager;
  
  console.log(`
🚀 LokDarpan Feature Flags Development Console
Available commands:
- featureFlags.isEnabled('flagName')
- featureFlags.setFlag('flagName', true/false)
- featureFlags.toggleFlag('flagName')
- featureFlags.getAllFlags()
- featureFlags.enablePhase(1-5)
- featureFlags.disablePhase(1-5)
- featureFlags.reset()
  `);
}

export default featureFlagManager;