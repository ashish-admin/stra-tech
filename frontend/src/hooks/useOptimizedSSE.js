import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAdvancedCleanup } from './useAdvancedMemoryManagement';

/**
 * Optimized SSE connection manager with performance enhancements
 */
class OptimizedSSEManager {
  constructor() {
    this.connections = new Map();
    this.connectionPool = new Map();
    this.maxConnections = 3;
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.backoffDelays = [1000, 2000, 4000, 8000, 16000]; // Progressive backoff
  }

  // Get or create connection with pooling
  getConnection(url, options = {}) {
    const connectionKey = `${url}-${JSON.stringify(options)}`;
    
    if (this.connections.has(connectionKey)) {
      const connection = this.connections.get(connectionKey);
      if (connection.readyState === EventSource.OPEN || connection.readyState === EventSource.CONNECTING) {
        return connection;
      } else {
        // Clean up dead connection
        this.closeConnection(connectionKey);
      }
    }

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      // Close least recently used connection
      const oldestKey = Array.from(this.connections.keys())[0];
      this.closeConnection(oldestKey);
    }

    return this.createConnection(connectionKey, url, options);
  }

  // Create new SSE connection with optimizations
  createConnection(key, url, options) {
    const eventSource = new EventSource(url, {
      withCredentials: true,
      ...options
    });

    // Add performance optimizations
    eventSource.addEventListener('open', () => {
      this.reconnectAttempts.set(key, 0); // Reset reconnect attempts on success
    });

    eventSource.addEventListener('error', (event) => {
      if (eventSource.readyState === EventSource.CLOSED) {
        this.handleReconnection(key, url, options);
      }
    });

    this.connections.set(key, eventSource);
    return eventSource;
  }

  // Intelligent reconnection with exponential backoff
  handleReconnection(key, url, options) {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[SSE] Max reconnection attempts reached for ${url}`);
      this.connections.delete(key);
      this.reconnectAttempts.delete(key);
      return;
    }

    const delay = this.backoffDelays[Math.min(attempts, this.backoffDelays.length - 1)];
    
    setTimeout(() => {
      if (this.connections.has(key)) { // Check if connection is still needed
        console.log(`[SSE] Attempting to reconnect (${attempts + 1}/${this.maxReconnectAttempts}) to ${url}`);
        this.reconnectAttempts.set(key, attempts + 1);
        this.createConnection(key, url, options);
      }
    }, delay);
  }

  // Close specific connection
  closeConnection(key) {
    const connection = this.connections.get(key);
    if (connection) {
      connection.close();
      this.connections.delete(key);
      this.reconnectAttempts.delete(key);
    }
  }

  // Close all connections
  closeAllConnections() {
    this.connections.forEach((connection) => {
      connection.close();
    });
    this.connections.clear();
    this.reconnectAttempts.clear();
  }

  // Get connection statistics
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      connectingConnections: 0,
      closedConnections: 0,
      reconnectAttempts: Array.from(this.reconnectAttempts.entries())
    };

    this.connections.forEach((connection) => {
      switch (connection.readyState) {
        case EventSource.OPEN:
          stats.activeConnections++;
          break;
        case EventSource.CONNECTING:
          stats.connectingConnections++;
          break;
        case EventSource.CLOSED:
          stats.closedConnections++;
          break;
      }
    });

    return stats;
  }
}

// Global SSE manager instance
const sseManager = new OptimizedSSEManager();

/**
 * Optimized SSE hook with performance enhancements and memory management
 */
export const useOptimizedSSE = (url, options = {}) => {
  const {
    reconnectOnError = true,
    bufferMessages = true,
    bufferSize = 100,
    throttleUpdates = false,
    throttleDelay = 100,
    enableCompression = false,
    messageFilters = [],
    onOpen,
    onError,
    onMessage,
    onClose
  } = options;

  const [connectionState, setConnectionState] = useState('closed');
  const [lastMessage, setLastMessage] = useState(null);
  const [messageBuffer, setMessageBuffer] = useState([]);
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);
  const messageBufferRef = useRef([]);
  const throttleTimeoutRef = useRef(null);
  const { registerCleanup } = useAdvancedCleanup('OptimizedSSE');

  // Memoize URL and options to prevent unnecessary reconnections
  const memoizedUrl = useMemo(() => url, [url]);
  const memoizedOptions = useMemo(() => options, [
    reconnectOnError,
    bufferMessages,
    bufferSize,
    throttleUpdates,
    throttleDelay,
    enableCompression
  ]);

  // Throttled message processing
  const processMessages = useCallback(() => {
    if (messageBufferRef.current.length > 0) {
      const messages = [...messageBufferRef.current];
      messageBufferRef.current = [];
      
      setMessageBuffer(prevBuffer => {
        const newBuffer = [...prevBuffer, ...messages];
        return bufferMessages ? newBuffer.slice(-bufferSize) : [];
      });

      // Set last message
      if (messages.length > 0) {
        setLastMessage(messages[messages.length - 1]);
      }
    }
  }, [bufferMessages, bufferSize]);

  // Throttled message processor
  const throttledProcessMessages = useCallback(() => {
    if (throttleUpdates) {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      
      throttleTimeoutRef.current = setTimeout(() => {
        processMessages();
        throttleTimeoutRef.current = null;
      }, throttleDelay);
    } else {
      processMessages();
    }
  }, [processMessages, throttleUpdates, throttleDelay]);

  // Message filter function
  const shouldProcessMessage = useCallback((message) => {
    if (messageFilters.length === 0) return true;
    
    return messageFilters.some(filter => {
      if (typeof filter === 'function') {
        return filter(message);
      } else if (typeof filter === 'object' && filter.type) {
        return message.type === filter.type;
      }
      return true;
    });
  }, [messageFilters]);

  // Handle SSE message
  const handleMessage = useCallback((event) => {
    try {
      let messageData;
      
      try {
        messageData = JSON.parse(event.data);
      } catch (parseError) {
        messageData = { raw: event.data, type: 'text' };
      }

      const message = {
        ...messageData,
        timestamp: Date.now(),
        eventType: event.type || 'message'
      };

      // Apply message filters
      if (shouldProcessMessage(message)) {
        messageBufferRef.current.push(message);
        
        // Custom message handler
        if (onMessage) {
          onMessage(message, event);
        }
        
        throttledProcessMessages();
      }
    } catch (error) {
      console.error('[SSE] Error processing message:', error);
      setError(error);
    }
  }, [shouldProcessMessage, onMessage, throttledProcessMessages]);

  // Handle connection open
  const handleOpen = useCallback((event) => {
    setConnectionState('open');
    setError(null);
    
    if (onOpen) {
      onOpen(event);
    }
  }, [onOpen]);

  // Handle connection error
  const handleError = useCallback((event) => {
    setConnectionState('error');
    setError(new Error('SSE connection error'));
    
    if (onError) {
      onError(event);
    }
  }, [onError]);

  // Handle connection close
  const handleClose = useCallback((event) => {
    setConnectionState('closed');
    
    if (onClose) {
      onClose(event);
    }
  }, [onClose]);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!memoizedUrl) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const eventSource = sseManager.getConnection(memoizedUrl, {
        withCredentials: true,
        ...memoizedOptions
      });

      eventSource.addEventListener('open', handleOpen);
      eventSource.addEventListener('error', handleError);
      eventSource.addEventListener('message', handleMessage);

      // Handle custom event types
      if (memoizedOptions.eventTypes) {
        memoizedOptions.eventTypes.forEach(eventType => {
          eventSource.addEventListener(eventType, handleMessage);
        });
      }

      eventSourceRef.current = eventSource;

      // Register cleanup
      const cleanup = registerCleanup(() => {
        eventSource.removeEventListener('open', handleOpen);
        eventSource.removeEventListener('error', handleError);
        eventSource.removeEventListener('message', handleMessage);
        
        if (memoizedOptions.eventTypes) {
          memoizedOptions.eventTypes.forEach(eventType => {
            eventSource.removeEventListener(eventType, handleMessage);
          });
        }
        
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
      });

      return cleanup;
    } catch (error) {
      console.error('[SSE] Connection failed:', error);
      setError(error);
      setConnectionState('error');
    }
  }, [
    memoizedUrl,
    memoizedOptions,
    handleOpen,
    handleError,
    handleMessage,
    registerCleanup
  ]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionState('closed');
  }, []);

  // Clear message buffer
  const clearBuffer = useCallback(() => {
    setMessageBuffer([]);
    messageBufferRef.current = [];
  }, []);

  // Send message (for bidirectional communication via fetch)
  const sendMessage = useCallback(async (message) => {
    if (!memoizedUrl) return;

    try {
      const response = await fetch(memoizedUrl.replace('/stream', '/send'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[SSE] Failed to send message:', error);
      throw error;
    }
  }, [memoizedUrl]);

  // Auto-connect effect
  useEffect(() => {
    if (memoizedUrl) {
      const cleanup = connect();
      return cleanup;
    }
  }, [connect, memoizedUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      ...sseManager.getStats(),
      messageBuffer: messageBuffer.length,
      lastMessageTime: lastMessage?.timestamp,
      connectionState,
      hasError: !!error
    };
  }, [messageBuffer.length, lastMessage?.timestamp, connectionState, error]);

  return {
    connectionState,
    lastMessage,
    messageBuffer,
    error,
    connect,
    disconnect,
    clearBuffer,
    sendMessage,
    getConnectionStats,
    isConnected: connectionState === 'open',
    isConnecting: connectionState === 'connecting'
  };
};

/**
 * Hook for multiple SSE connections with unified management
 */
export const useMultipleSSE = (connections = []) => {
  const [allConnections, setAllConnections] = useState(new Map());
  const [aggregatedMessages, setAggregatedMessages] = useState([]);
  const [globalConnectionState, setGlobalConnectionState] = useState('closed');

  // Create individual SSE connections
  useEffect(() => {
    const newConnections = new Map();

    connections.forEach(({ key, url, options = {} }) => {
      const connectionOptions = {
        ...options,
        onMessage: (message) => {
          // Add connection identifier to message
          const enhancedMessage = {
            ...message,
            connectionKey: key,
            connectionUrl: url
          };
          
          setAggregatedMessages(prev => {
            const newMessages = [...prev, enhancedMessage];
            // Keep only last 1000 messages
            return newMessages.slice(-1000);
          });
          
          // Call original handler if provided
          if (options.onMessage) {
            options.onMessage(enhancedMessage);
          }
        }
      };

      newConnections.set(key, { url, options: connectionOptions });
    });

    setAllConnections(newConnections);
  }, [connections]);

  // Update global connection state
  useEffect(() => {
    const states = Array.from(allConnections.values()).map(conn => conn.connectionState);
    
    if (states.every(state => state === 'open')) {
      setGlobalConnectionState('open');
    } else if (states.some(state => state === 'open')) {
      setGlobalConnectionState('partial');
    } else if (states.some(state => state === 'connecting')) {
      setGlobalConnectionState('connecting');
    } else {
      setGlobalConnectionState('closed');
    }
  }, [allConnections]);

  return {
    connections: allConnections,
    aggregatedMessages,
    globalConnectionState,
    closeAllConnections: () => sseManager.closeAllConnections(),
    getGlobalStats: () => sseManager.getStats()
  };
};

export default {
  useOptimizedSSE,
  useMultipleSSE,
  sseManager
};