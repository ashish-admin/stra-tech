/**
 * Strategic Timeline Visualization Component
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Interactive timeline for event-based political development tracking
 * with D3.js visualization, SSE streaming, and mobile-optimized navigation.
 */

import React, { 
  useEffect, 
  useRef, 
  useState, 
  useCallback, 
  useMemo, 
  useLayoutEffect 
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import * as d3 from 'd3';
import { debounce, throttle } from 'lodash';

// Shared components and hooks
import { 
  EnhancedCard, 
  LoadingSkeleton 
} from '../ui';
import { useEnhancedQuery } from '../../hooks/api';
import { fetchJson } from '../../services/api';
import { useTimelineSSE } from '../../hooks/useTimelineSSE';
import { useTimelineKeyboard } from '../../hooks/useTimelineKeyboard';

// Supporting components
import TimelineControls from './timeline/TimelineControls';
import EventDetailModal from './timeline/EventDetailModal';
import TimelineTooltip from './timeline/TimelineTooltip';

// Styles
import './timeline/Timeline.css';

// Constants and configurations
const TIMELINE_CONFIG = {
  margin: { top: 60, right: 50, bottom: 80, left: 80 },
  trackHeight: 80,
  eventRadius: 6,
  clusterRadius: 10,
  animationDuration: 750,
  zoomExtent: [0.1, 10],
  eventTypes: {
    news: { color: '#3b82f6', track: 0, priority: 1 },
    campaign: { color: '#f59e0b', track: 1, priority: 3 },
    policy: { color: '#10b981', track: 2, priority: 4 },
    sentiment: { color: '#8b5cf6', track: 3, priority: 2 },
    electoral: { color: '#ef4444', track: 4, priority: 5 }
  },
  tracks: [
    { id: 0, label: 'News & Media', y: 0 },
    { id: 1, label: 'Campaign Events', y: 80 },
    { id: 2, label: 'Policy Changes', y: 160 },
    { id: 3, label: 'Sentiment Shifts', y: 240 },
    { id: 4, label: 'Electoral Events', y: 320 }
  ]
};

const MOBILE_CONFIG = {
  trackHeight: 60,
  eventRadius: 4,
  margin: { top: 40, right: 20, bottom: 60, left: 60 }
};

/**
 * Strategic Timeline Component
 */
const StrategicTimeline = ({ 
  ward, 
  dateRange = { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
  height = 500,
  showControls = true,
  enableSSE = true,
  onEventSelect,
  onTimeRangeChange,
  className = '',
  ...props 
}) => {
  // Refs and state
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const tooltipRef = useRef(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [currentTimeRange, setCurrentTimeRange] = useState(dateRange);
  const [filteredEventTypes, setFilteredEventTypes] = useState(Object.keys(TIMELINE_CONFIG.eventTypes));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // SSE integration for real-time updates
  const {
    events: sseEvents,
    isConnected: sseConnected,
    connectionState: sseConnectionState,
    error: sseError,
    lastUpdate: sseLastUpdate
  } = useTimelineSSE(ward, {
    enabled: enableSSE && !!ward,
    eventTypes: filteredEventTypes,
    bufferSize: 100,
    onEvent: (event) => {
      console.log('[StrategicTimeline] Real-time event received:', event);
    },
    onConnectionChange: (state) => {
      console.log('[StrategicTimeline] SSE connection state:', state);
    }
  });

  // Keyboard accessibility integration - moved after mergedEventsData definition

  // Data fetching with multiple endpoints
  const { 
    data: eventsData, 
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = useEnhancedQuery({
    queryKey: ['strategicTimeline', 'events', ward, currentTimeRange],
    queryFn: () => fetchTimelineEvents(ward, currentTimeRange),
    enabled: !!ward,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: enableSSE ? false : 30000 // Disable polling if SSE enabled
  });

  const { 
    data: trendsData,
    isLoading: trendsLoading 
  } = useEnhancedQuery({
    queryKey: ['strategicTimeline', 'trends', ward, currentTimeRange],
    queryFn: () => lokDarpanApi.trends.get({
      ward,
      start_date: currentTimeRange.start.toISOString().split('T')[0],
      end_date: currentTimeRange.end.toISOString().split('T')[0]
    }),
    enabled: !!ward,
    staleTime: 5 * 60 * 1000
  });

  const { 
    data: alertsData,
    isLoading: alertsLoading 
  } = useEnhancedQuery({
    queryKey: ['strategicTimeline', 'alerts', ward],
    queryFn: () => lokDarpanApi.content.getAlerts(ward),
    enabled: !!ward,
    staleTime: 1 * 60 * 1000 // 1 minute for alerts
  });

  // Fetch timeline events from multiple sources
  const fetchTimelineEvents = async (ward, timeRange) => {
    try {
      const [posts, trends, alerts] = await Promise.all([
        lokDarpanApi.content.getPosts({
          city: ward,
          start_date: timeRange.start.toISOString().split('T')[0],
          end_date: timeRange.end.toISOString().split('T')[0],
          limit: 1000
        }),
        lokDarpanApi.trends.get({
          ward,
          start_date: timeRange.start.toISOString().split('T')[0],
          end_date: timeRange.end.toISOString().split('T')[0]
        }),
        lokDarpanApi.content.getAlerts(ward)
      ]);

      return processTimelineData(posts, trends, alerts);
    } catch (error) {
      console.error('[StrategicTimeline] Failed to fetch events:', error);
      throw error;
    }
  };

  // Process and normalize timeline data
  const processTimelineData = (posts, trends, alerts) => {
    const events = [];

    // Process news posts
    if (posts?.data) {
      posts.data.forEach(post => {
        events.push({
          id: `post-${post.id}`,
          type: 'news',
          title: post.title || 'News Update',
          description: post.content_preview || post.content?.substring(0, 200),
          timestamp: new Date(post.created_at),
          source: post.author_name || 'Unknown',
          importance: calculateImportance(post),
          metadata: {
            sentiment: post.sentiment_score,
            engagement: post.engagement_metrics,
            entities: post.entities,
            ward: post.ward
          }
        });
      });
    }

    // Process sentiment shifts from trends
    if (trends?.emotions) {
      const sentimentEvents = detectSentimentShifts(trends.emotions);
      events.push(...sentimentEvents);
    }

    // Process alerts as electoral events
    if (alerts?.data) {
      alerts.data.forEach(alert => {
        events.push({
          id: `alert-${alert.id}`,
          type: 'electoral',
          title: alert.title || 'Electoral Alert',
          description: alert.description,
          timestamp: new Date(alert.created_at),
          source: 'LokDarpan Intelligence',
          importance: alert.severity === 'high' ? 5 : alert.severity === 'medium' ? 3 : 1,
          metadata: {
            severity: alert.severity,
            category: alert.category,
            actionRequired: alert.action_required
          }
        });
      });
    }

    // Sort by timestamp and add clustering
    events.sort((a, b) => a.timestamp - b.timestamp);
    return addEventClustering(events);
  };

  // Calculate event importance (1-5 scale)
  const calculateImportance = (event) => {
    let score = 1;
    
    if (event.engagement_metrics?.shares > 100) score += 1;
    if (event.engagement_metrics?.comments > 50) score += 1;
    if (Math.abs(event.sentiment_score || 0) > 0.7) score += 1;
    if (event.entities?.politicians?.length > 0) score += 1;
    
    return Math.min(score, 5);
  };

  // Detect significant sentiment shifts
  const detectSentimentShifts = (emotions) => {
    const shifts = [];
    const threshold = 0.3;
    
    emotions?.forEach((emotion, index) => {
      if (index === 0) return;
      
      const prev = emotions[index - 1];
      const change = Math.abs(emotion.compound - prev.compound);
      
      if (change > threshold) {
        shifts.push({
          id: `sentiment-${emotion.date}`,
          type: 'sentiment',
          title: `Sentiment Shift: ${change > 0 ? 'Positive' : 'Negative'}`,
          description: `Sentiment changed by ${(change * 100).toFixed(1)}%`,
          timestamp: new Date(emotion.date),
          source: 'Sentiment Analysis',
          importance: Math.min(Math.floor(change * 10), 5),
          metadata: {
            change: change,
            before: prev.compound,
            after: emotion.compound,
            emotions: emotion
          }
        });
      }
    });
    
    return shifts;
  };

  // Add event clustering for dense periods
  const addEventClustering = (events) => {
    const clustered = [];
    const clusterThreshold = 2 * 60 * 60 * 1000; // 2 hours
    
    let currentCluster = null;
    
    events.forEach(event => {
      if (!currentCluster) {
        currentCluster = { events: [event], center: event.timestamp };
        return;
      }
      
      const timeDiff = Math.abs(event.timestamp - currentCluster.center);
      
      if (timeDiff < clusterThreshold && currentCluster.events.length < 5) {
        currentCluster.events.push(event);
        // Recalculate cluster center
        const totalTime = currentCluster.events.reduce((sum, e) => sum + e.timestamp.getTime(), 0);
        currentCluster.center = new Date(totalTime / currentCluster.events.length);
      } else {
        // Finalize current cluster
        if (currentCluster.events.length > 1) {
          clustered.push({
            id: `cluster-${currentCluster.center.getTime()}`,
            type: 'cluster',
            title: `${currentCluster.events.length} Events`,
            description: `Multiple events around ${currentCluster.center.toLocaleDateString()}`,
            timestamp: currentCluster.center,
            source: 'Clustered Events',
            importance: Math.max(...currentCluster.events.map(e => e.importance)),
            metadata: {
              events: currentCluster.events,
              count: currentCluster.events.length
            }
          });
        } else {
          clustered.push(currentCluster.events[0]);
        }
        
        currentCluster = { events: [event], center: event.timestamp };
      }
    });
    
    // Handle final cluster
    if (currentCluster) {
      if (currentCluster.events.length > 1) {
        clustered.push({
          id: `cluster-${currentCluster.center.getTime()}`,
          type: 'cluster',
          title: `${currentCluster.events.length} Events`,
          description: `Multiple events around ${currentCluster.center.toLocaleDateString()}`,
          timestamp: currentCluster.center,
          source: 'Clustered Events',
          importance: Math.max(...currentCluster.events.map(e => e.importance)),
          metadata: {
            events: currentCluster.events,
            count: currentCluster.events.length
          }
        });
      } else {
        clustered.push(currentCluster.events[0]);
      }
    }
    
    return clustered;
  };

  // Responsive handling
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const newIsMobile = window.innerWidth < 768;
      
      setDimensions(prev => ({ ...prev, width }));
      setIsMobile(newIsMobile);
    }
  }, []);

  const debouncedResize = useMemo(() => debounce(handleResize, 150), [handleResize]);

  useLayoutEffect(() => {
    handleResize();
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, [debouncedResize]);

  // Merge SSE events with historical data
  const mergedEventsData = useMemo(() => {
    if (!eventsData) return sseEvents;
    
    if (!sseEvents.length) return eventsData;
    
    // Combine SSE events with historical data, removing duplicates
    const sseEventIds = new Set(sseEvents.map(e => e.id));
    const filteredHistorical = eventsData.filter(e => !sseEventIds.has(e.id));
    
    // Merge and sort by timestamp
    const merged = [...sseEvents, ...filteredHistorical]
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return merged;
  }, [eventsData, sseEvents]);

  // Keyboard accessibility integration - now after mergedEventsData is defined
  const {
    focusedEventIndex,
    isNavigating,
    timelineRef,
    navigateToEvent,
    AnnouncementElement
  } = useTimelineKeyboard(mergedEventsData, handleEventSelect, handleTimeRangeChange);

  // D3 Timeline Visualization
  const initializeTimeline = useCallback(() => {
    if (!mergedEventsData || !svgRef.current) return;

    const config = isMobile ? MOBILE_CONFIG : TIMELINE_CONFIG;
    const { width, height } = dimensions;
    const margin = config.margin;
    
    // Clear existing content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("class", "timeline-main")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Filter events by type
    const filteredEvents = mergedEventsData.filter(event => 
      filteredEventTypes.includes(event.type)
    );

    if (filteredEvents.length === 0) {
      // Show empty state
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("class", "text-gray-500 dark:text-gray-400")
        .style("font-size", "16px")
        .text("No events found for the selected criteria");
      return;
    }

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(filteredEvents, d => d.timestamp))
      .range([0, innerWidth]);

    const yScale = d3.scaleOrdinal()
      .domain(TIMELINE_CONFIG.tracks.map(t => t.id))
      .range(TIMELINE_CONFIG.tracks.map(t => t.y));

    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(isMobile ? 5 : 10)
      .tickFormat(d3.timeFormat("%b %d"));

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight - 40})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", isMobile ? "10px" : "12px")
      .attr("class", "text-gray-600 dark:text-gray-300");

    // Track labels and lines
    TIMELINE_CONFIG.tracks.forEach(track => {
      if (!isMobile || track.id < 3) { // Show fewer tracks on mobile
        // Track line
        g.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", track.y)
          .attr("y2", track.y)
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "2,2");

        // Track label
        g.append("text")
          .attr("x", -10)
          .attr("y", track.y + 5)
          .attr("text-anchor", "end")
          .attr("class", "text-xs text-gray-500 dark:text-gray-400")
          .style("font-size", isMobile ? "10px" : "12px")
          .text(track.label);
      }
    });

    // Events
    const events = g.selectAll(".timeline-event")
      .data(filteredEvents)
      .enter()
      .append("g")
      .attr("class", "timeline-event")
      .attr("data-event-id", d => d.id)
      .attr("tabindex", "0")
      .attr("role", "button")
      .attr("aria-label", d => `Event: ${d.title}. ${d.description}. ${d.timestamp.toLocaleDateString()}`)
      .attr("transform", d => {
        const x = xScale(d.timestamp);
        const y = yScale(TIMELINE_CONFIG.eventTypes[d.type]?.track || 0);
        return `translate(${x},${y})`;
      });

    // Event circles
    events.append("circle")
      .attr("r", d => d.type === 'cluster' ? config.clusterRadius : config.eventRadius)
      .attr("fill", d => TIMELINE_CONFIG.eventTypes[d.type]?.color || '#6b7280')
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("opacity", d => 0.2 + (d.importance / 5) * 0.8)
      .style("cursor", "pointer")
      .on("click", handleEventClick)
      .on("mouseover", handleEventMouseOver)
      .on("mouseout", handleEventMouseOut);

    // Event importance indicators
    events.filter(d => d.importance >= 4)
      .append("circle")
      .attr("r", config.eventRadius + 3)
      .attr("fill", "none")
      .attr("stroke", d => TIMELINE_CONFIG.eventTypes[d.type]?.color || '#6b7280')
      .attr("stroke-width", 2)
      .attr("opacity", 0.6)
      .style("animation", "pulse 2s infinite");

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent(TIMELINE_CONFIG.zoomExtent)
      .extent([[0, 0], [width, height]])
      .on("zoom", handleZoom);

    svg.call(zoom);
    zoomRef.current = zoom;

    // Add zoom reset button
    svg.append("g")
      .attr("class", "zoom-reset")
      .attr("transform", `translate(${width - 50}, 20)`)
      .append("rect")
      .attr("width", 30)
      .attr("height", 20)
      .attr("rx", 3)
      .attr("fill", "#f3f4f6")
      .attr("stroke", "#d1d5db")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition()
          .duration(TIMELINE_CONFIG.animationDuration)
          .call(zoom.transform, d3.zoomIdentity);
      });

    svg.select(".zoom-reset")
      .append("text")
      .attr("x", 15)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text("Reset");

  }, [eventsData, dimensions, isMobile, filteredEventTypes]);

  // Event handlers
  const handleEventClick = useCallback((event, d) => {
    setSelectedEvent(d);
    onEventSelect?.(d);
  }, [onEventSelect]);

  const handleEventMouseOver = useCallback((event, d) => {
    const [x, y] = d3.pointer(event, svgRef.current);
    setTooltip({
      visible: true,
      x: x + 10,
      y: y - 10,
      data: d
    });
  }, []);

  const handleEventMouseOut = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleZoom = useCallback((event) => {
    const { transform } = event;
    d3.select(svgRef.current)
      .select(".timeline-main")
      .attr("transform", `translate(${TIMELINE_CONFIG.margin.left},${TIMELINE_CONFIG.margin.top}) ${transform}`);
  }, []);

  // Timeline controls handlers
  const handleTimeRangeChange = useCallback((newRange) => {
    setCurrentTimeRange(newRange);
    onTimeRangeChange?.(newRange);
  }, [onTimeRangeChange]);

  const handleFilterChange = useCallback((eventTypes) => {
    setFilteredEventTypes(eventTypes);
  }, []);

  const handlePlaybackToggle = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleExport = useCallback(() => {
    if (!eventsData || !svgRef.current) return;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `strategic-timeline-${ward}-${new Date().toISOString().split('T')[0]}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [eventsData, ward]);

  // Initialize timeline when data is ready
  useEffect(() => {
    if (eventsData && dimensions.width > 0) {
      initializeTimeline();
    }
  }, [initializeTimeline, mergedEventsData, dimensions]);

  // Handle SSE connection status display
  const connectionStatus = useMemo(() => {
    if (!enableSSE) return null;
    
    const statusConfig = {
      connected: { color: 'text-green-600', icon: '🟢', text: 'Live' },
      connecting: { color: 'text-yellow-600', icon: '🟡', text: 'Connecting...' },
      reconnecting: { color: 'text-yellow-600', icon: '🟡', text: 'Reconnecting...' },
      disconnected: { color: 'text-gray-600', icon: '⚪', text: 'Offline' },
      error: { color: 'text-red-600', icon: '🔴', text: 'Error' }
    };
    
    return statusConfig[sseConnectionState] || statusConfig.disconnected;
  }, [enableSSE, sseConnectionState]);

  // Loading state
  if (eventsLoading || trendsLoading || alertsLoading) {
    return (
      <EnhancedCard className={className}>
        <LoadingSkeleton className="h-96" />
      </EnhancedCard>
    );
  }

  // Error state
  if (eventsError) {
    return (
      <EnhancedCard 
        variant="alert" 
        title="Timeline Error"
        subtitle="Failed to load timeline data"
        className={className}
      >
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {eventsError.message || 'Unable to load strategic timeline'}
          </p>
          <button
            onClick={() => refetchEvents()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </EnhancedCard>
    );
  }

  return (
    <EnhancedCard 
      title={
        <div className="flex items-center justify-between">
          <span>Strategic Timeline</span>
          {connectionStatus && (
            <div className={`flex items-center gap-2 text-sm ${connectionStatus.color}`}>
              <span>{connectionStatus.icon}</span>
              <span>{connectionStatus.text}</span>
              {sseLastUpdate && (
                <span className="text-xs text-gray-500">
                  Updated {new Date(sseLastUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      }
      subtitle={`Political events and developments for ${ward}`}
      className={className}
      {...props}
    >
      {/* Timeline Controls */}
      {showControls && (
        <TimelineControls
          dateRange={currentTimeRange}
          eventTypes={filteredEventTypes}
          isPlaying={isPlaying}
          playbackPosition={playbackPosition}
          onTimeRangeChange={handleTimeRangeChange}
          onFilterChange={handleFilterChange}
          onPlaybackToggle={handlePlaybackToggle}
          onExport={handleExport}
          isMobile={isMobile}
        />
      )}

      {/* Timeline Visualization */}
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          ref={timelineRef}
          tabIndex={0}
          role="application"
          aria-label={`Strategic timeline for ${ward} showing political events. Press 't' to focus, use arrow keys to navigate.`}
          className="w-full h-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            role="img"
            aria-label={`Timeline visualization with ${mergedEventsData?.length || 0} events`}
          />
        </div>

        {/* Screen Reader Announcements */}
        <AnnouncementElement />

        {/* Timeline Tooltip */}
        <TimelineTooltip
          visible={tooltip.visible}
          x={tooltip.x}
          y={tooltip.y}
          data={tooltip.data}
        />

        {/* Keyboard Navigation Help */}
        {isNavigating && (
          <div className="absolute top-2 left-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded shadow">
            Use arrow keys to navigate • Enter to select • Esc to exit
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onBookmark={(event) => console.log('Bookmarked:', event)}
        />
      )}
    </EnhancedCard>
  );
};

// Error Boundary wrapper
const StrategicTimelineWithErrorBoundary = (props) => (
  <ErrorBoundary
    fallback={
      <EnhancedCard 
        variant="alert"
        title="Timeline Component Error"
        subtitle="The strategic timeline encountered an error"
        className={props.className}
      >
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Timeline visualization failed to load. Other dashboard components remain functional.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Dashboard
          </button>
        </div>
      </EnhancedCard>
    }
    onError={(error, errorInfo) => {
      console.error('[StrategicTimeline Error]', { error, errorInfo });
    }}
  >
    <StrategicTimeline {...props} />
  </ErrorBoundary>
);

export default StrategicTimelineWithErrorBoundary;