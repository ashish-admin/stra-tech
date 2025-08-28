/**
 * Timeline SSE Hook
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Server-Sent Events integration for real-time timeline updates
 * with connection recovery, mobile optimization, and error handling.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * SSE Connection Manager for Timeline Events
 */
class TimelineSSEManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:5000';
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 1000;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.reconnectDelay = options.reconnectDelay || 2000;
    
    this.eventSource = null;
    this.retryCount = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.isConnecting = false;
    this.isManuallyDisconnected = false;
    
    this.listeners = new Map();
    this.connectionState = 'disconnected';
    this.lastEventTime = null;
  }

  /**
   * Connect to SSE endpoint with recovery
   */
  connect(ward, options = {}) {
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.isManuallyDisconnected = false;
    
    const url = this.buildUrl(ward, options);
    
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(url, { withCredentials: true });
        
        this.eventSource.onopen = (event) => {
          console.log('[TimelineSSE] Connected to timeline stream');
          this.connectionState = 'connected';
          this.retryCount = 0;
          this.isConnecting = false;
          this.startHeartbeat();
          this.notifyListeners('connection', { state: 'connected', timestamp: new Date() });
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.eventSource.addEventListener('timeline_event', (event) => {
          this.handleTimelineEvent(event);
        });

        this.eventSource.addEventListener('bulk_update', (event) => {
          this.handleBulkUpdate(event);
        });

        this.eventSource.addEventListener('heartbeat', (event) => {
          this.handleHeartbeat(event);
        });

        this.eventSource.onerror = (event) => {
          console.error('[TimelineSSE] Connection error:', event);
          this.connectionState = 'error';
          this.isConnecting = false;
          
          if (!this.isManuallyDisconnected) {
            this.scheduleReconnect(ward, options);
          }
          
          this.notifyListeners('connection', { 
            state: 'error', 
            error: event,
            retryCount: this.retryCount,
            timestamp: new Date() 
          });

          if (this.retryCount === 0) {
            reject(new Error('SSE connection failed'));
          }
        };

      } catch (error) {
        console.error('[TimelineSSE] Failed to create EventSource:', error);
        this.isConnecting = false;
        this.scheduleReconnect(ward, options);
        reject(error);
      }
    });
  }

  /**
   * Build SSE URL with parameters
   */
  buildUrl(ward, options) {
    const params = new URLSearchParams({
      ward: ward || 'All',
      stream_type: 'timeline',
      include_historical: options.includeHistorical || 'false',
      buffer_size: options.bufferSize || '100'
    });

    if (options.eventTypes?.length) {
      params.set('event_types', options.eventTypes.join(','));
    }

    if (options.since) {
      params.set('since', options.since.toISOString());
    }

    return `${this.baseUrl}/api/v1/strategist/stream?${params.toString()}`;
  }

  /**
   * Handle incoming timeline event
   */
  handleTimelineEvent(event) {
    try {
      const eventData = JSON.parse(event.data);
      this.lastEventTime = new Date();
      
      console.log('[TimelineSSE] New timeline event:', eventData);
      
      // Process the event data
      const processedEvent = this.processTimelineEvent(eventData);
      
      this.notifyListeners('timeline_event', processedEvent);
    } catch (error) {
      console.error('[TimelineSSE] Failed to parse timeline event:', error);
    }
  }

  /**
   * Handle bulk updates (multiple events)
   */
  handleBulkUpdate(event) {
    try {
      const bulkData = JSON.parse(event.data);
      this.lastEventTime = new Date();
      
      console.log('[TimelineSSE] Bulk timeline update:', bulkData.count, 'events');
      
      const processedEvents = bulkData.events.map(eventData => 
        this.processTimelineEvent(eventData)
      );
      
      this.notifyListeners('bulk_update', {
        events: processedEvents,
        count: bulkData.count,
        timestamp: new Date(bulkData.timestamp)
      });
    } catch (error) {
      console.error('[TimelineSSE] Failed to parse bulk update:', error);
    }
  }

  /**
   * Process raw event data into timeline format
   */
  processTimelineEvent(eventData) {
    return {
      id: eventData.id || `sse-${Date.now()}-${Math.random()}`,
      type: this.mapEventType(eventData.type || eventData.category),
      title: eventData.title || eventData.headline || 'Timeline Event',
      description: eventData.description || eventData.summary || eventData.content?.substring(0, 200),
      timestamp: new Date(eventData.timestamp || eventData.created_at || Date.now()),
      source: eventData.source || 'Real-time Stream',
      importance: this.calculateImportance(eventData),
      metadata: {
        ward: eventData.ward,
        sentiment: eventData.sentiment_score,
        entities: eventData.entities,
        category: eventData.category,
        severity: eventData.severity,
        actionRequired: eventData.action_required || eventData.alert,
        realtime: true,
        streamId: eventData.stream_id
      }
    };
  }

  /**
   * Map various event types to timeline types
   */
  mapEventType(type) {
    const typeMap = {
      'news': 'news',
      'article': 'news',
      'campaign': 'campaign',
      'rally': 'campaign',
      'policy': 'policy',
      'announcement': 'policy',
      'sentiment': 'sentiment',
      'alert': 'electoral',
      'election': 'electoral'
    };
    
    return typeMap[type?.toLowerCase()] || 'news';
  }

  /**
   * Calculate event importance from various signals
   */
  calculateImportance(eventData) {
    let score = 1;
    
    if (eventData.severity === 'high') score += 2;
    if (eventData.severity === 'medium') score += 1;
    if (eventData.engagement_score > 0.7) score += 1;
    if (Math.abs(eventData.sentiment_score || 0) > 0.6) score += 1;
    if (eventData.entities?.politicians?.length > 0) score += 1;
    if (eventData.action_required || eventData.alert) score += 1;
    
    return Math.min(score, 5);
  }

  /**
   * Handle heartbeat messages
   */
  handleHeartbeat(event) {
    this.lastEventTime = new Date();
    const heartbeatData = JSON.parse(event.data);
    
    this.notifyListeners('heartbeat', {
      timestamp: new Date(heartbeatData.timestamp),
      activeConnections: heartbeatData.active_connections,
      systemStatus: heartbeatData.system_status
    });
  }

  /**
   * Handle general messages
   */
  handleMessage(event) {
    try {
      const messageData = JSON.parse(event.data);
      this.notifyListeners('message', messageData);
    } catch (error) {
      // Handle non-JSON messages
      this.notifyListeners('message', { text: event.data });
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      const timeSinceLastEvent = this.lastEventTime ? now - this.lastEventTime : 0;
      
      // If no events in heartbeat interval, consider connection stale
      if (timeSinceLastEvent > this.heartbeatInterval * 2) {
        console.warn('[TimelineSSE] No heartbeat received, connection may be stale');
        this.notifyListeners('connection', { 
          state: 'stale',
          lastEventTime: this.lastEventTime,
          timestamp: now 
        });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(ward, options) {
    if (this.isManuallyDisconnected || this.retryCount >= this.maxRetries) {
      console.error('[TimelineSSE] Max retries reached or manually disconnected');
      this.connectionState = 'failed';
      this.notifyListeners('connection', { 
        state: 'failed',
        retryCount: this.retryCount,
        timestamp: new Date() 
      });
      return;
    }

    this.retryCount++;
    const delay = this.retryDelay * Math.pow(2, Math.min(this.retryCount - 1, 5)); // Exponential backoff
    
    console.log(`[TimelineSSE] Scheduling reconnect attempt ${this.retryCount}/${this.maxRetries} in ${delay}ms`);
    
    this.connectionState = 'reconnecting';
    this.notifyListeners('connection', { 
      state: 'reconnecting',
      retryCount: this.retryCount,
      delay,
      timestamp: new Date() 
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect(ward, options).catch(error => {
        console.error('[TimelineSSE] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[TimelineSSE] Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    this.isManuallyDisconnected = true;
    this.connectionState = 'disconnected';
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.notifyListeners('connection', { 
      state: 'disconnected',
      manual: true,
      timestamp: new Date() 
    });
    
    console.log('[TimelineSSE] Disconnected from timeline stream');
  }

  /**
   * Get current connection state
   */
  getState() {
    return {
      connectionState: this.connectionState,
      retryCount: this.retryCount,
      lastEventTime: this.lastEventTime,
      isConnected: this.eventSource?.readyState === EventSource.OPEN
    };
  }
}

/**
 * React Hook for Timeline SSE Integration
 */
export const useTimelineSSE = (ward, options = {}) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [eventBuffer, setEventBuffer] = useState([]);
  const [error, setError] = useState(null);
  
  const queryClient = useQueryClient();
  const managerRef = useRef(null);

  // SSE options with defaults
  const sseOptions = useMemo(() => ({
    enabled: options.enabled !== false,
    includeHistorical: options.includeHistorical || false,
    bufferSize: options.bufferSize || 50,
    eventTypes: options.eventTypes,
    maxRetries: options.maxRetries || 5,
    retryDelay: options.retryDelay || 1000,
    ...options
  }), [options]);

  // Initialize SSE manager
  useEffect(() => {
    managerRef.current = new TimelineSSEManager({
      baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
      maxRetries: sseOptions.maxRetries,
      retryDelay: sseOptions.retryDelay
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
    };
  }, [sseOptions.maxRetries, sseOptions.retryDelay]);

  // Handle timeline events
  const handleTimelineEvent = useCallback((eventData) => {
    setEventBuffer(prev => {
      const newBuffer = [eventData, ...prev].slice(0, sseOptions.bufferSize);
      return newBuffer;
    });
    
    setLastUpdate(new Date());
    
    // Invalidate relevant queries to trigger refetch
    queryClient.invalidateQueries({
      queryKey: ['strategicTimeline', 'events', ward]
    });
    
    // Call custom event handler if provided
    if (options.onEvent) {
      options.onEvent(eventData);
    }
  }, [queryClient, ward, options.onEvent, sseOptions.bufferSize]);

  // Handle bulk updates
  const handleBulkUpdate = useCallback((bulkData) => {
    setEventBuffer(prev => {
      const newBuffer = [...bulkData.events, ...prev].slice(0, sseOptions.bufferSize);
      return newBuffer;
    });
    
    setLastUpdate(new Date());
    
    // Invalidate queries for bulk updates
    queryClient.invalidateQueries({
      queryKey: ['strategicTimeline']
    });
    
    if (options.onBulkUpdate) {
      options.onBulkUpdate(bulkData);
    }
  }, [queryClient, options.onBulkUpdate, sseOptions.bufferSize]);

  // Handle connection state changes
  const handleConnectionChange = useCallback((connectionData) => {
    setConnectionState(connectionData.state);
    
    if (connectionData.state === 'error' || connectionData.state === 'failed') {
      setError(new Error(`SSE connection ${connectionData.state}`));
    } else {
      setError(null);
    }
    
    if (options.onConnectionChange) {
      options.onConnectionChange(connectionData);
    }
  }, [options.onConnectionChange]);

  // Set up event listeners
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.addEventListener('timeline_event', handleTimelineEvent);
    manager.addEventListener('bulk_update', handleBulkUpdate);
    manager.addEventListener('connection', handleConnectionChange);

    return () => {
      manager.removeEventListener('timeline_event', handleTimelineEvent);
      manager.removeEventListener('bulk_update', handleBulkUpdate);
      manager.removeEventListener('connection', handleConnectionChange);
    };
  }, [handleTimelineEvent, handleBulkUpdate, handleConnectionChange]);

  // Connect/disconnect based on ward and enabled state
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !sseOptions.enabled || !ward) return;

    manager.connect(ward, sseOptions).catch(error => {
      console.error('[useTimelineSSE] Connection failed:', error);
      setError(error);
    });

    return () => {
      manager.disconnect();
    };
  }, [ward, sseOptions]);

  // Clear event buffer when ward changes
  useEffect(() => {
    setEventBuffer([]);
    setLastUpdate(null);
  }, [ward]);

  // Manual connection control
  const connect = useCallback(() => {
    if (managerRef.current && ward) {
      return managerRef.current.connect(ward, sseOptions);
    }
  }, [ward, sseOptions]);

  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
  }, []);

  // Clear event buffer
  const clearBuffer = useCallback(() => {
    setEventBuffer([]);
  }, []);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    error,
    
    // Event data
    events: eventBuffer,
    lastUpdate,
    
    // Controls
    connect,
    disconnect,
    clearBuffer,
    
    // Manager state (for debugging)
    manager: managerRef.current?.getState()
  };
};