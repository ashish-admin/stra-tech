import React from 'react';

/**
 * Political Intelligence Skeleton Components for LokDarpan Dashboard
 * 
 * Features:
 * - Political context-aware loading states
 * - Campaign-specific visual patterns
 * - Accessibility-compliant skeleton designs
 * - Mobile-optimized layouts for campaign teams
 * - Performance-optimized animations
 */

/**
 * Base Skeleton Component with Political Intelligence Theming
 */
function BaseSkeleton({ 
  className = '', 
  animate = true, 
  intensity = 'normal',
  shape = 'rounded',
  height = 'h-4',
  width = 'w-full'
}) {
  const animationClass = animate ? {
    'subtle': 'animate-pulse opacity-70',
    'normal': 'animate-pulse',
    'urgent': 'animate-pulse animate-bounce'
  }[intensity] : '';

  const shapeClass = {
    'rounded': 'rounded',
    'rounded-lg': 'rounded-lg',
    'rounded-full': 'rounded-full',
    'square': ''
  }[shape];

  return (
    <div 
      className={`bg-gray-200 ${height} ${width} ${shapeClass} ${animationClass} ${className}`}
      role="status"
      aria-label="Loading content..."
    />
  );
}

/**
 * Political Intelligence Summary Skeleton
 * Used for strategic summaries, ward profiles, and intelligence briefings
 */
