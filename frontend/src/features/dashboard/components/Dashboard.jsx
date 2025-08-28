/**
 * Enhanced Dashboard Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Main dashboard orchestrator with optimized performance, lazy loading,
 * and enhanced error handling for the political intelligence platform.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

// Shared components and hooks
import { 
  EnhancedCard, 
  LoadingSkeleton 
} from "@shared/components/ui";
import {
  DashboardErrorBoundary,
  MapErrorBoundary,
  ChartErrorBoundary,
  StrategistErrorBoundary,
  NavigationErrorBoundary,
  useErrorMonitoring
} from "@shared/components/ui/EnhancedErrorBoundaries";
import { 
  useEnhancedQuery,
  useWardData,
  useTrendsData
} from "@shared/hooks/api";
import { queryKeys } from "@shared/services/cache";

// Feature components (lazy loaded)
import { LazyFeatures } from "@shared/components/lazy";

// Context and utilities
import { useWard } from "@shared/context/WardContext";

// Dashboard-specific components
import DashboardTabs from "./DashboardTabs";
import ExecutiveSummary from "./ExecutiveSummary";
import DashboardHealthIndicator from "../../../components/DashboardHealthIndicator";

/**
 * Enhanced Dashboard with lazy loading and performance optimizations
 */
const Dashboard = () => {
  const { selectedWard, setSelectedWard, availableWards } = useWard();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Performance refs
  const dashboardRef = useRef(null);
  const mountTimeRef = useRef(Date.now());
  
  // Enhanced error monitoring for dashboard resilience
  useErrorMonitoring('LokDarpan Dashboard');

  // Enhanced data fetching with React Query
  const {
    data: wardData,
    isLoading: wardLoading,
    error: wardError
  } = useWardData(selectedWard?.id, {
    enabled: !!selectedWard?.id,
    staleTime: 10 * 60 * 1000 // 10 minutes for ward metadata
  });

  const {
    data: trendsData,
    isLoading: trendsLoading,
    error: trendsError,
    utils: trendsUtils
  } = useTrendsData(selectedWard?.name, 30, {
    enabled: !!selectedWard?.name,
    staleTime: 2 * 60 * 1000 // 2 minutes for trends
  });

  // Computed loading state
  const isDataLoading = useMemo(() => 
    wardLoading || trendsLoading || isLoading,
    [wardLoading, trendsLoading, isLoading]
  );

  // Computed error state
  const hasErrors = useMemo(() => 
    !!(wardError || trendsError || Object.keys(errors).length > 0),
    [wardError, trendsError, errors]
  );

  // Ward selection handler with optimizations
  const handleWardChange = useMemo(() => (newWard) => {
    if (newWard?.id === selectedWard?.id) return;
    
    setIsLoading(true);
    setErrors({});
    
    // Update ward context
    setSelectedWard(newWard);
    
    // Prefetch related data
    if (newWard?.id) {
      trendsUtils.prefetch(
        queryKeys.trends.emotions({ ward: newWard.name, days: 7 }),
        () => import("@shared/services/api").then(api => 
          api.lokDarpanApi.trends.getEmotions({ ward: newWard.name, days: 7 })
        )
      );
    }
    
    setTimeout(() => setIsLoading(false), 500);
  }, [selectedWard, setSelectedWard, trendsUtils]);

  // Error handler
  const handleError = useMemo(() => (error, componentName) => {
    console.error(`[Dashboard Error] ${componentName}:`, error);
    setErrors(prev => ({
      ...prev,
      [componentName]: error
    }));
  }, []);

  // Clear error handler
  const clearError = useMemo(() => (componentName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[componentName];
      return newErrors;
    });
  }, []);

  // Performance monitoring
  useEffect(() => {
    const loadTime = Date.now() - mountTimeRef.current;
    if (loadTime > 3000) {
      console.warn(`[Dashboard Performance] Slow load: ${loadTime}ms`);
    }
  }, []);

  // Tab configuration with lazy loading and granular error boundaries
  const tabConfig = useMemo(() => [
    {
      id: "overview",
      label: "Overview",
      component: (props) => (
        <DashboardErrorBoundary componentName="Dashboard Overview">
          <LazyFeatures.Dashboard
            {...props}
            wardData={wardData}
            trendsData={trendsData}
            onError={(error) => handleError(error, 'overview')}
          />
        </DashboardErrorBoundary>
      )
    },
    {
      id: "analytics",
      label: "Analytics",
      component: (props) => (
        <div className="space-y-6">
          <ChartErrorBoundary componentName="Time Series Chart" chartType="Time Series">
            <LazyFeatures.TimeSeriesChart
              ward={selectedWard?.name}
              data={trendsData}
              {...props}
              onError={(error) => handleError(error, 'timeseries')}
            />
          </ChartErrorBoundary>
          <ChartErrorBoundary componentName="Competitor Analysis Chart" chartType="Competitor Trends">
            <LazyFeatures.CompetitorTrendChart
              ward={selectedWard?.name}
              {...props}
              onError={(error) => handleError(error, 'competitor')}
            />
          </ChartErrorBoundary>
        </div>
      )
    },
    {
      id: "geographic",
      label: "Geographic",
      component: (props) => (
        <MapErrorBoundary componentName="Interactive Ward Map">
          <LazyFeatures.LocationMap
            selectedWard={selectedWard}
            onWardSelect={handleWardChange}
            {...props}
            onError={(error) => handleError(error, 'map')}
          />
        </MapErrorBoundary>
      )
    },
    {
      id: "strategist",
      label: "Political Strategist",
      component: (props) => (
        <StrategistErrorBoundary componentName="AI Political Strategist">
          <LazyFeatures.PoliticalStrategist
            ward={selectedWard?.name}
            {...props}
            onError={(error) => handleError(error, 'strategist')}
          />
        </StrategistErrorBoundary>
      )
    },
    {
      id: "timeline",
      label: "Timeline",
      component: (props) => (
        <ChartErrorBoundary componentName="Strategic Timeline" chartType="Timeline Visualization">
          <LazyFeatures.StrategicTimeline
            ward={selectedWard?.name}
            enableSSE={true}
            showControls={true}
            height={500}
            {...props}
            onError={(error) => handleError(error, 'timeline')}
            onEventSelect={(event) => console.log('Timeline event selected:', event)}
            onTimeRangeChange={(range) => console.log('Timeline range changed:', range)}
          />
        </ChartErrorBoundary>
      )
    }
  ], [wardData, trendsData, selectedWard, handleWardChange, handleError]);

  // Dashboard error fallback
  const DashboardErrorFallback = ({ error, resetErrorBoundary }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto mt-20">
        <EnhancedCard
          variant="alert"
          title="Dashboard Error"
          subtitle="The dashboard encountered an unexpected error"
        >
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </EnhancedCard>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      FallbackComponent={DashboardErrorFallback}
      onError={(error, errorInfo) => {
        console.error('[Dashboard Fatal Error]', { error, errorInfo });
      }}
    >
      <div 
        ref={dashboardRef}
        className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
      >
        {/* Dashboard Header */}
        <NavigationErrorBoundary componentName="Dashboard Header">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    LokDarpan
                  </h1>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Political Intelligence Dashboard
                  </span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <DashboardHealthIndicator 
                    isLoading={isDataLoading}
                    hasErrors={hasErrors}
                    errorCount={Object.keys(errors).length}
                  />
                  
                  {/* Ward Selector */}
                  {availableWards.length > 0 && (
                    <select
                      value={selectedWard?.id || ''}
                      onChange={(e) => {
                        const ward = availableWards.find(w => w.id === e.target.value);
                        handleWardChange(ward);
                      }}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Ward</option>
                      {availableWards.map(ward => (
                        <option key={ward.id} value={ward.id}>
                          {ward.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </header>
        </NavigationErrorBoundary>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Executive Summary */}
          {selectedWard && (
            <div className="mb-8">
              <DashboardErrorBoundary componentName="Executive Summary">
                <ExecutiveSummary 
                  ward={selectedWard}
                  data={wardData}
                  trends={trendsData}
                  loading={isDataLoading}
                />
              </DashboardErrorBoundary>
            </div>
          )}

          {/* Dashboard Tabs */}
          <div className="space-y-6">
            <NavigationErrorBoundary componentName="Dashboard Tabs">
              <DashboardTabs
                tabs={tabConfig}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                loading={isDataLoading}
              />
            </NavigationErrorBoundary>

            {/* Tab Content */}
            <div className="tab-content">
              {selectedWard ? (
                <DashboardErrorBoundary 
                  componentName={`${activeTab} Tab Content`}
                  key={activeTab} // Reset boundary when tab changes
                >
                  {tabConfig.find(tab => tab.id === activeTab)?.component({
                    ward: selectedWard,
                    loading: isDataLoading,
                    onError: handleError
                  })}
                </DashboardErrorBoundary>
              ) : (
                <EnhancedCard title="Welcome to LokDarpan">
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Select a Ward to Begin
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose a ward from the dropdown above to start analyzing political intelligence data.
                    </p>
                  </div>
                </EnhancedCard>
              )}
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;