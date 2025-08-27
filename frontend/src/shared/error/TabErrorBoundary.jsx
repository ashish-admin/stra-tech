import React from 'react';
import { ProductionErrorBoundary } from './ProductionErrorBoundary';
import { AlertTriangle, TrendingUp, MapPin, Users, Brain, Bell } from 'lucide-react';

/**
 * Tab-specific Error Boundary
 * Provides customized fallback UI for each dashboard tab
 */
export const TabErrorBoundary = ({ children, tabName, tabIcon }) => {
  const getTabConfig = () => {
    const configs = {
      overview: {
        icon: TrendingUp,
        title: 'Overview Tab Error',
        message: 'The overview dashboard is temporarily unavailable. Other tabs remain functional.',
        fallbackContent: (
          <div className="p-6 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Overview data is being recovered...</p>
            <p className="text-sm text-gray-500 mt-2">
              You can still access other analysis tabs while we resolve this issue.
            </p>
          </div>
        )
      },
      sentiment: {
        icon: TrendingUp,
        title: 'Sentiment Analysis Error',
        message: 'Sentiment charts are temporarily unavailable. Historical data is preserved.',
        fallbackContent: (
          <div className="p-6 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Sentiment analysis is being restored...</p>
            <p className="text-sm text-gray-500 mt-2">
              Recent sentiment data may be delayed. Historical trends remain available in other views.
            </p>
          </div>
        )
      },
      competitive: {
        icon: Users,
        title: 'Competitive Analysis Error',
        message: 'Competitive metrics are temporarily unavailable. Party data is preserved.',
        fallbackContent: (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Competitive analysis is being recalculated...</p>
            <p className="text-sm text-gray-500 mt-2">
              Party comparison data is cached and will refresh automatically.
            </p>
          </div>
        )
      },
      geographic: {
        icon: MapPin,
        title: 'Geographic View Error',
        message: 'Map visualization encountered an issue. Ward data remains accessible via other tabs.',
        fallbackContent: (
          <div className="p-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Map is being reloaded...</p>
            <p className="text-sm text-gray-500 mt-2">
              Ward selection is still available through the dropdown menu above.
            </p>
            {/* Fallback ward selector */}
            <div className="mt-4">
              <select 
                className="px-4 py-2 border border-gray-300 rounded-md"
                onChange={(e) => window.location.search = `?ward=${e.target.value}`}
              >
                <option value="">Select Ward</option>
                <option value="Jubilee Hills">Jubilee Hills</option>
                <option value="Banjara Hills">Banjara Hills</option>
                <option value="Madhapur">Madhapur</option>
                {/* Add more wards as needed */}
              </select>
            </div>
          </div>
        )
      },
      strategist: {
        icon: Brain,
        title: 'AI Strategist Error',
        message: 'AI analysis is temporarily offline. Cached insights remain available.',
        fallbackContent: (
          <div className="p-6 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">AI Strategist is reconnecting...</p>
            <p className="text-sm text-gray-500 mt-2">
              Previous analysis results are cached. New analysis will resume shortly.
            </p>
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Tip:</strong> You can still access historical AI insights from the last successful analysis.
              </p>
            </div>
          </div>
        )
      },
      alerts: {
        icon: Bell,
        title: 'Alerts Panel Error',
        message: 'Alert notifications are temporarily unavailable. Critical alerts are preserved.',
        fallbackContent: (
          <div className="p-6 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Alert system is being restored...</p>
            <p className="text-sm text-gray-500 mt-2">
              Critical alerts are queued and will be displayed once the connection is restored.
            </p>
          </div>
        )
      }
    };

    return configs[tabName] || {
      icon: AlertTriangle,
      title: 'Tab Error',
      message: 'This tab encountered an error. Please try refreshing or switching tabs.',
      fallbackContent: (
        <div className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">This section is being recovered...</p>
        </div>
      )
    };
  };

  const config = getTabConfig();
  const Icon = tabIcon || config.icon;

  return (
    <ProductionErrorBoundary
      name={`Tab-${tabName}`}
      level="tab"
      fallbackTitle={config.title}
      fallbackMessage={config.message}
      context={{ tab: tabName }}
      onError={(error, errorInfo, errorId) => {
        // Log tab-specific errors
        console.error(`Tab Error [${tabName}]:`, error);
        
        // Tab-specific error handling
        if (tabName === 'strategist') {
          // Close SSE connections if strategist tab fails
          if (window.sseManager) {
            window.sseManager.closeAll();
          }
        }
        
        if (tabName === 'geographic') {
          // Clean up map resources
          if (window.L && window.mapInstance) {
            window.mapInstance.remove();
          }
        }
      }}
    >
      {children}
    </ProductionErrorBoundary>
  );
};

/**
 * Create tab-specific error boundaries for each dashboard tab
 */
export const OverviewTabErrorBoundary = ({ children }) => (
  <TabErrorBoundary tabName="overview" tabIcon={TrendingUp}>
    {children}
  </TabErrorBoundary>
);

export const SentimentTabErrorBoundary = ({ children }) => (
  <TabErrorBoundary tabName="sentiment" tabIcon={TrendingUp}>
    {children}
  </TabErrorBoundary>
);

export const CompetitiveTabErrorBoundary = ({ children }) => (
  <TabErrorBoundary tabName="competitive" tabIcon={Users}>
    {children}
  </TabErrorBoundary>
);

export const GeographicTabErrorBoundary = ({ children }) => (
  <TabErrorBoundary tabName="geographic" tabIcon={MapPin}>
    {children}
  </TabErrorBoundary>
);

export const StrategistTabErrorBoundary = ({ children }) => (
  <TabErrorBoundary tabName="strategist" tabIcon={Brain}>
    {children}
  </TabErrorBoundary>
);

export const AlertsTabErrorBoundary = ({ children }) => (
  <TabErrorBoundary tabName="alerts" tabIcon={Bell}>
    {children}
  </TabErrorBoundary>
);

export default TabErrorBoundary;