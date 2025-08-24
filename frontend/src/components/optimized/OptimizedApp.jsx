import React, { Suspense, useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { optimizedQueryClient, cacheCleanup, backgroundSync } from '../../lib/optimizedQueryClient';
import { WardProvider } from '../../context/WardContext';
import LoadingSpinner from '../ui/LoadingSpinner';

// Lazy load main components
const OptimizedDashboard = React.lazy(() => import('./OptimizedDashboard'));
const LoginForm = React.lazy(() => import('../LoginForm'));

// Error boundary for the entire app
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    
    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // window.gtag?.('event', 'exception', {
      //   description: error.toString(),
      //   fatal: true
      // });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Application Error
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Something went wrong with the LokDarpan dashboard.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Reload Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring component
const PerformanceMonitor = ({ children }) => {
  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          // Log page load performance in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Page Load Performance:', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
              firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime
            });
          }
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'measure'] });

    return () => observer.disconnect();
  }, []);

  return children;
};

// Cache management component
const CacheManager = ({ children }) => {
  const [syncIntervals, setSyncIntervals] = useState([]);

  useEffect(() => {
    // Initialize cache cleanup
    const cleanup = cacheCleanup(optimizedQueryClient);
    const bgSync = backgroundSync(optimizedQueryClient);
    
    // Set up periodic cache cleanup (every 10 minutes)
    const cleanupInterval = setInterval(() => {
      cleanup.cleanupPosts();
      
      // Log cache statistics in development
      if (process.env.NODE_ENV === 'development') {
        const stats = cleanup.getCacheStats();
        console.log('Cache Stats:', stats);
        
        // Warn if cache is getting too large (> 10MB)
        if (stats.cacheSize > 10 * 1024 * 1024) {
          console.warn('Cache size is large:', (stats.cacheSize / 1024 / 1024).toFixed(2) + 'MB');
        }
      }
    }, 10 * 60 * 1000);

    // Store cleanup interval for cleanup
    setSyncIntervals(prev => [...prev, cleanupInterval]);

    return () => {
      // Cleanup all intervals
      syncIntervals.forEach(interval => clearInterval(interval));
      clearInterval(cleanupInterval);
    };
  }, []);

  return children;
};

// Main optimized app component
const OptimizedApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  
  // Check authentication status on app load
  useEffect(() => {
    // Simulate auth check - replace with actual auth logic
    const checkAuth = async () => {
      try {
        // This should be replaced with actual auth check
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Show loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading LokDarpan...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <LoginForm onLogin={() => setIsAuthenticated(true)} />
        </Suspense>
      </div>
    );
  }

  // Main authenticated app
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={optimizedQueryClient}>
        <PerformanceMonitor>
          <CacheManager>
            <WardProvider>
              <div className="min-h-screen bg-gray-50">
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <LoadingSpinner size="lg" />
                      <p className="mt-4 text-gray-600">Loading Political Intelligence Dashboard...</p>
                    </div>
                  </div>
                }>
                  <OptimizedDashboard />
                </Suspense>
              </div>
            </WardProvider>
          </CacheManager>
        </PerformanceMonitor>
        
        {/* React Query DevTools (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools 
            initialIsOpen={false} 
            toggleButtonProps={{
              style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                fontSize: '18px',
                cursor: 'pointer',
                zIndex: 99999
              }
            }}
          />
        )}
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default OptimizedApp;