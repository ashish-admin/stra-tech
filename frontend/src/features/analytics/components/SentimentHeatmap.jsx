import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import * as d3 from 'd3';
import { 
  MapPin, 
  Thermometer, 
  Calendar, 
  Filter, 
  Maximize2, 
  RotateCcw,
  AlertTriangle,
  Activity,
  TrendingUp
} from 'lucide-react';
import { ComponentErrorBoundary } from '../../../shared/components/ui/ComponentErrorBoundary.jsx';
import { ChartSkeleton, LoadingSpinner } from '../../../shared/components/ui/LoadingSkeleton.jsx';
import { useMobileOptimizedSSE } from '../../strategist/hooks/useMobileOptimizedSSE.js';
import { useWard } from '../../../context/WardContext.jsx'; // LokDarpan Ward Context integration

const apiBase = import.meta.env.VITE_API_BASE_URL || '';

// Emotion categories and colors from existing TimeSeriesChart
const EMOTIONS = [
  'Positive', 'Anger', 'Negative', 'Hopeful', 
  'Pride', 'Admiration', 'Frustration'
];

const EMOTION_COLORS = {
  Positive: '#16a34a',
  Anger: '#ef4444', 
  Negative: '#6b7280',
  Hopeful: '#22c55e',
  Pride: '#3b82f6',
  Admiration: '#06b6d4',
  Frustration: '#f59e0b'
};

// Time range options
const TIME_RANGES = [
  { label: '7 Days', value: 7, key: '7d' },
  { label: '14 Days', value: 14, key: '14d' },
  { label: '30 Days', value: 30, key: '30d' },
  { label: '90 Days', value: 90, key: '90d' }
];

/**
 * SentimentHeatmap Component
 * Multi-dimensional sentiment analysis visualization with geographic ward overlays
 * Integrated with LokDarpan Ward Context and SSE streaming
 */
