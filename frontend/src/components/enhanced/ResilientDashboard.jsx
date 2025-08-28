import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Consolidated Error Boundary System
import { 
  CriticalComponentBoundary,
  FeatureBoundary,
  FallbackBoundary 
} from "../../shared/components/ErrorBoundary.jsx";

// Specialized Fallback Components
import { 
  LocationMapFallback,
  StrategicSummaryFallback,
  ChartFallback,
  PoliticalStrategistFallback,
  DashboardFallback
} from "../../shared/components/FallbackComponents.jsx";

// Core Components
import { LoadingSpinner, CardSkeleton } from "../ui/LoadingSkeleton.jsx";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts.js";
import { SkipNavigation, LiveRegion } from "../ui/AccessibilityEnhancements.jsx";
import { useWard } from "../../context/WardContext.jsx";
import { joinApi } from "../../lib/api";

// Enhanced lazy loaded components
import { 
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab
} from './LazyTabComponents.jsx';

// Dashboard Components
import DashboardTabs from "../DashboardTabs.jsx";
import ExecutiveSummary from "../ExecutiveSummary.jsx";
import CollapsibleSection from "../CollapsibleSection.jsx";
import LanguageSwitcher from "../LanguageSwitcher.jsx";

// SSE Integration
import { useEnhancedSSE } from "../../features/strategist/hooks/useEnhancedSSE";
import { 
  ConnectionStatusIndicator, 
  IntelligenceActivityIndicator 
} from "../../features/strategist/components/ProgressIndicators";

/**
 * RESILIENT DASHBOARD WITH CONSOLIDATED ERROR BOUNDARIES
 * 
 * This component implements the LokDarpan frontend resilience architecture:
 * - Zero cascade failures through component isolation
 * - Three-tier error boundary system (Critical/Feature/Fallback)
 * - Graceful degradation with specialized fallback UI
 * - Automatic recovery mechanisms with retry logic
 */

/** Ward normalization utility - keep in sync with backend */
function normalizeWardLabel(label) {
  if (!label) return "";
  return label.replace(/^Ward\s*\d+\s*/, "").trim();
}

