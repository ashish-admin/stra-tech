// Component health monitoring utility for LokDarpan Dashboard
export class ComponentHealthMonitor {
  constructor() {
    this.componentStatus = new Map();
    this.healthChecks = new Map();
    this.listeners = [];
  }

  // Register a component for health monitoring
  registerComponent(componentName, healthCheckFn = null) {
    this.componentStatus.set(componentName, {
      status: 'healthy',
      lastError: null,
      errorCount: 0,
      lastCheck: Date.now(),
      isActive: true
    });

    if (healthCheckFn) {
      this.healthChecks.set(componentName, healthCheckFn);
    }

    this.notifyListeners();
  }

  // Mark a component as having an error
  reportError(componentName, error) {
    const status = this.componentStatus.get(componentName) || {};
    const updatedStatus = {
      ...status,
      status: 'error',
      lastError: {
        message: error.message || error,
        timestamp: Date.now(),
        stack: error.stack
      },
      errorCount: (status.errorCount || 0) + 1,
      lastCheck: Date.now()
    };

    this.componentStatus.set(componentName, updatedStatus);
    this.notifyListeners();

    // Auto-recovery attempt after 30 seconds for non-critical components
    if (updatedStatus.errorCount < 3) {
      setTimeout(() => {
        this.attemptRecovery(componentName);
      }, 30000);
    }
  }

  // Mark a component as recovered
  markRecovered(componentName) {
    const status = this.componentStatus.get(componentName) || {};
    this.componentStatus.set(componentName, {
      ...status,
      status: 'healthy',
      lastError: null,
      lastCheck: Date.now()
    });
    this.notifyListeners();
  }

  // Attempt automatic recovery
  attemptRecovery(componentName) {
    const status = this.componentStatus.get(componentName);
    if (!status || status.status !== 'error') return;

    const healthCheck = this.healthChecks.get(componentName);
    if (healthCheck) {
      try {
        const isHealthy = healthCheck();
        if (isHealthy) {
          this.markRecovered(componentName);
        }
      } catch (err) {
        console.warn(`Health check failed for ${componentName}:`, err);
      }
    }
  }

  // Get current status of a component
  getComponentStatus(componentName) {
    return this.componentStatus.get(componentName) || null;
  }

  // Get overall dashboard health
  getDashboardHealth() {
    const components = Array.from(this.componentStatus.entries());
    const totalComponents = components.length;
    const healthyComponents = components.filter(([, status]) => status.status === 'healthy').length;
    const errorComponents = components.filter(([, status]) => status.status === 'error').length;

    const healthScore = totalComponents > 0 ? (healthyComponents / totalComponents) * 100 : 100;

    return {
      healthScore: Math.round(healthScore),
      totalComponents,
      healthyComponents,
      errorComponents,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'critical',
      components: Object.fromEntries(components)
    };
  }

  // Subscribe to health status changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of status changes
  notifyListeners() {
    const health = this.getDashboardHealth();
    this.listeners.forEach(listener => {
      try {
        listener(health);
      } catch (err) {
        console.error('Health monitor listener error:', err);
      }
    });
  }

  // Get critical components that are failing
  getCriticalFailures() {
    const critical = ['Interactive Map', 'Strategic Analysis', 'Intelligence Alerts'];
    return Array.from(this.componentStatus.entries())
      .filter(([name, status]) => critical.includes(name) && status.status === 'error')
      .map(([name, status]) => ({ name, ...status }));
  }

  // Export health data for monitoring
  exportHealthData() {
    return {
      timestamp: new Date().toISOString(),
      dashboard: this.getDashboardHealth(),
      components: Object.fromEntries(this.componentStatus),
      criticalFailures: this.getCriticalFailures()
    };
  }
}

// Global health monitor instance
export const healthMonitor = new ComponentHealthMonitor();

// React hook for component health monitoring
export const useComponentHealth = (componentName, healthCheckFn = null) => {
  const [status, setStatus] = React.useState(() => 
    healthMonitor.getComponentStatus(componentName)
  );

  React.useEffect(() => {
    // Register component if not already registered
    if (!healthMonitor.getComponentStatus(componentName)) {
      healthMonitor.registerComponent(componentName, healthCheckFn);
    }

    // Subscribe to health changes
    const unsubscribe = healthMonitor.subscribe((dashboardHealth) => {
      const componentStatus = dashboardHealth.components[componentName];
      setStatus(componentStatus);
    });

    return unsubscribe;
  }, [componentName, healthCheckFn]);

  const reportError = React.useCallback((error) => {
    healthMonitor.reportError(componentName, error);
  }, [componentName]);

  const markRecovered = React.useCallback(() => {
    healthMonitor.markRecovered(componentName);
  }, [componentName]);

  return {
    status,
    reportError,
    markRecovered,
    isHealthy: status?.status === 'healthy',
    hasError: status?.status === 'error'
  };
};

// React hook for dashboard health monitoring
export const useDashboardHealth = () => {
  const [health, setHealth] = React.useState(() => healthMonitor.getDashboardHealth());

  React.useEffect(() => {
    const unsubscribe = healthMonitor.subscribe(setHealth);
    return unsubscribe;
  }, []);

  return health;
};

export default healthMonitor;