const SentimentHeatmap = ({
  selectedWard = 'All',
  initialTimeRange = 30,
  onWardSelect,
  height = 400,
  enableRealTimeUpdates = true,
  className = '',
  // Integration props for LokDarpan system
  priority = 'standard', // 'high' | 'standard' | 'low' for resource allocation
  accessibilityMode = false, // Enhanced accessibility features
  performanceMode = 'auto' // 'high' | 'balanced' | 'battery' | 'auto'
}) => {
  // LokDarpan Ward Context Integration
  const { ward: contextWard, setWard: setContextWard } = useWard();
  const activeWard = selectedWard || contextWard || 'All';

  // Component state
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [selectedEmotion, setSelectedEmotion] = useState('All');
  const [viewMode, setViewMode] = useState('intensity'); // 'intensity' | 'comparison'
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredWard, setHoveredWard] = useState(null);

  // Refs for D3 integration
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Optimized data fetching with performance mode considerations
  const queryOptions = useMemo(() => {
    const baseOptions = {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      refetchOnWindowFocus: false
    };

    // Adjust cache and refetch behavior based on performance mode
    switch (performanceMode) {
      case 'battery':
        return { ...baseOptions, staleTime: 10 * 60 * 1000, refetchInterval: 5 * 60 * 1000 };
      case 'high':
        return { ...baseOptions, staleTime: 30 * 1000, refetchInterval: 60 * 1000 };
      case 'balanced':
      default:
        return baseOptions;
    }
  }, [performanceMode]);

  const { data: sentimentData, isLoading, error, refetch } = useQuery(
    ['sentimentHeatmap', activeWard, timeRange, selectedEmotion, priority],
    async () => {
      const response = await axios.get(
        `${apiBase}/api/v1/trends?ward=${activeWard}&days=${timeRange}`,
        { withCredentials: true }
      );

      // Transform API data for heatmap visualization
      return transformSentimentData(response.data, selectedEmotion);
    },
    queryOptions
  );

  // Ward boundary data
  const { data: wardBoundaries } = useQuery(
    ['wardBoundaries'],
    async () => {
      const response = await axios.get(`${apiBase}/api/v1/geojson`, {
        withCredentials: true
      });
      return response.data;
    },
    {
      staleTime: 60 * 60 * 1000, // 1 hour - geographic data is stable
      cacheTime: 2 * 60 * 60 * 1000 // 2 hours
    }
  );

  // Real-time updates via SSE
  const { 
    messages: sseMessages, 
    isConnected: sseConnected,
    networkQuality
  } = useMobileOptimizedSSE(
    enableRealTimeUpdates ? 'All' : null,
    {
      enableMobileOptimization: true,
      enableBatteryOptimization: true,
      messageHistoryLimit: 50
    }
  );

  // Process sentiment data for heatmap with performance optimizations
  const processedData = useMemo(() => {
    if (!sentimentData || !wardBoundaries) return null;

    // Performance optimization: limit ward count for low-end devices
    const maxWards = performanceMode === 'battery' ? 15 : 
                    performanceMode === 'balanced' ? 25 : 
                    50; // High performance mode

    const heatmapData = generateHeatmapData(sentimentData, wardBoundaries, selectedEmotion);
    
    // Limit ward count if necessary
    if (heatmapData?.wards?.length > maxWards) {
      const sortedWards = heatmapData.wards
        .sort((a, b) => b.intensity - a.intensity) // Show highest intensity wards
        .slice(0, maxWards);
        
      return {
        ...heatmapData,
        wards: sortedWards,
        isLimited: true,
        totalWards: heatmapData.wards.length
      };
    }

    return { ...heatmapData, isLimited: false };
  }, [sentimentData, wardBoundaries, selectedEmotion, performanceMode]);

  // Color scale for heatmap
  const colorScale = useMemo(() => {
    if (!processedData) return null;

    const maxIntensity = d3.max(processedData.wards, d => d.intensity) || 1;
    
    if (selectedEmotion === 'All') {
      // Multi-color scale for all emotions
      return d3.scaleSequential(d3.interpolateViridis)
        .domain([0, maxIntensity]);
    } else {
      // Single emotion color scale
      const baseColor = EMOTION_COLORS[selectedEmotion] || '#3b82f6';
      return d3.scaleSequential(d3.interpolate('#f8fafc', baseColor))
        .domain([0, maxIntensity]);
    }
  }, [processedData, selectedEmotion]);

  // Update heatmap visualization with performance optimizations
  const updateVisualization = useCallback(() => {
    if (!processedData || !colorScale || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = d3.select(containerRef.current);
    const containerRect = container.node()?.getBoundingClientRect();
    
    if (!containerRect) return;

    // Performance optimization: Only clear and recreate if data structure changed
    // Use data join pattern for better performance
    let shouldFullRedraw = !svg.select('.visualization-group').node();
    
    if (!shouldFullRedraw) {
      // Check if ward count changed (indicates data structure change)
      const existingWards = svg.selectAll('.ward-cell').size();
      shouldFullRedraw = existingWards !== processedData.wards.length;
    }

    if (shouldFullRedraw) {
      // Clear for full redraw
      svg.selectAll('*').remove();
    }

    // Set up SVG dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = containerRect.width - margin.left - margin.right;
    const height = Math.max(400, containerRect.height - margin.top - margin.bottom);

    svg
      .attr('width', containerRect.width)
      .attr('height', containerRect.height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create responsive grid-based heatmap layout
    // Mobile-optimized grid sizing
    const isMobile = width < 768;
    const minGridSize = isMobile ? 40 : 60; // Minimum touch target size for mobile
    const maxGridSize = isMobile ? 80 : 120; // Maximum size to prevent oversized cells
    
    let gridSize = Math.floor(width / Math.sqrt(processedData.wards.length));
    gridSize = Math.max(minGridSize, Math.min(maxGridSize, gridSize));
    
    const cols = Math.floor(width / gridSize);
    const rows = Math.ceil(processedData.wards.length / cols);

    // Render ward sentiment rectangles
    const wards = g.selectAll('.ward-cell')
      .data(processedData.wards)
      .enter()
      .append('g')
      .attr('class', 'ward-cell')
      .attr('transform', (d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return `translate(${col * gridSize}, ${row * gridSize})`;
      });

    // Ward rectangles with sentiment coloring
    wards.append('rect')
      .attr('width', gridSize - 2)
      .attr('height', gridSize - 2)
      .attr('rx', 4)
      .attr('fill', d => colorScale(d.intensity))
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        setHoveredWard(d);
        d3.select(this)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
      })
      .on('mouseout', function(event, d) {
        setHoveredWard(null);
        d3.select(this)
          .attr('stroke', '#e2e8f0')
          .attr('stroke-width', 1);
      })
      .on('click', function(event, d) {
        // Integrated ward selection with LokDarpan context
        if (onWardSelect) {
          onWardSelect(d.ward);
        }
        
        // Update global ward context for dashboard synchronization
        if (setContextWard && d.ward !== activeWard) {
          setContextWard(d.ward);
        }
      })
      // Mobile-optimized touch events
      .on('touchstart', function(event, d) {
        event.preventDefault(); // Prevent default touch behaviors
        setHoveredWard(d);
        d3.select(this)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
      })
      .on('touchend', function(event, d) {
        event.preventDefault();
        
        // Touch selection for mobile
        if (onWardSelect) {
          onWardSelect(d.ward);
        }
        if (setContextWard && d.ward !== activeWard) {
          setContextWard(d.ward);
        }
        
        // Clear hover state after selection
        setTimeout(() => {
          setHoveredWard(null);
          d3.select(this)
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1);
        }, 200);
      });

    // Ward labels
    wards.append('text')
      .attr('x', gridSize / 2)
      .attr('y', gridSize / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', d => d.intensity > 0.5 ? 'white' : '#374151')
      .text(d => d.ward.length > 8 ? `${d.ward.substring(0, 8)}...` : d.ward)
      .style('pointer-events', 'none');

    // Color legend
    createColorLegend(g, colorScale, width, height, selectedEmotion);

  }, [processedData, colorScale, onWardSelect, selectedEmotion]);

  // Update visualization when data changes
  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  // Handle SSE updates with performance throttling
  const lastUpdateRef = useRef(0);
  useEffect(() => {
    if (sseMessages.length > 0 && enableRealTimeUpdates) {
      const latestMessage = sseMessages[0];
      if (latestMessage.type === 'analysis' || latestMessage.type === 'intelligence') {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;
        
        // Performance throttling: minimum 30 seconds between updates in battery mode
        const throttleDelay = performanceMode === 'battery' ? 30000 : 
                             performanceMode === 'balanced' ? 10000 : 
                             5000; // High performance mode
        
        if (timeSinceLastUpdate >= throttleDelay) {
          lastUpdateRef.current = now;
          refetch();
        }
      }
    }
  }, [sseMessages, enableRealTimeUpdates, refetch, performanceMode]);

  // Performance monitoring
  const performanceMetrics = useMemo(() => {
    const wardCount = processedData?.wards?.length || 0;
    const isHighLoad = wardCount > 30;
    const estimatedRenderTime = wardCount * 2; // Rough estimate in ms
    
    return {
      wardCount,
      isHighLoad,
      estimatedRenderTime,
      isLimited: processedData?.isLimited || false,
      totalWards: processedData?.totalWards || wardCount
    };
  }, [processedData]);

  // Handle window resize with throttling for better performance
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      // Throttle resize updates to prevent excessive re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateVisualization, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [updateVisualization]);

  // Cleanup D3 selections and event listeners on unmount
  useEffect(() => {
    return () => {
      if (svgRef.current) {
        // Clean up all D3 event listeners and selections
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').on('.heatmap', null); // Remove namespaced listeners
        svg.selectAll('*').remove();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <ChartSkeleton height="h-96" showLegend={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Heatmap Unavailable</h3>
          <p className="text-sm text-red-700 text-center mb-4">
            Unable to load sentiment data. Please check your connection and try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Thermometer className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">
                Sentiment Heatmap
              </h3>
              <p className="text-sm text-gray-600">
                Multi-dimensional sentiment analysis across wards
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Real-time indicator */}
            {enableRealTimeUpdates && (
              <div className="flex items-center space-x-1">
                <Activity 
                  className={`h-4 w-4 ${sseConnected ? 'text-green-500' : 'text-gray-400'}`} 
                />
                <span className="text-xs text-gray-600">
                  {sseConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Control panel */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {/* Time range selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TIME_RANGES.map(range => (
                <option key={range.key} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Emotion filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Emotions</option>
              {EMOTIONS.map(emotion => (
                <option key={emotion} value={emotion}>
                  {emotion}
                </option>
              ))}
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'intensity' ? 'comparison' : 'intensity')}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              {viewMode === 'intensity' ? 'Show Comparison' : 'Show Intensity'}
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap visualization */}
      <div 
        ref={containerRef}
        className="p-4"
        style={{ height: isExpanded ? '80vh' : `${height}px` }}
      >
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Mobile-optimized tooltip for hovered ward */}
        {hoveredWard && (
          <div 
            className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none z-10 max-w-xs"
            style={{
              // Mobile-responsive positioning
              left: window.innerWidth < 768 ? '10px' : '50%',
              top: window.innerWidth < 768 ? '10px' : '10px',
              right: window.innerWidth < 768 ? '10px' : 'auto',
              transform: window.innerWidth < 768 ? 'none' : 'translateX(-50%)',
              fontSize: window.innerWidth < 768 ? '12px' : '14px'
            }}
          >
            <div className="font-semibold truncate">{hoveredWard.ward}</div>
            <div className="text-sm mt-1">
              <div>Intensity: {(hoveredWard.intensity * 100).toFixed(1)}%</div>
              <div className="truncate">Primary: {hoveredWard.primary_emotion}</div>
              {hoveredWard.emotion_breakdown && (
                <div className="mt-2 space-y-1">
                  {Object.entries(hoveredWard.emotion_breakdown)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, window.innerWidth < 768 ? 2 : 3)
                    .map(([emotion, value]) => (
                      <div key={emotion} className="flex justify-between text-xs">
                        <span className="truncate mr-2">{emotion}:</span>
                        <span className="flex-shrink-0">{value}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              {processedData?.wards?.length || 0} wards analyzed
            </span>
            <span>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
          
          {networkQuality && (
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>Network: {networkQuality}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Transform API sentiment data for heatmap visualization
 */
function transformSentimentData(apiData, selectedEmotion) {
  if (!apiData?.series) return null;

  // Aggregate sentiment data by ward (simulated for now)
  // In real implementation, this would process ward-specific sentiment data
  const wardData = generateMockWardData(apiData.series, selectedEmotion);

  return {
    wards: wardData,
    timeRange: apiData.timeRange || 30,
    totalMentions: wardData.reduce((sum, ward) => sum + ward.mentions, 0)
  };
}

/**
 * Generate mock ward data for demonstration
 * In production, this would come from actual ward-segmented sentiment data
 */
function generateMockWardData(seriesData, selectedEmotion) {
  const wardNames = [
    'Jubilee Hills', 'Banjara Hills', 'Secunderabad', 'Hitech City',
    'Gachibowli', 'Madhapur', 'Kondapur', 'Miyapur', 'Kukatpally',
    'Begumpet', 'Somajiguda', 'Ameerpet', 'SR Nagar', 'Punjagutta',
    'Lakdi Ka Pul', 'Abids', 'Nampally', 'Goshamahal', 'Malakpet',
    'Dilsukhnagar'
  ];

  return wardNames.map(ward => {
    // Calculate intensity based on aggregated sentiment data
    const intensity = Math.random() * 0.8 + 0.1; // Mock intensity
    const mentions = Math.floor(Math.random() * 200) + 50;
    
    // Generate emotion breakdown
    const emotionBreakdown = {};
    EMOTIONS.forEach(emotion => {
      emotionBreakdown[emotion] = Math.floor(Math.random() * mentions * 0.3);
    });

    // Find primary emotion
    const primaryEmotion = Object.entries(emotionBreakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Neutral';

    return {
      ward,
      intensity,
      mentions,
      primary_emotion: primaryEmotion,
      emotion_breakdown: emotionBreakdown
    };
  });
}

/**
 * Create color legend for heatmap
 */
function createColorLegend(g, colorScale, width, height, selectedEmotion) {
  const legendWidth = 200;
  const legendHeight = 20;
  const legendX = width - legendWidth - 20;
  const legendY = height - legendHeight - 10;

  // Legend background
  g.append('rect')
    .attr('x', legendX - 10)
    .attr('y', legendY - 25)
    .attr('width', legendWidth + 20)
    .attr('height', legendHeight + 40)
    .attr('fill', 'rgba(255, 255, 255, 0.95)')
    .attr('stroke', '#e2e8f0')
    .attr('rx', 4);

  // Legend title
  g.append('text')
    .attr('x', legendX)
    .attr('y', legendY - 10)
    .attr('font-size', '12px')
    .attr('font-weight', '600')
    .attr('fill', '#374151')
    .text(selectedEmotion === 'All' ? 'Sentiment Intensity' : `${selectedEmotion} Intensity`);

  // Color gradient
  const gradient = g.append('defs')
    .append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%')
    .attr('x2', '100%');

  // Add color stops
  for (let i = 0; i <= 10; i++) {
    const value = i / 10;
    gradient.append('stop')
      .attr('offset', `${i * 10}%`)
      .attr('stop-color', colorScale(value));
  }

  // Legend rectangle with gradient
  g.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .attr('fill', 'url(#legend-gradient)')
    .attr('stroke', '#d1d5db');

  // Legend labels
  g.append('text')
    .attr('x', legendX)
    .attr('y', legendY + legendHeight + 15)
    .attr('font-size', '10px')
    .attr('fill', '#6b7280')
    .text('Low');

  g.append('text')
    .attr('x', legendX + legendWidth)
    .attr('y', legendY + legendHeight + 15)
    .attr('font-size', '10px')
    .attr('fill', '#6b7280')
    .attr('text-anchor', 'end')
    .text('High');
}

/**
 * Wrapped SentimentHeatmap with Error Boundary
 */
const SentimentHeatmapWithErrorBoundary = (props) => {
  return (
    <ComponentErrorBoundary 
      componentName="SentimentHeatmap"
      fallbackProps={{ height: props.height || 400 }}
    >
      <SentimentHeatmap {...props} />
    </ComponentErrorBoundary>
  );
};

export default SentimentHeatmapWithErrorBoundary;
export { SentimentHeatmap };