export default function ResilientDashboard() {
  // Core state management
  const { selectedWard, setSelectedWard } = useWard();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [wards, setWards] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    geojson: null,
    posts: [],
    competitiveAnalysis: [],
    trends: [],
    alerts: []
  });
  
  // Error recovery state
  const [componentErrors, setComponentErrors] = useState({});
  const [systemHealth, setSystemHealth] = useState({ score: 100, status: 'healthy' });

  // Performance monitoring
  const mountTime = useRef(Date.now());
  const renderCount = useRef(0);
  
  // SSE Integration for Political Strategist
  const {
    isConnected: strategistConnected,
    data: strategistData,
    error: strategistError,
    reconnect: reconnectStrategist
  } = useEnhancedSSE({
    endpoint: selectedWard ? `/api/v1/strategist/${encodeURIComponent(selectedWard)}` : null,
    enabled: selectedWard && activeTab === 'strategist'
  });

  // Keyboard shortcuts for accessibility
  useKeyboardShortcuts({
    'ArrowLeft': () => navigateTab(-1),
    'ArrowRight': () => navigateTab(1),
    'r': () => handleRefreshDashboard(),
    'h': () => setActiveTab('overview'),
    's': () => setActiveTab('sentiment'),
    'c': () => setActiveTab('competitive'),
    'm': () => setActiveTab('geographic'),
    'a': () => setActiveTab('strategist')
  });

  // Tab navigation
  const tabs = ['overview', 'sentiment', 'competitive', 'geographic', 'strategist'];
  const navigateTab = (direction) => {
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[newIndex]);
  };

  // Data fetching with error handling
  useEffect(() => {
    let isCancelled = false;
    
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch core data concurrently
        const [geojsonRes, wardsRes] = await Promise.all([
          axios.get(joinApi("api/v1/geojson")).catch(e => ({ data: null, error: e })),
          axios.get(joinApi("api/v1/wards")).catch(e => ({ data: [], error: e }))
        ]);

        if (isCancelled) return;

        // Set core data
        if (geojsonRes.data) {
          setDashboardData(prev => ({ ...prev, geojson: geojsonRes.data }));
        }
        
        if (wardsRes.data && Array.isArray(wardsRes.data)) {
          const wardList = wardsRes.data.map(normalizeWardLabel);
          setWards(wardList);
          
          // Auto-select first ward if none selected
          if (!selectedWard && wardList.length > 0) {
            setSelectedWard(wardList[0]);
          }
        }

        // Track component health
        setSystemHealth(prev => ({
          ...prev,
          score: Math.max(95, prev.score), // Successful load improves health
          status: 'healthy'
        }));
        
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        
        // Update system health
        setSystemHealth(prev => ({
          score: Math.max(50, prev.score - 20),
          status: 'degraded',
          lastError: error.message
        }));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboardData();
    
    return () => {
      isCancelled = true;
    };
  }, [selectedWard, setSelectedWard]);

  // Ward-specific data fetching
  useEffect(() => {
    let isCancelled = false;
    
    const fetchWardData = async () => {
      if (!selectedWard) return;
      
      try {
        // Fetch ward-specific data concurrently
        const [postsRes, competitiveRes, trendsRes, alertsRes] = await Promise.all([
          axios.get(joinApi(`api/v1/posts?city=${encodeURIComponent(selectedWard)}`))
            .catch(e => ({ data: [], error: e })),
          axios.get(joinApi(`api/v1/competitive-analysis?city=${encodeURIComponent(selectedWard)}`))
            .catch(e => ({ data: [], error: e })),
          axios.get(joinApi(`api/v1/trends?ward=${encodeURIComponent(selectedWard)}&days=30`))
            .catch(e => ({ data: [], error: e })),
          axios.get(joinApi(`api/v1/alerts/${encodeURIComponent(selectedWard)}`))
            .catch(e => ({ data: [], error: e }))
        ]);

        if (isCancelled) return;

        setDashboardData(prev => ({
          ...prev,
          posts: postsRes.data || [],
          competitiveAnalysis: competitiveRes.data || [],
          trends: trendsRes.data || [],
          alerts: alertsRes.data || []
        }));
        
      } catch (error) {
        console.error('Ward data fetch error:', error);
        
        setSystemHealth(prev => ({
          ...prev,
          score: Math.max(70, prev.score - 10),
          status: 'partial'
        }));
      }
    };

    fetchWardData();
    
    return () => {
      isCancelled = true;
    };
  }, [selectedWard]);

  // Component error tracking
  const handleComponentError = (componentName, error, errorInfo) => {
    setComponentErrors(prev => ({
      ...prev,
      [componentName]: {
        error,
        errorInfo,
        timestamp: Date.now(),
        count: (prev[componentName]?.count || 0) + 1
      }
    }));

    // Update system health based on error severity
    setSystemHealth(prev => {
      let scoreReduction = 10;
      
      // Critical components have higher impact
      if (['Dashboard', 'LocationMap', 'Authentication'].includes(componentName)) {
        scoreReduction = 25;
      }
      
      return {
        ...prev,
        score: Math.max(30, prev.score - scoreReduction),
        status: prev.score < 50 ? 'critical' : prev.score < 80 ? 'degraded' : 'healthy',
        lastComponentError: componentName
      };
    });
  };

  // Component error recovery
  const handleComponentRecovery = (componentName) => {
    setComponentErrors(prev => {
      const updated = { ...prev };
      delete updated[componentName];
      return updated;
    });

    // Improve system health on recovery
    setSystemHealth(prev => ({
      ...prev,
      score: Math.min(100, prev.score + 15),
      status: prev.score > 80 ? 'healthy' : 'partial'
    }));
  };

  // Dashboard refresh
  const handleRefreshDashboard = () => {
    window.location.reload();
  };

  // Performance tracking
  useEffect(() => {
    renderCount.current += 1;
    
    // Track performance metrics
    if (renderCount.current === 1) {
      const loadTime = Date.now() - mountTime.current;
      
      if (window.trackPerformance) {
        window.trackPerformance('dashboard_load_time', loadTime);
      }
      
      // Performance-based health adjustment
      if (loadTime > 3000) {
        setSystemHealth(prev => ({
          ...prev,
          score: Math.max(80, prev.score - 10),
          performanceIssue: 'slow_load'
        }));
      }
    }
  });

  // Component memoization for performance
  const memoizedTabs = useMemo(() => ({
    overview: () => (
      <LazyOverviewTab
        selectedWard={selectedWard}
        dashboardData={dashboardData}
        systemHealth={systemHealth}
      />
    ),
    sentiment: () => (
      <LazySentimentTab
        selectedWard={selectedWard}
        trends={dashboardData.trends}
        posts={dashboardData.posts}
      />
    ),
    competitive: () => (
      <LazyCompetitiveTab
        selectedWard={selectedWard}
        competitiveData={dashboardData.competitiveAnalysis}
        trends={dashboardData.trends}
      />
    ),
    geographic: () => (
      <LazyGeographicTab
        selectedWard={selectedWard}
        onWardSelect={setSelectedWard}
        wardOptions={wards}
        geojson={dashboardData.geojson}
        mapFallback={LocationMapFallback}
      />
    ),
    strategist: () => (
      <LazyStrategistTab
        selectedWard={selectedWard}
        isConnected={strategistConnected}
        data={strategistData}
        error={strategistError}
        onReconnect={reconnectStrategist}
        fallback={PoliticalStrategistFallback}
      />
    )
  }), [
    selectedWard,
    dashboardData,
    systemHealth,
    wards,
    strategistConnected,
    strategistData,
    strategistError,
    reconnectStrategist
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading LokDarpan Dashboard...</p>
          <p className="text-sm text-gray-500">Initializing political intelligence systems</p>
        </div>
      </div>
    );
  }

  return (
    <CriticalComponentBoundary
      componentName="LokDarpan Dashboard"
      maxRetries={5}
      onError={handleComponentError}
      onRecovery={handleComponentRecovery}
      fallbackComponent={DashboardFallback}
    >
      <div className="min-h-screen bg-gray-50">
        <SkipNavigation />
        
        {/* Dashboard Header with System Health */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  LokDarpan Political Intelligence
                </h1>
                <div className="ml-4 flex items-center space-x-2">
                  <ConnectionStatusIndicator 
                    isConnected={strategistConnected && activeTab === 'strategist'} 
                  />
                  <IntelligenceActivityIndicator 
                    hasActivity={Object.keys(strategistData || {}).length > 0} 
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <LanguageSwitcher />
                <div className="text-sm text-gray-600">
                  Ward: <span className="font-medium">{selectedWard || 'None selected'}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
                  systemHealth.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  System: {systemHealth.status} ({systemHealth.score}%)
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Executive Summary - Feature Boundary */}
          <FeatureBoundary
            componentName="Executive Summary"
            maxRetries={3}
            onError={handleComponentError}
            onRecovery={handleComponentRecovery}
            alternativeContent="Ward-level political intelligence summary temporarily unavailable. Core analytics remain operational."
          >
            <ExecutiveSummary
              selectedWard={selectedWard}
              dashboardData={dashboardData}
              systemHealth={systemHealth}
            />
          </FeatureBoundary>

          {/* Dashboard Navigation Tabs */}
          <div className="mb-6">
            <DashboardTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              tabs={tabs}
              systemHealth={systemHealth}
            />
          </div>

          {/* Tab Content with Specialized Error Boundaries */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <FeatureBoundary
                componentName="Overview Tab"
                maxRetries={3}
                onError={handleComponentError}
                onRecovery={handleComponentRecovery}
              >
                {memoizedTabs.overview()}
              </FeatureBoundary>
            )}

            {activeTab === 'sentiment' && (
              <FeatureBoundary
                componentName="Sentiment Analysis"
                maxRetries={3}
                fallbackComponent={ChartFallback}
                onError={handleComponentError}
                onRecovery={handleComponentRecovery}
              >
                {memoizedTabs.sentiment()}
              </FeatureBoundary>
            )}

            {activeTab === 'competitive' && (
              <FeatureBoundary
                componentName="Competitive Analysis"
                maxRetries={3}
                fallbackComponent={ChartFallback}
                onError={handleComponentError}
                onRecovery={handleComponentRecovery}
              >
                {memoizedTabs.competitive()}
              </FeatureBoundary>
            )}

            {activeTab === 'geographic' && (
              <CriticalComponentBoundary
                componentName="Geographic Analysis"
                maxRetries={5}
                fallbackComponent={LocationMapFallback}
                onError={handleComponentError}
                onRecovery={handleComponentRecovery}
              >
                {memoizedTabs.geographic()}
              </CriticalComponentBoundary>
            )}

            {activeTab === 'strategist' && (
              <FeatureBoundary
                componentName="Political Strategist"
                maxRetries={3}
                fallbackComponent={PoliticalStrategistFallback}
                onError={handleComponentError}
                onRecovery={handleComponentRecovery}
              >
                {memoizedTabs.strategist()}
              </FeatureBoundary>
            )}
          </div>

          {/* Component Health Monitoring - Fallback Boundary */}
          <FallbackBoundary
            componentName="Health Monitor"
            compact={true}
          >
            <div className="mt-8 text-center">
              <div className="text-xs text-gray-500">
                Dashboard Health: {systemHealth.score}% | 
                Errors: {Object.keys(componentErrors).length} | 
                Render: {renderCount.current}
              </div>
            </div>
          </FallbackBoundary>
        </main>

        {/* Live Region for Screen Readers */}
        <LiveRegion 
          message={`Current ward: ${selectedWard || 'None selected'}. Tab: ${activeTab}. System health: ${systemHealth.status}.`}
        />
      </div>
    </CriticalComponentBoundary>
  );
}

// Export wrapped component with display name for debugging
ResilientDashboard.displayName = 'ResilientDashboard';

export { ResilientDashboard };