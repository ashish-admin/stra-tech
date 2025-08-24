import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, WifiOff, Server, ServerCrash, Clock, AlertTriangle, 
  Activity, RefreshCw, CheckCircle, XCircle 
} from 'lucide-react';

/**
 * Network Failure Simulator for testing LokDarpan dashboard resilience
 * against various network conditions and API failures that could occur
 * in real-world political campaign environments.
 */

// Network failure scenarios
const NETWORK_SCENARIOS = [
  {
    id: 'complete-offline',
    name: 'Complete Network Loss',
    description: 'Simulates complete internet connectivity loss',
    duration: 10000,
    severity: 'critical',
    simulate: () => {
      // Override navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Block all fetch requests
      const originalFetch = window.fetch;
      window.fetch = () => Promise.reject(new Error('Network Error: No internet connection'));
      
      return () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });
        window.fetch = originalFetch;
      };
    }
  },
  
  {
    id: 'slow-network',
    name: 'Slow Network (3G)',
    description: 'Simulates slow network conditions typical in campaign field offices',
    duration: 15000,
    severity: 'medium',
    simulate: () => {
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        // Add 3-8 second delay to simulate slow network
        const delay = 3000 + Math.random() * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return originalFetch(...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  },
  
  {
    id: 'intermittent-connectivity',
    name: 'Intermittent Connectivity',
    description: 'Network drops in and out randomly',
    duration: 20000,
    severity: 'high',
    simulate: () => {
      const originalFetch = window.fetch;
      let failureRate = 0.4; // 40% of requests fail
      
      window.fetch = async (...args) => {
        if (Math.random() < failureRate) {
          throw new Error('Network Error: Connection unstable');
        }
        
        // Random delay between 100ms and 3000ms
        const delay = 100 + Math.random() * 2900;
        await new Promise(resolve => setTimeout(resolve, delay));
        return originalFetch(...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  },
  
  {
    id: 'api-server-down',
    name: 'API Server Unavailable',
    description: 'Backend API server returns 503 Service Unavailable',
    duration: 12000,
    severity: 'critical',
    simulate: () => {
      const originalFetch = window.fetch;
      
      window.fetch = async (url, ...args) => {
        // Only intercept API calls
        if (typeof url === 'string' && url.includes('/api/')) {
          throw new Error('503 Service Unavailable: API server down for maintenance');
        }
        return originalFetch(url, ...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  },
  
  {
    id: 'api-timeout',
    name: 'API Request Timeouts',
    description: 'API requests timeout after 30 seconds',
    duration: 15000,
    severity: 'high',
    simulate: () => {
      const originalFetch = window.fetch;
      
      window.fetch = async (url, ...args) => {
        if (typeof url === 'string' && url.includes('/api/')) {
          // Simulate timeout
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Request Timeout: API call exceeded 30 seconds'));
            }, 30000);
          });
        }
        return originalFetch(url, ...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  },
  
  {
    id: 'partial-api-failure',
    name: 'Partial API Service Degradation',
    description: 'Some API endpoints fail while others work',
    duration: 18000,
    severity: 'medium',
    simulate: () => {
      const originalFetch = window.fetch;
      const failingEndpoints = ['/api/v1/trends', '/api/v1/strategist', '/api/v1/pulse'];
      
      window.fetch = async (url, ...args) => {
        if (typeof url === 'string' && failingEndpoints.some(endpoint => url.includes(endpoint))) {
          // 70% chance of failure for these endpoints
          if (Math.random() < 0.7) {
            throw new Error(`Service Degraded: ${url} temporarily unavailable`);
          }
        }
        
        return originalFetch(url, ...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  },
  
  {
    id: 'cors-error',
    name: 'CORS Policy Errors',
    description: 'Cross-origin request errors typical in deployment issues',
    duration: 8000,
    severity: 'high',
    simulate: () => {
      const originalFetch = window.fetch;
      
      window.fetch = async (url, ...args) => {
        if (typeof url === 'string' && url.includes('/api/')) {
          throw new Error('CORS Error: Cross-origin request blocked by browser policy');
        }
        return originalFetch(url, ...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  }
];

// Network monitoring hook
const useNetworkMonitoring = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    effectiveType: null,
    downlink: null,
    rtt: null,
    lastChecked: Date.now()
  });
  
  useEffect(() => {
    const updateOnlineStatus = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        lastChecked: Date.now()
      }));
    };
    
    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        setNetworkStatus(prev => ({
          ...prev,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          lastChecked: Date.now()
        }));
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Update connection info if available
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo(); // Initial check
    }
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);
  
  return networkStatus;
};

// API failure detector
const useAPIFailureDetection = () => {
  const [apiStatus, setApiStatus] = useState({
    healthy: true,
    failedEndpoints: [],
    lastFailure: null,
    consecutiveFailures: 0,
    averageResponseTime: 0
  });
  
  const responseTimes = useRef([]);
  
  const reportAPICall = (endpoint, success, responseTime, error = null) => {
    setApiStatus(prev => {
      const newFailedEndpoints = success 
        ? prev.failedEndpoints.filter(ep => ep !== endpoint)
        : prev.failedEndpoints.includes(endpoint) 
          ? prev.failedEndpoints 
          : [...prev.failedEndpoints, endpoint];
      
      // Update response times
      if (success && responseTime) {
        responseTimes.current = [...responseTimes.current, responseTime].slice(-20);
      }
      
      const avgResponseTime = responseTimes.current.length > 0
        ? responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length
        : 0;
      
      return {
        healthy: newFailedEndpoints.length === 0,
        failedEndpoints: newFailedEndpoints,
        lastFailure: success ? prev.lastFailure : { endpoint, error: error?.message, timestamp: Date.now() },
        consecutiveFailures: success ? 0 : prev.consecutiveFailures + 1,
        averageResponseTime: avgResponseTime
      };
    });
  };
  
  return { apiStatus, reportAPICall };
};

export default function NetworkFailureSimulator() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [scenarioProgress, setScenarioProgress] = useState(0);
  const [testResults, setTestResults] = useState([]);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  
  const networkStatus = useNetworkMonitoring();
  const { apiStatus, reportAPICall } = useAPIFailureDetection();
  
  const cleanupRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // Monitor fetch calls to detect API failures
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const responseTime = Date.now() - startTime;
        
        if (url.includes('/api/')) {
          reportAPICall(url, response.ok, responseTime);
        }
        
        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        if (url.includes('/api/')) {
          reportAPICall(url, false, responseTime, error);
        }
        
        throw error;
      }
    };
    
    return () => {
      if (window.fetch !== originalFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [reportAPICall]);
  
  const runScenario = async (scenario) => {
    setActiveScenario(scenario);
    setScenarioProgress(0);
    
    const startTime = Date.now();
    
    // Start the scenario simulation
    cleanupRef.current = scenario.simulate();
    
    // Progress tracking
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / scenario.duration) * 100, 100);
      setScenarioProgress(progress);
      
      if (progress >= 100) {
        clearInterval(progressIntervalRef.current);
      }
    }, 100);
    
    // Auto-cleanup after duration
    setTimeout(() => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      
      setActiveScenario(null);
      setScenarioProgress(0);
      
      // Record test result
      setTestResults(prev => [...prev, {
        id: `${scenario.id}-${Date.now()}`,
        scenario: scenario.name,
        startTime,
        endTime: Date.now(),
        duration: scenario.duration,
        networkStatusDuring: networkStatus,
        apiStatusDuring: apiStatus
      }]);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, scenario.duration);
  };
  
  const stopScenario = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    setActiveScenario(null);
    setScenarioProgress(0);
  };
  
  const runBatchTests = async () => {
    setIsRunningBatch(true);
    setTestResults([]);
    
    for (const scenario of NETWORK_SCENARIOS) {
      await new Promise((resolve) => {
        runScenario(scenario);
        
        // Wait for scenario to complete plus buffer
        setTimeout(resolve, scenario.duration + 2000);
      });
    }
    
    setIsRunningBatch(false);
  };
  
  const clearResults = () => {
    setTestResults([]);
  };
  
  const getNetworkStatusIcon = (isOnline) => {
    return isOnline ? (
      <Wifi className="h-5 w-5 text-green-500" />
    ) : (
      <WifiOff className="h-5 w-5 text-red-500" />
    );
  };
  
  const getAPIStatusIcon = (healthy) => {
    return healthy ? (
      <Server className="h-5 w-5 text-green-500" />
    ) : (
      <ServerCrash className="h-5 w-5 text-red-500" />
    );
  };
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="h-6 w-6 mr-2 text-blue-500" />
              Network Failure Simulator
            </h1>
            <p className="text-gray-600 mt-1">
              Test LokDarpan dashboard resilience against network connectivity issues and API failures
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={runBatchTests}
              disabled={isRunningBatch || activeScenario}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Run All Tests
            </button>
            
            <button
              onClick={clearResults}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
        </div>
      </div>
      
      {/* Network Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Network Status */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Network Status</h3>
            {getNetworkStatusIcon(networkStatus.isOnline)}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Connection:</span>
              <span className={networkStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
                {networkStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {networkStatus.effectiveType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Network Type:</span>
                <span className="text-gray-900">{networkStatus.effectiveType}</span>
              </div>
            )}
            
            {networkStatus.downlink && (
              <div className="flex justify-between">
                <span className="text-gray-600">Download Speed:</span>
                <span className="text-gray-900">{networkStatus.downlink} Mbps</span>
              </div>
            )}
            
            {networkStatus.rtt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Round Trip Time:</span>
                <span className="text-gray-900">{networkStatus.rtt} ms</span>
              </div>
            )}
          </div>
        </div>
        
        {/* API Status */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">API Status</h3>
            {getAPIStatusIcon(apiStatus.healthy)}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Health Status:</span>
              <span className={apiStatus.healthy ? 'text-green-600' : 'text-red-600'}>
                {apiStatus.healthy ? 'Healthy' : 'Degraded'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Failed Endpoints:</span>
              <span className="text-gray-900">{apiStatus.failedEndpoints.length}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Consecutive Failures:</span>
              <span className="text-gray-900">{apiStatus.consecutiveFailures}</span>
            </div>
            
            {apiStatus.averageResponseTime > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Response Time:</span>
                <span className="text-gray-900">{Math.round(apiStatus.averageResponseTime)}ms</span>
              </div>
            )}
            
            {apiStatus.lastFailure && (
              <div className="mt-3 p-2 bg-red-50 rounded text-xs">
                <div className="font-medium text-red-800">Last Failure:</div>
                <div className="text-red-600">{apiStatus.lastFailure.error}</div>
                <div className="text-red-500 mt-1">
                  {new Date(apiStatus.lastFailure.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Active Scenario Status */}
      {activeScenario && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">Running: {activeScenario.name}</h3>
              <p className="text-sm text-gray-600">{activeScenario.description}</p>
            </div>
            
            <button
              onClick={stopScenario}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Stop Test
            </button>
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(scenarioProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${scenarioProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Duration: {activeScenario.duration / 1000}s | 
            Severity: <span className={`px-1 rounded ${getSeverityColor(activeScenario.severity)} border`}>
              {activeScenario.severity}
            </span>
          </div>
        </div>
      )}
      
      {/* Network Scenarios */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Network Failure Scenarios</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NETWORK_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-900">{scenario.name}</h4>
                <span className={`px-2 py-1 text-xs rounded border ${getSeverityColor(scenario.severity)}`}>
                  {scenario.severity}
                </span>
              </div>
              
              <p className="text-xs text-gray-600 mb-3">{scenario.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {scenario.duration / 1000}s duration
                </span>
                
                <button
                  onClick={() => runScenario(scenario)}
                  disabled={activeScenario || isRunningBatch}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
          
          <div className="space-y-3">
            {testResults.map((result) => (
              <div key={result.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{result.scenario}</h4>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {Math.round(result.duration / 1000)}s
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600">
                  Completed: {new Date(result.endTime).toLocaleTimeString()}
                </div>
                
                {result.apiStatusDuring.failedEndpoints.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    Failed endpoints detected during test
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Testing Instructions</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Run individual scenarios to test specific failure conditions</p>
          <p>• Use "Run All Tests" to execute a comprehensive test suite</p>
          <p>• Monitor the dashboard components during tests to verify error boundaries work correctly</p>
          <p>• Check that failed components don't crash the entire dashboard</p>
          <p>• Verify that recovery mechanisms restore functionality after scenarios complete</p>
        </div>
      </div>
    </div>
  );
}