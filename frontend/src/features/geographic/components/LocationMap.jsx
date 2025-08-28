import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { fetchJson } from "../../../shared/services/api";
import { useWard } from "../../../shared/context/WardContext.jsx";
import useViewport from "../../../shared/hooks/useViewport";
import { useMobileOptimizedSSE } from '../../strategist/hooks/useMobileOptimizedSSE.js';
import { 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Maximize2, 
  AlertTriangle, 
  Activity,
  Eye,
  Layers,
  TrendingUp,
  Thermometer
} from "lucide-react";
import { ComponentErrorBoundary } from '../../../shared/components/ui/ComponentErrorBoundary.jsx';
import { MapSkeleton, LoadingSpinner } from '../../../shared/components/ui/LoadingSkeleton.jsx';

const apiBase = import.meta.env.VITE_API_BASE_URL || '';

/* ---------- Enhanced helpers for LokDarpan political data ---------- */
function normalizeWardLabel(label) {
  if (!label) return "";
  let s = String(label).trim();
  s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
  s = s.replace(/^ward\s*\d+\s*/i, "");
  s = s.replace(/^\d+\s*[-–]?\s*/i, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// Sentiment intensity color scale for political data overlays
function getSentimentColor(intensity = 0, emotion = 'neutral') {
  const emotionColors = {
    positive: d3.interpolateGreens,
    negative: d3.interpolateReds,
    anger: d3.interpolateOranges,
    hopeful: d3.interpolateBlues,
    neutral: d3.interpolateGreys
  };
  
  const colorScale = emotionColors[emotion.toLowerCase()] || d3.interpolateViridis;
  return colorScale(Math.max(0.1, Math.min(0.9, intensity)));
}

// Calculate political urgency level based on multiple factors
function calculateUrgencyLevel(wardData) {
  if (!wardData) return 'normal';
  
  const factors = {
    sentiment: wardData.sentiment_shift || 0,
    mentions: Math.log10(wardData.mentions || 1) / 3, // Normalize mentions
    issues: (wardData.trending_issues || []).length / 5, // Up to 5 issues
    alerts: (wardData.priority_alerts || []).length / 3 // Up to 3 alerts
  };
  
  const urgencyScore = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
  
  if (urgencyScore > 0.7) return 'critical';
  if (urgencyScore > 0.4) return 'elevated';
  return 'normal';
}

// Performance-optimized ward data processing
function processWardDataForVisualization(rawData, performanceMode = 'balanced') {
  if (!rawData) return null;
  
  // Limit data complexity based on performance mode
  const maxWards = {
    high: 50,
    balanced: 30,
    battery: 15
  }[performanceMode] || 30;
  
  const processedWards = rawData.slice(0, maxWards).map(ward => ({
    ...ward,
    urgencyLevel: calculateUrgencyLevel(ward),
    displayColor: getSentimentColor(ward.sentiment_intensity, ward.primary_emotion),
    isHighPriority: (ward.priority_alerts || []).length > 0
  }));
  
  return {
    wards: processedWards,
    isLimited: rawData.length > maxWards,
    totalWards: rawData.length
  };
}
function displayName(props = {}) {
  return (
    props.name ||
    props.WARD_NAME ||
    props.ward_name ||
    props.WardName ||
    props.Ward_Name ||
    props.WARDLABEL ||
    props.LABEL ||
    "Unnamed Ward"
  );
}
function getWardId(props = {}) {
  return props.WARD_ID || props.ward_id || props.WARD || null;
}
// Enhanced quantize scale for political intelligence data
function makeQuantizeScale(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { breaks: [], color: () => "#e5e7eb" };
  const n = 6;
  // Enhanced color palette optimized for political sentiment visualization
  const colors = ["#f0f9ff", "#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7", "#075985"];
  const breaks = [];
  for (let i = 1; i < n; i++) {
    const q = i / n;
    const idx = Math.floor(q * (v.length - 1));
    breaks.push(v[idx]);
  }
  return {
    breaks,
    color: (val) => {
      if (!Number.isFinite(val)) return "#e5e7eb";
      let i = 0;
      while (i < breaks.length && val > breaks[i]) i++;
      return colors[i] ?? colors[colors.length - 1];
    },
  };
}

// Real-time data overlay scale for urgency visualization
function makeUrgencyScale() {
  const urgencyColors = {
    normal: '#10b981',      // Green - Normal activity
    elevated: '#f59e0b',    // Amber - Elevated attention needed
    critical: '#ef4444'     // Red - Critical action required
  };
  
  return {
    getColor: (urgencyLevel) => urgencyColors[urgencyLevel] || urgencyColors.normal,
    getOpacity: (urgencyLevel) => {
      switch (urgencyLevel) {
        case 'critical': return 0.8;
        case 'elevated': return 0.6;
        default: return 0.4;
      }
    }
  };
}

/* ---------- Enhanced LocationMap component for LokDarpan political intelligence ---------- */
export default function EnhancedLocationMap({
  geojson,
  selectedWard: selectedWardProp,
  onWardSelect: onWardSelectProp,
  metricField = null,
  getMetric = null,
  showLabels = true,
  matchHeightRef = null,
  minHeight = 320,
  maxHeight = 900,
  preferredDvh,
  // Enhanced props for political intelligence
  enableRealTimeOverlays = true,
  overlayMode = 'sentiment', // 'sentiment' | 'urgency' | 'mentions' | 'issues'
  performanceMode = 'balanced', // 'high' | 'balanced' | 'battery'
  accessibilityMode = false,
  onWardHover = null,
  showUrgencyIndicators = true,
  enableKeyboardNavigation = true,
  className = ''
}) {
  // Enhanced error state management
  const [mapError, setMapError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Real-time overlay state
  const [overlayData, setOverlayData] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredWard, setHoveredWard] = useState(null);
  const [selectedOverlayMode, setSelectedOverlayMode] = useState(overlayMode);
  // LokDarpan Ward Context Integration
  const { ward: wardCtx, setWard: setWardCtx } = useWard();
  const selectedWard = selectedWardProp ?? wardCtx;
  const onWardSelect = onWardSelectProp ?? setWardCtx;

  const { isDesktop, isMobile, vh } = useViewport();
  
  // Performance and accessibility optimizations
  const isTouchDevice = 'ontouchstart' in window;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isHighContrastMode = window.matchMedia('(prefers-contrast: high)').matches;

  // Enhanced refs for real-time data visualization
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const urgencyIndicatorsRef = useRef(null);
  const didInitialFitRef = useRef(false);
  const wrapperRef = useRef(null);
  const mapContainerRef = useRef(null);
  const metaCacheRef = useRef(new Map());
  const performanceMetricsRef = useRef({
    lastRender: Date.now(),
    renderCount: 0,
    averageRenderTime: 0
  });
  
  // Keyboard navigation support
  const [focusedWardIndex, setFocusedWardIndex] = useState(-1);
  const wardElementsRef = useRef(new Map());

  // Real-time political intelligence data fetching
  const { data: realTimeData, isLoading: realTimeLoading } = useQuery(
    ['realTimeWardData', selectedWard, selectedOverlayMode],
    async () => {
      if (!enableRealTimeOverlays) return null;
      
      const response = await axios.get(
        `${apiBase}/api/v1/trends?ward=${selectedWard}&days=7`,
        { withCredentials: true }
      );
      
      // Process data for overlay visualization
      return processWardDataForVisualization(response.data.series, performanceMode);
    },
    {
      staleTime: 30 * 1000, // 30 seconds for political data
      cacheTime: 2 * 60 * 1000, // 2 minutes
      enabled: enableRealTimeOverlays,
      refetchInterval: performanceMode === 'high' ? 30000 : 60000 // Auto-refresh
    }
  );

  // Ward metadata with enhanced caching
  const { data: wardMetadata } = useQuery(
    ['wardMetadata'],
    async () => {
      const response = await axios.get(`${apiBase}/api/v1/geojson`, {
        withCredentials: true
      });
      return response.data;
    },
    {
      staleTime: 60 * 60 * 1000, // 1 hour - geographic data is stable
      cacheTime: 2 * 60 * 60 * 1000, // 2 hours
      enabled: !geojson // Only fetch if geojson not provided
    }
  );

  // Real-time updates via Mobile-Optimized SSE
  const { 
    messages: sseMessages, 
    isConnected: sseConnected,
    networkQuality,
    connectionHealth
  } = useMobileOptimizedSSE(
    enableRealTimeOverlays ? (selectedWard || 'All') : null,
    {
      enableMobileOptimization: isMobile,
      enableBatteryOptimization: performanceMode === 'battery',
      messageHistoryLimit: performanceMode === 'battery' ? 10 : 25
    }
  );

  // Use provided geojson or fetched ward metadata
  const activeGeojson = useMemo(() => {
    return geojson || wardMetadata;
  }, [geojson, wardMetadata]);

  const metricAccessor = useMemo(() => {
    if (typeof getMetric === "function") return getMetric;
    if (metricField) {
      return (f) => {
        const v = f?.properties?.[metricField];
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
    }
    return null;
  }, [getMetric, metricField]);

  // Enhanced scale for political intelligence overlays
  const scale = useMemo(() => {
    if (!activeGeojson || !metricAccessor) return null;
    const vals = (activeGeojson.features || []).map(metricAccessor);
    return makeQuantizeScale(vals);
  }, [activeGeojson, metricAccessor]);

  // Urgency overlay scale for real-time intelligence
  const urgencyScale = useMemo(() => {
    return makeUrgencyScale();
  }, []);

  // Enhanced ward names with performance optimization
  const wardNames = useMemo(() => {
    if (!activeGeojson?.features) return [];
    const set = new Set();
    for (const f of activeGeojson.features) {
      const disp = displayName(f.properties || {});
      const norm = normalizeWardLabel(disp);
      if (norm) set.add(norm);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeGeojson]);

  // Real-time overlay data processing with performance optimization
  const processedOverlayData = useMemo(() => {
    if (!realTimeData || !enableRealTimeOverlays) return null;
    
    const processStart = performance.now();
    
    // Process ward data based on selected overlay mode
    const overlayData = realTimeData.wards?.map(ward => ({
      ...ward,
      overlayColor: selectedOverlayMode === 'sentiment' 
        ? getSentimentColor(ward.sentiment_intensity, ward.primary_emotion)
        : urgencyScale.getColor(ward.urgencyLevel),
      overlayOpacity: selectedOverlayMode === 'urgency'
        ? urgencyScale.getOpacity(ward.urgencyLevel)
        : Math.max(0.3, ward.sentiment_intensity || 0.3)
    }));
    
    const processTime = performance.now() - processStart;
    
    // Update performance metrics
    performanceMetricsRef.current.renderCount++;
    performanceMetricsRef.current.averageRenderTime = 
      (performanceMetricsRef.current.averageRenderTime + processTime) / 2;
    
    return overlayData;
  }, [realTimeData, selectedOverlayMode, urgencyScale, enableRealTimeOverlays]);

  const [search, setSearch] = useState("");

  /* ---------- Enhanced keyboard navigation handler ---------- */
  const handleMapKeydown = useCallback((e) => {
    if (!enableKeyboardNavigation || !wardNames.length) return;
    
    const { key, ctrlKey, altKey } = e.originalEvent || e;
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        e.originalEvent?.preventDefault();
        const direction = key === 'ArrowUp' ? -1 : 1;
        const nextIndex = Math.max(0, Math.min(wardNames.length - 1, focusedWardIndex + direction));
        setFocusedWardIndex(nextIndex);
        
        // Announce ward name for screen readers
        if (accessibilityMode) {
          const wardName = wardNames[nextIndex];
          console.log(`Focus moved to ${wardName}`);
          // Could use aria-live region for screen reader announcements
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.originalEvent?.preventDefault();
        if (focusedWardIndex >= 0 && focusedWardIndex < wardNames.length) {
          const selectedWardName = wardNames[focusedWardIndex];
          onWardSelect?.(selectedWardName);
          jumpToWard(selectedWardName);
        }
        break;
      }
      case 'Escape': {
        setFocusedWardIndex(-1);
        if (accessibilityMode) {
          console.log('Ward focus cleared');
        }
        break;
      }
      case 'h': {
        if (ctrlKey || altKey) {
          e.originalEvent?.preventDefault();
          // Toggle help or show ward list
          console.log('Available wards:', wardNames);
        }
        break;
      }
    }
  }, [enableKeyboardNavigation, wardNames, focusedWardIndex, accessibilityMode, onWardSelect]);

  /* ---------- Enhanced map initialization with error handling and accessibility ---------- */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    
    try {
      // Enhanced map configuration for political intelligence dashboard
      const map = L.map(mapContainerRef.current, {
        center: [17.385, 78.4867], // Hyderabad center
        zoom: 11,
        scrollWheelZoom: !isMobile || !isTouchDevice, // Disable scroll zoom on mobile for better UX
        zoomControl: !isMobile, // Hide zoom controls on mobile to save space
        preferCanvas: true,
        // Accessibility improvements
        keyboard: enableKeyboardNavigation,
        boxZoom: true,
        doubleClickZoom: !prefersReducedMotion,
        // Performance optimizations
        zoomAnimation: !prefersReducedMotion && performanceMode !== 'battery',
        fadeAnimation: !prefersReducedMotion && performanceMode !== 'battery',
        markerZoomAnimation: !prefersReducedMotion && performanceMode !== 'battery'
      });

      // Enhanced tile layer with error handling
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
        // Error handling for tile loading failures
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        // Performance optimizations
        updateWhenIdle: performanceMode === 'battery',
        keepBuffer: performanceMode === 'high' ? 2 : 1
      });
      
      // Handle tile loading errors gracefully
      tileLayer.on('tileerror', (e) => {
        console.warn('Map tile loading error:', e);
        // Could implement fallback tile sources here if needed
      });
      
      tileLayer.addTo(map);
      mapRef.current = map;

      // Keyboard navigation setup
      if (enableKeyboardNavigation) {
        map.on('keydown', handleMapKeydown);
      }

      // Enhanced label scheduling with performance throttling
      let rafId = null;
      let lastRebuild = 0;
      const minRebuildInterval = performanceMode === 'battery' ? 500 : 
                                performanceMode === 'balanced' ? 250 : 100;
      
      const scheduleLabels = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const now = Date.now();
          if (now - lastRebuild >= minRebuildInterval) {
            lastRebuild = now;
            rebuildLabels();
          } else {
            // Reschedule if too soon
            setTimeout(scheduleLabels, minRebuildInterval - (now - lastRebuild));
          }
        });
      };
      
      map.on("moveend zoomend", scheduleLabels);
      
      // Enhanced cleanup
      const cleanup = () => {
        try {
          map.off("moveend zoomend", scheduleLabels);
          if (enableKeyboardNavigation) {
            map.off('keydown', handleMapKeydown);
          }
          if (rafId) cancelAnimationFrame(rafId);
        } catch (cleanupError) {
          console.warn('Map cleanup error:', cleanupError);
        }
      };
      
      // Clear any previous errors on successful initialization
      setMapError(null);
      setRetryCount(0);
      
      return cleanup;
      
    } catch (error) {
      console.error('Enhanced map initialization error:', error);
      setMapError({
        type: 'initialization',
        message: 'Failed to initialize enhanced map features',
        error: error.message
      });
    }
  }, [isMobile, isTouchDevice, enableKeyboardNavigation, prefersReducedMotion, performanceMode]);

  /* ---------- responsive height ---------- */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !mapRef.current) return;

    // If a reference panel is provided, mirror its height
    if (matchHeightRef?.current) {
      const ro = new ResizeObserver((entries) => {
        const h = Math.max(
          minHeight,
          Math.min(maxHeight, entries[0].contentRect.height)
        );
        el.style.height = `${h}px`;
        mapRef.current.invalidateSize();
      });
      ro.observe(matchHeightRef.current);
      const nowH = matchHeightRef.current.getBoundingClientRect().height || minHeight;
      el.style.height = `${Math.max(minHeight, Math.min(maxHeight, nowH))}px`;
      mapRef.current.invalidateSize();
      return () => ro.disconnect();
    }

    // Otherwise, use viewport height (dvh-ish)
    const dvh = Number.isFinite(preferredDvh)
      ? preferredDvh
      : (isDesktop ? 62 : 48); // 62dvh desktop, 48dvh mobile

    const setH = () => {
      const px = Math.round((dvh / 100) * vh);
      const h = Math.max(minHeight, Math.min(maxHeight, px));
      el.style.height = `${h}px`;
      mapRef.current.invalidateSize();
    };
    setH();
    window.addEventListener("resize", setH);
    window.addEventListener("orientationchange", setH);
    return () => {
      window.removeEventListener("resize", setH);
      window.removeEventListener("orientationchange", setH);
    };
  }, [matchHeightRef, minHeight, maxHeight, preferredDvh, isDesktop, vh]);

  /* ---------- Enhanced polygon drawing with real-time overlays ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up existing layers
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (overlayLayerRef.current) {
      overlayLayerRef.current.remove();
      overlayLayerRef.current = null;
    }
    
    if (!activeGeojson) return;

    try {
      // Enhanced styling with high contrast mode support
      const baseOpacity = accessibilityMode || isHighContrastMode ? 0.7 : 0.35;
      const defaultStyle = { 
        weight: 1, 
        color: "#5b6b7a", 
        fillOpacity: baseOpacity, 
        fillColor: "#d9e3f0" 
      };
      const selectedStyle = { 
        weight: 2.25, 
        color: isHighContrastMode ? "#000000" : "#111827", 
        fillOpacity: baseOpacity + 0.2, 
        fillColor: isHighContrastMode ? "#ffff00" : "#ffbf47" 
      };
      const focusedStyle = { 
        weight: 3, 
        color: "#2563eb", 
        fillOpacity: baseOpacity + 0.3, 
        fillColor: "#dbeafe" 
      };

      // Enhanced style function with overlay data integration
      const styleFn = (f) => {
        const wardName = normalizeWardLabel(displayName(f.properties || {}));
        
        // Apply real-time overlay styling if available
        if (processedOverlayData && overlayVisible) {
          const overlayInfo = processedOverlayData.find(ward => 
            normalizeWardLabel(ward.ward || ward.name) === wardName
          );
          
          if (overlayInfo) {
            return {
              ...defaultStyle,
              fillColor: overlayInfo.overlayColor,
              fillOpacity: overlayInfo.overlayOpacity,
              // Add urgency indicator border
              weight: overlayInfo.urgencyLevel === 'critical' ? 2 : defaultStyle.weight,
              color: overlayInfo.urgencyLevel === 'critical' ? '#ef4444' : defaultStyle.color
            };
          }
        }
        
        // Fallback to metric-based styling
        if (metricAccessor && scale) {
          const v = metricAccessor(f);
          return { ...defaultStyle, fillColor: scale.color(v) };
        }
        
        return defaultStyle;
      };

      const layer = L.geoJSON(activeGeojson, {
        style: styleFn,
        onEachFeature: (f, lyr) => {
          const disp = displayName(f.properties || {});
          const wardNorm = normalizeWardLabel(disp);
          const wid = getWardId(f.properties || {});

          // Store layer reference for keyboard navigation
          wardElementsRef.current.set(wardNorm, lyr);

          // Enhanced tooltip with real-time political intelligence
          const createTooltipContent = (meta = null, overlayInfo = null) => {
            let content = `<div style="font-weight:600;color:${isHighContrastMode ? '#000' : '#1f2937'}">${disp}</div>`;
            
            if (meta && !meta._error) {
              content += `<div style="font-size:12px;margin-top:4px;color:${isHighContrastMode ? '#333' : '#6b7280'}">`;
              content += `Electors: ${meta.profile?.electors ?? "—"} · `;
              content += `Turnout: ${meta.profile?.turnout_pct ?? "—"}% · `;
              content += `SECC: ${meta.demographics?.secc_deprivation_idx ?? "—"}`;
              content += `</div>`;
            }

            // Add real-time intelligence info
            if (overlayInfo && enableRealTimeOverlays) {
              content += `<div style="font-size:11px;margin-top:4px;padding:4px;background:rgba(59,130,246,0.1);border-radius:4px;">`;
              if (selectedOverlayMode === 'sentiment') {
                content += `<div><strong>Sentiment:</strong> ${overlayInfo.primary_emotion || 'Neutral'}</div>`;
                content += `<div><strong>Intensity:</strong> ${((overlayInfo.sentiment_intensity || 0) * 100).toFixed(1)}%</div>`;
              } else if (selectedOverlayMode === 'urgency') {
                content += `<div><strong>Status:</strong> ${overlayInfo.urgencyLevel || 'Normal'}</div>`;
                content += `<div><strong>Alerts:</strong> ${overlayInfo.priority_alerts?.length || 0}</div>`;
              }
              content += `<div><strong>Mentions:</strong> ${overlayInfo.mentions || 0}</div>`;
              content += `</div>`;
            }
            
            return content;
          };

          // Set initial tooltip
          const overlayInfo = processedOverlayData?.find(ward => 
            normalizeWardLabel(ward.ward || ward.name) === wardNorm
          );
          lyr.bindTooltip(createTooltipContent(null, overlayInfo), { 
            sticky: true,
            className: 'enhanced-ward-tooltip'
          });

          // Enhanced mouseover with real-time data enrichment
          lyr.on("mouseover", async (e) => {
            // Visual feedback
            const currentStyle = e.target.options;
            lyr.setStyle({ 
              weight: currentStyle.weight + 1.5, 
              color: isHighContrastMode ? "#000000" : "#0f172a" 
            });
            lyr.bringToFront();

            // Ward hover callback for parent components
            if (onWardHover) {
              onWardHover(wardNorm, overlayInfo);
            }
            
            // Set hovered ward state
            setHoveredWard({ ward: wardNorm, ...overlayInfo });

            // Enrich tooltip with metadata (async)
            if (wid && !metaCacheRef.current.has(wid)) {
              try {
                const data = await fetchJson(`api/v1/ward/meta/${wid}`);
                metaCacheRef.current.set(wid, data || {});
                
                // Update tooltip if still hovering
                if (lyr.isTooltipOpen()) {
                  const meta = metaCacheRef.current.get(wid);
                  lyr.setTooltipContent(createTooltipContent(meta, overlayInfo));
                }
              } catch {
                metaCacheRef.current.set(wid, { _error: true });
              }
            } else if (wid) {
              const meta = metaCacheRef.current.get(wid);
              lyr.setTooltipContent(createTooltipContent(meta, overlayInfo));
            }
          });

          lyr.on("mouseout", () => {
            setHoveredWard(null);
            
            const isSel = wardNorm && selectedWard && 
              wardNorm.toLowerCase() === selectedWard.toLowerCase();
            const isFocused = wardNames[focusedWardIndex] === wardNorm;
            
            if (isFocused) {
              lyr.setStyle(focusedStyle);
            } else {
              lyr.setStyle(isSel ? selectedStyle : styleFn(f));
            }
          });

          // Enhanced click handling with accessibility support
          lyr.on("click", (e) => {
            e.originalEvent?.preventDefault?.();
            
            onWardSelect?.(wardNorm || disp);
            setFocusedWardIndex(wardNames.indexOf(wardNorm));
            
            try {
              const b = lyr.getBounds();
              const current = map.getZoom();
              const flyOptions = {
                padding: isMobile ? [40, 40] : [20, 20],
                maxZoom: Math.max(current, isMobile ? 13 : 14),
                duration: prefersReducedMotion ? 0 : 0.35,
              };
              
              map.flyToBounds(b, flyOptions);
              
              // Announce selection for accessibility
              if (accessibilityMode) {
                console.log(`Selected ward: ${wardNorm}`);
              }
            } catch (flyError) {
              console.warn('Ward focus flight error:', flyError);
            }
          });

          // Enhanced touch support for mobile devices
          if (isTouchDevice) {
            lyr.on("touchstart", (e) => {
              e.originalEvent?.preventDefault?.();
              // Provide visual feedback immediately on touch
              lyr.setStyle({ weight: 2.5, color: "#0f172a" });
              setHoveredWard({ ward: wardNorm, ...overlayInfo });
            });

            lyr.on("touchend", (e) => {
              e.originalEvent?.preventDefault?.();
              
              setTimeout(() => {
                const isSel = wardNorm && selectedWard && 
                  wardNorm.toLowerCase() === selectedWard.toLowerCase();
                lyr.setStyle(isSel ? selectedStyle : styleFn(f));
                setHoveredWard(null);
              }, 200);
            });
          }
        },
      }).addTo(map);

      layerRef.current = layer;

      // Initial map bounds fitting
      if (!didInitialFitRef.current && layer.getBounds) {
        didInitialFitRef.current = true;
        try {
          const padding = isMobile ? [20, 20] : [14, 14];
          map.fitBounds(layer.getBounds(), { padding });
        } catch (boundsError) {
          console.warn('Initial bounds fitting error:', boundsError);
        }
      }

      // Rebuild labels with new data
      rebuildLabels();
      
    } catch (polygonError) {
      console.error('Enhanced polygon rendering error:', polygonError);
      setMapError({
        type: 'polygon_rendering',
        message: 'Failed to render ward boundaries with overlays',
        error: polygonError.message
      });
    }
  }, [
    activeGeojson, metricAccessor, scale, onWardSelect, selectedWard, 
    processedOverlayData, selectedOverlayMode, overlayVisible, 
    focusedWardIndex, wardNames, accessibilityMode, isHighContrastMode,
    isMobile, prefersReducedMotion, enableRealTimeOverlays, onWardHover
  ]);

  /* ---------- Enhanced selection handling with keyboard navigation ---------- */
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.eachLayer((lyr) => {
      const f = lyr.feature;
      const name = displayName(f?.properties || {});
      const norm = normalizeWardLabel(name);
      const isSelected = selectedWard && norm && 
        norm.toLowerCase() === selectedWard.toLowerCase();
      const isFocused = wardNames[focusedWardIndex] === norm;
      
      if (isSelected) {
        const selectedStyle = { 
          weight: 2.25, 
          color: isHighContrastMode ? "#000000" : "#111827", 
          fillOpacity: 0.55, 
          fillColor: isHighContrastMode ? "#ffff00" : "#ffbf47" 
        };
        lyr.setStyle(selectedStyle);
        
        try {
          const b = lyr.getBounds();
          const current = map.getZoom();
          const flyOptions = {
            padding: isMobile ? [40, 40] : [20, 20],
            maxZoom: Math.max(current, isMobile ? 13 : 14),
            duration: prefersReducedMotion ? 0 : 0.35,
          };
          map.flyToBounds(b, flyOptions);
        } catch (flyError) {
          console.warn('Selection flight error:', flyError);
        }
      } else if (isFocused) {
        // Keyboard focus styling
        const focusedStyle = { 
          weight: 3, 
          color: "#2563eb", 
          fillOpacity: 0.65, 
          fillColor: "#dbeafe" 
        };
        lyr.setStyle(focusedStyle);
      }
    });

    setSearch(selectedWard || "");
    rebuildLabels();
  }, [selectedWard, focusedWardIndex, wardNames, isMobile, prefersReducedMotion, isHighContrastMode]);

  /* ---------- label declutter (zoom-aware) ---------- */
  function rebuildLabels() {
    if (!showLabels) return;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    if (labelLayerRef.current) {
      labelLayerRef.current.remove();
      labelLayerRef.current = null;
    }

    const zoom = map.getZoom();
    const labels = [];
    const boxes = [];
    const selectedLower = (selectedWard || "").toLowerCase();

    layer.eachLayer((lyr) => {
      const f = lyr.feature;
      const props = f?.properties || {};
      const name = displayName(props);
      const norm = normalizeWardLabel(name);
      const center = lyr.getBounds().getCenter();
      const isSelected = norm.toLowerCase() === selectedLower;

      // show fewer labels on low zoom; always show selected
      if (zoom < 12 && !isSelected) return;

      const pt = map.latLngToContainerPoint(center);
      const w = Math.min(220, Math.max(50, name.length * 6 + 12));
      const h = 16;
      const box = [pt.x - w / 2, pt.y - h / 2, pt.x + w / 2, pt.y + h / 2];

      let collides = false;
      for (const b of boxes) {
        if (!(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3])) {
          collides = true;
          break;
        }
      }
      if (collides && !isSelected) return;

      boxes.push(box);
      labels.push(
        L.marker(center, {
          icon: L.divIcon({
            className: "ld-ward-label",
            html: `<div style="
              background:#ffffffcc;border:1px solid #cfd6df;border-radius:6px;
              padding:2px 6px;font-size:11px;white-space:nowrap;
              ${isSelected ? "font-weight:700;border-color:#5b6b7a" : ""}
            ">${name}</div>`,
            iconSize: [10, 10],
          }),
          interactive: false,
          keyboard: false,
          pane: "markerPane",
        })
      );
    });

    labelLayerRef.current = L.layerGroup(labels).addTo(map);
  }

  /* ---------- controls ---------- */
  function resetView() {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    try {
      map.fitBounds(layer.getBounds(), { padding: [14, 14] });
    } catch {}
  }
  function jumpToWard(name) {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map || !name) return;
    let matched = null;
    layer.eachLayer((lyr) => {
      if (matched) return;
      const disp = displayName(lyr.feature?.properties || {});
      const norm = normalizeWardLabel(disp);
      if (norm.toLowerCase() === name.toLowerCase()) matched = lyr;
    });
    if (matched) {
      onWardSelect?.(name);
      try {
        const b = matched.getBounds();
        const current = map.getZoom();
        map.flyToBounds(b, {
          padding: [20, 20],
          maxZoom: Math.max(current, 14),
          duration: 0.35,
        });
      } catch {}
    }
  }

  /* ---------- Real-time SSE updates integration ---------- */
  const lastSSEUpdateRef = useRef(0);
  useEffect(() => {
    if (sseMessages.length > 0 && enableRealTimeOverlays) {
      const latestMessage = sseMessages[0];
      
      // Process different message types
      if (['analysis', 'intelligence', 'progress', 'confidence'].includes(latestMessage.type)) {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastSSEUpdateRef.current;
        
        // Performance throttling based on mode
        const throttleDelay = performanceMode === 'battery' ? 30000 : 
                             performanceMode === 'balanced' ? 15000 : 
                             10000; // High performance mode
        
        if (timeSinceLastUpdate >= throttleDelay) {
          lastSSEUpdateRef.current = now;
          
          // Trigger overlay data refresh without full re-render
          if (realTimeData?.wards) {
            setOverlayData(realTimeData);
          }
        }
      }
    }
  }, [sseMessages, enableRealTimeOverlays, realTimeData, performanceMode]);

  /* ---------- Error recovery handler ---------- */
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRecovering(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Force re-initialization after a delay
      setTimeout(() => {
        setMapError(null);
        
        // If map container exists, try to reinitialize
        if (mapContainerRef.current) {
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
          // Trigger re-initialization on next render
          setIsRecovering(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Enhanced map recovery error:', error);
      setIsRecovering(false);
    }
  }, [retryCount, maxRetries]);

  /* ---------- Enhanced render with error boundaries and real-time UI ---------- */
  
  // Error fallback UI
  if (mapError && !isRecovering) {
    const MapErrorFallback = React.lazy(() => 
      import('./EnhancedLocationMapUI.jsx').then(module => ({ 
        default: module.MapErrorFallback 
      }))
    );
    
    return (
      <div
        ref={wrapperRef}
        className={`relative w-full rounded-md border overflow-hidden ${className}`}
        style={{ height: isExpanded ? '80vh' : (matchHeightRef ? 'auto' : '400px') }}
      >
        <React.Suspense fallback={
          <MapSkeleton height="h-full" className="animate-pulse" />
        }>
          <MapErrorFallback
            error={mapError}
            onRetry={handleRetry}
            retryCount={retryCount}
            maxRetries={maxRetries}
            wardNames={wardNames}
            selectedWard={selectedWard}
            onWardSelect={onWardSelect}
            isMobile={isMobile}
          />
        </React.Suspense>
      </div>
    );
  }

  // Recovery/loading state
  if (isRecovering || realTimeLoading) {
    return (
      <div
        ref={wrapperRef}
        className={`relative w-full rounded-md border overflow-hidden ${className}`}
        style={{ height: isExpanded ? '80vh' : (matchHeightRef ? 'auto' : '400px') }}
      >
        <MapSkeleton 
          height="h-full"
          className="animate-pulse"
          showControls={true}
        />
      </div>
    );
  }

  // Main enhanced render
  return (
    <div
      ref={wrapperRef}
      className={`relative w-full rounded-md border overflow-hidden ${className}`}
      style={{ height: isExpanded ? '80vh' : (matchHeightRef ? 'auto' : '400px') }}
      role="application"
      aria-label="Enhanced Political Intelligence Map"
      tabIndex={enableKeyboardNavigation ? 0 : -1}
      onKeyDown={enableKeyboardNavigation ? handleMapKeydown : undefined}
    >
      {/* Main Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Enhanced Controls */}
      <React.Suspense fallback={null}>
        <EnhancedMapControls
          // Control states
          selectedOverlayMode={selectedOverlayMode}
          setSelectedOverlayMode={setSelectedOverlayMode}
          overlayVisible={overlayVisible}
          setOverlayVisible={setOverlayVisible}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          
          // Data and connection states
          sseConnected={sseConnected}
          networkQuality={networkQuality}
          connectionHealth={connectionHealth}
          enableRealTimeOverlays={enableRealTimeOverlays}
          
          // Search and navigation
          search={search}
          setSearch={setSearch}
          wardNames={wardNames}
          jumpToWard={jumpToWard}
          resetView={resetView}
          selectedWard={selectedWard}
          
          // Performance and accessibility
          isMobile={isMobile}
          accessibilityMode={accessibilityMode}
          processedOverlayData={processedOverlayData}
          hoveredWard={hoveredWard}
        />
      </React.Suspense>

      {/* Performance Metrics (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <React.Suspense fallback={null}>
          <MapPerformanceMetrics
            performanceMetrics={performanceMetricsRef.current}
            connectionHealth={connectionHealth}
            processedOverlayData={processedOverlayData}
          />
        </React.Suspense>
      )}
    </div>
  );
}

/* ---------- Lazy load enhanced UI components ---------- */
const EnhancedMapControls = React.lazy(() => 
  import('./EnhancedLocationMapUI.jsx').then(module => ({ 
    default: module.EnhancedMapControls 
  }))
);

const MapPerformanceMetrics = React.lazy(() => 
  import('./EnhancedLocationMapUI.jsx').then(module => ({ 
    default: module.MapPerformanceMetrics 
  }))
);

/**
 * Enhanced LocationMap with Error Boundary and Accessibility
 */
const EnhancedLocationMapWithErrorBoundary = (props) => {
  return (
    <ComponentErrorBoundary 
      componentName="EnhancedLocationMap"
      fallbackProps={{ 
        height: props.height || (props.isExpanded ? '80vh' : '400px'),
        wardNames: props.wardNames || [],
        selectedWard: props.selectedWard,
        onWardSelect: props.onWardSelect
      }}
    >
      <EnhancedLocationMap {...props} />
    </ComponentErrorBoundary>
  );
};

export default EnhancedLocationMapWithErrorBoundary;
export { EnhancedLocationMap };