export function PoliticalIntelligenceSkeleton({ 
  className = '',
  showHeader = true,
  showMetrics = true,
  showRecommendations = true,
  urgent = false
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} role="status">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BaseSkeleton 
              shape="rounded-full" 
              height="h-8" 
              width="w-8" 
              intensity={urgent ? 'urgent' : 'normal'}
            />
            <div className="space-y-2">
              <BaseSkeleton height="h-5" width="w-48" />
              <BaseSkeleton height="h-3" width="w-32" />
            </div>
          </div>
          <BaseSkeleton shape="rounded-full" height="h-6" width="w-6" />
        </div>
      )}

      {/* Intelligence Summary Block */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <BaseSkeleton height="h-4" width="w-full" className="mb-2" />
        <BaseSkeleton height="h-4" width="w-5/6" className="mb-2" />
        <BaseSkeleton height="h-4" width="w-4/5" />
      </div>

      {showMetrics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="text-center">
              <BaseSkeleton height="h-8" width="w-16" className="mx-auto mb-2" />
              <BaseSkeleton height="h-3" width="w-12" className="mx-auto" />
            </div>
          ))}
        </div>
      )}

      {showRecommendations && (
        <div className="space-y-3">
          <BaseSkeleton height="h-4" width="w-40" className="mb-4" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <BaseSkeleton shape="rounded-full" height="h-4" width="w-4" className="mt-0.5" />
              <BaseSkeleton height="h-4" width={`w-${5 - i}/6`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Political Chart Skeleton
 * Optimized for sentiment analysis, party comparison, and trend visualization
 */
export function PoliticalChartSkeleton({ 
  className = '',
  chartType = 'line',
  showLegend = true,
  showTitle = true,
  height = 'h-64',
  politicalContext = 'sentiment' // sentiment, competition, trends, demographics
}) {
  const getChartPattern = () => {
    switch (chartType) {
      case 'bar':
        return Array.from({ length: 6 }, (_, i) => (
          <BaseSkeleton 
            key={i} 
            height={`h-${Math.floor(Math.random() * 20) + 20}`} 
            width="w-8" 
            className="mx-1" 
          />
        ));
      case 'pie':
        return <BaseSkeleton shape="rounded-full" height="h-32" width="w-32" className="mx-auto" />;
      case 'line':
      default:
        return (
          <div className="relative h-full">
            {/* Chart area */}
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
              {Array.from({ length: 8 }, (_, i) => (
                <BaseSkeleton 
                  key={i} 
                  height={`h-${Math.floor(Math.random() * 16) + 8}`} 
                  width="w-2" 
                />
              ))}
            </div>
            {/* Trend line simulation */}
            <BaseSkeleton 
              height="h-0.5" 
              width="w-full" 
              className="absolute bottom-1/2 left-0 transform rotate-12" 
            />
          </div>
        );
    }
  };

  const getPoliticalColors = () => {
    switch (politicalContext) {
      case 'sentiment':
        return 'bg-green-100 border-green-200';
      case 'competition':
        return 'bg-red-100 border-red-200';
      case 'trends':
        return 'bg-blue-100 border-blue-200';
      case 'demographics':
        return 'bg-purple-100 border-purple-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} role="status">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <BaseSkeleton height="h-6" width="w-48" />
          <BaseSkeleton shape="rounded" height="h-8" width="w-20" />
        </div>
      )}

      <div className={`${getPoliticalColors()} rounded-lg p-4 ${height} relative overflow-hidden`}>
        {getChartPattern()}
      </div>

      {showLegend && (
        <div className="flex items-center justify-center space-x-4 mt-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <BaseSkeleton shape="rounded-full" height="h-3" width="w-3" />
              <BaseSkeleton height="h-3" width="w-16" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Ward Map Skeleton
 * Specialized for geographic visualization and ward selection
 */
export function WardMapSkeleton({ 
  className = '',
  height = 400,
  showControls = true,
  showLegend = true
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`} role="status">
      {showControls && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <BaseSkeleton height="h-8" width="w-40" />
            <div className="flex space-x-2">
              <BaseSkeleton shape="rounded" height="h-8" width="w-8" />
              <BaseSkeleton shape="rounded" height="h-8" width="w-8" />
              <BaseSkeleton shape="rounded" height="h-8" width="w-8" />
            </div>
          </div>
        </div>
      )}

      <div 
        className="bg-blue-50 relative overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {/* Map base */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200" />
        
        {/* Ward boundaries simulation */}
        {Array.from({ length: 12 }, (_, i) => (
          <BaseSkeleton
            key={i}
            className={`absolute bg-blue-300 opacity-60`}
            height="h-8"
            width="w-12"
            style={{
              top: `${Math.random() * 70 + 10}%`,
              left: `${Math.random() * 70 + 10}%`,
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          />
        ))}

        {/* Center loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <BaseSkeleton 
              shape="rounded-full" 
              height="h-8" 
              width="w-8" 
              intensity="urgent" 
              className="mx-auto mb-2" 
            />
            <BaseSkeleton height="h-3" width="w-32" />
          </div>
        </div>
      </div>

      {showLegend && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <BaseSkeleton shape="rounded-full" height="h-3" width="w-3" />
                  <BaseSkeleton height="h-3" width="w-16" />
                </div>
              ))}
            </div>
            <BaseSkeleton height="h-3" width="w-24" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * News Feed Skeleton
 * For political news, alerts, and intelligence feeds
 */
export function PoliticalNewsFeedSkeleton({ 
  className = '',
  itemCount = 5,
  showImages = true,
  urgent = false
}) {
  return (
    <div className={`space-y-4 ${className}`} role="status">
      {Array.from({ length: itemCount }, (_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            {showImages && (
              <BaseSkeleton 
                shape="rounded-lg" 
                height="h-12" 
                width="w-12" 
                className="flex-shrink-0"
                intensity={urgent ? 'urgent' : 'normal'}
              />
            )}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <BaseSkeleton height="h-4" width="w-24" />
                  {urgent && (
                    <BaseSkeleton 
                      shape="rounded-full" 
                      height="h-2" 
                      width="w-2" 
                      intensity="urgent"
                      className="bg-red-400" 
                    />
                  )}
                </div>
                <BaseSkeleton height="h-3" width="w-16" />
              </div>

              {/* Content */}
              <div className="space-y-2 mb-3">
                <BaseSkeleton height="h-4" width="w-full" />
                <BaseSkeleton height="h-4" width="w-4/5" />
                {Math.random() > 0.5 && <BaseSkeleton height="h-4" width="w-3/5" />}
              </div>

              {/* Meta information */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <BaseSkeleton height="h-3" width="w-16" />
                  <BaseSkeleton height="h-3" width="w-20" />
                  <BaseSkeleton height="h-3" width="w-14" />
                </div>
                <BaseSkeleton height="h-6" width="w-16" shape="rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Strategist Analysis Skeleton
 * For AI-powered political analysis and recommendations
 */
export function StrategistAnalysisSkeleton({ 
  className = '',
  showProgress = true,
  analysisDepth = 'standard' // quick, standard, deep
}) {
  const getAnalysisBlocks = () => {
    switch (analysisDepth) {
      case 'quick':
        return 2;
      case 'deep':
        return 5;
      case 'standard':
      default:
        return 3;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`} role="status">
      {/* Header with AI indicator */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BaseSkeleton 
            shape="rounded-full" 
            height="h-10" 
            width="w-10" 
            intensity="urgent"
            className="bg-blue-300" 
          />
          <div className="flex-1">
            <BaseSkeleton height="h-5" width="w-56" className="mb-1" />
            <BaseSkeleton height="h-3" width="w-40" />
          </div>
        </div>

        {showProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <BaseSkeleton height="h-3" width="w-32" />
              <BaseSkeleton height="h-3" width="w-12" />
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <BaseSkeleton 
                height="h-2" 
                width="w-3/4" 
                className="bg-blue-400 rounded-full" 
                animate={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Analysis blocks */}
      <div className="p-6 space-y-6">
        {Array.from({ length: getAnalysisBlocks() }, (_, i) => (
          <div key={i} className="border-l-4 border-blue-200 pl-4">
            <BaseSkeleton height="h-4" width="w-48" className="mb-3" />
            <div className="space-y-2">
              <BaseSkeleton height="h-3" width="w-full" />
              <BaseSkeleton height="h-3" width="w-5/6" />
              <BaseSkeleton height="h-3" width="w-4/5" />
            </div>
          </div>
        ))}

        {/* Recommendations section */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <BaseSkeleton height="h-4" width="w-36" className="mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <BaseSkeleton 
                  shape="rounded-full" 
                  height="h-4" 
                  width="w-4" 
                  className="mt-0.5 bg-green-300" 
                />
                <BaseSkeleton height="h-3" width="w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Performance Metrics Skeleton
 * For dashboard analytics and campaign performance indicators
 */
export function PerformanceMetricsSkeleton({ 
  className = '',
  metricCount = 4,
  showTrends = true,
  layout = 'grid' // grid, horizontal, vertical
}) {
  const layoutClass = {
    'grid': `grid grid-cols-2 lg:grid-cols-${metricCount} gap-4`,
    'horizontal': 'flex space-x-4 overflow-x-auto',
    'vertical': 'space-y-4'
  }[layout];

  return (
    <div className={`${layoutClass} ${className}`} role="status">
      {Array.from({ length: metricCount }, (_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 min-w-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <BaseSkeleton height="h-3" width="w-16" />
            <BaseSkeleton 
              shape="rounded-full" 
              height="h-4" 
              width="w-4" 
              className={i % 2 === 0 ? 'bg-green-300' : 'bg-red-300'} 
            />
          </div>
          
          <BaseSkeleton height="h-8" width="w-20" className="mb-2" />
          
          {showTrends && (
            <div className="flex items-center space-x-1">
              <BaseSkeleton 
                shape="rounded" 
                height="h-3" 
                width="w-8" 
                className={i % 3 === 0 ? 'bg-green-300' : 'bg-red-300'} 
              />
              <BaseSkeleton height="h-2" width="w-12" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Campaign Activity Timeline Skeleton
 * For political events, rallies, and campaign milestones
 */
export function CampaignTimelineSkeleton({ 
  className = '',
  eventCount = 6,
  showDates = true
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} role="status">
      <BaseSkeleton height="h-6" width="w-48" className="mb-6" />
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-6">
          {Array.from({ length: eventCount }, (_, i) => (
            <div key={i} className="relative flex items-start space-x-4">
              <BaseSkeleton 
                shape="rounded-full" 
                height="h-12" 
                width="w-12" 
                className="relative z-10 bg-blue-300"
              />
              
              <div className="flex-1 min-w-0">
                {showDates && (
                  <BaseSkeleton height="h-3" width="w-24" className="mb-1" />
                )}
                <BaseSkeleton height="h-4" width="w-3/4" className="mb-2" />
                <BaseSkeleton height="h-3" width="w-full" className="mb-1" />
                <BaseSkeleton height="h-3" width="w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-Optimized Skeleton Variants
 * Responsive skeleton components for campaign teams on mobile devices
 */
export function MobilePoliticalSkeleton({ 
  component = 'intelligence',
  className = ''
}) {
  switch (component) {
    case 'intelligence':
      return (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
          <BaseSkeleton height="h-5" width="w-3/4" className="mb-3" />
          <BaseSkeleton height="h-3" width="w-full" className="mb-2" />
          <BaseSkeleton height="h-3" width="w-4/5" className="mb-4" />
          <div className="flex space-x-3">
            <BaseSkeleton height="h-8" width="w-16" />
            <BaseSkeleton height="h-8" width="w-16" />
          </div>
        </div>
      );
      
    case 'chart':
      return (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
          <BaseSkeleton height="h-4" width="w-1/2" className="mb-4" />
          <BaseSkeleton height="h-32" width="w-full" className="mb-2" />
          <div className="flex justify-center space-x-3">
            {Array.from({ length: 3 }, (_, i) => (
              <BaseSkeleton key={i} height="h-2" width="w-12" />
            ))}
          </div>
        </div>
      );
      
    case 'news':
      return (
        <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
          <div className="flex space-x-3">
            <BaseSkeleton shape="rounded-lg" height="h-10" width="w-10" />
            <div className="flex-1 min-w-0">
              <BaseSkeleton height="h-3" width="w-3/4" className="mb-1" />
              <BaseSkeleton height="h-4" width="w-full" className="mb-2" />
              <BaseSkeleton height="h-3" width="w-1/2" />
            </div>
          </div>
        </div>
      );
      
    default:
      return (
        <BaseSkeleton className={className} height="h-20" />
      );
  }
}

// Export all skeleton components
export {
  BaseSkeleton,
  PoliticalIntelligenceSkeleton,
  PoliticalChartSkeleton,
  WardMapSkeleton,
  PoliticalNewsFeedSkeleton,
  StrategistAnalysisSkeleton,
  PerformanceMetricsSkeleton,
  CampaignTimelineSkeleton,
  MobilePoliticalSkeleton
};