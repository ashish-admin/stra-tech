/**
 * SSE Reliability Tests
 * 
 * Comprehensive test suite for Server-Sent Events connection reliability,
 * heartbeat monitoring, and automatic recovery mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSEClient } from '../lib/SSEClient.js';

// Mock EventSource for testing
class MockEventSource {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.readyState = EventSource.CONNECTING;
    this.listeners = {};
    
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      if (this.onopen) this.onopen({ type: 'open' });
    }, 10);
  }

  addEventListener(type, listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(listener);
      if (index > -1) this.listeners[type].splice(index, 1);
    }
  }

  close() {
    this.readyState = EventSource.CLOSED;
    if (this.onclose) this.onclose({ type: 'close' });
  }

  // Simulate server events
  simulateMessage(data, eventType = 'message') {
    const event = { 
      type: eventType, 
      data: typeof data === 'string' ? data : JSON.stringify(data) 
    };
    
    if (eventType === 'message' && this.onmessage) {
      this.onmessage(event);
    } else if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(listener => listener(event));
    }
  }

  simulateError() {
    this.readyState = EventSource.CLOSED;
    if (this.onerror) this.onerror({ type: 'error' });
  }

  simulateHeartbeat() {
    this.simulateMessage({ type: 'heartbeat', timestamp: new Date().toISOString() }, 'heartbeat');
  }
}

// Override global EventSource
global.EventSource = MockEventSource;
global.EventSource.CONNECTING = 0;
global.EventSource.OPEN = 1;
global.EventSource.CLOSED = 2;

describe('SSE Reliability Tests', () => {
  let client;
  let mockEventSource;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    client = new SSEClient({
      reconnectDelay: 1000,
      maxReconnectAttempts: 3
    });

    // Spy on console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Connection Recovery', () => {
    it('should automatically reconnect after connection error', async () => {
      const reconnectingSpy = vi.fn();
      const connectedSpy = vi.fn();
      
      client.on('reconnecting', reconnectingSpy);
      client.on('connected', connectedSpy);

      // Initial connection
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50); // Allow connection to establish

      expect(connectedSpy).toHaveBeenCalledTimes(1);

      // Simulate connection error
      client.eventSource.simulateError();
      vi.advanceTimersByTime(50);

      // Should trigger reconnection
      expect(reconnectingSpy).toHaveBeenCalled();
      expect(reconnectingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          maxAttempts: 3
        })
      );

      // Advance time to trigger reconnection
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(50); // Allow new connection

      expect(connectedSpy).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for reconnection attempts', async () => {
      const reconnectingSpy = vi.fn();
      
      client.on('reconnecting', reconnectingSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Simulate connection failures and check backoff delays
      client.eventSource.simulateError();
      vi.advanceTimersByTime(50);
      
      // First attempt should have base delay
      expect(reconnectingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          delay: 1000
        })
      );

      vi.advanceTimersByTime(1050); // Complete first reconnection

      // Second failure
      client.eventSource.simulateError();
      vi.advanceTimersByTime(50);
      
      expect(reconnectingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 2,
          delay: 2000
        })
      );
    });

    it('should emit reconnect-failed after max attempts', async () => {
      const reconnectFailedSpy = vi.fn();
      
      client.on('reconnect-failed', reconnectFailedSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Simulate connection failures exceeding max attempts
      client.eventSource.simulateError(); // First failure
      vi.advanceTimersByTime(1050);
      
      client.eventSource.simulateError(); // Second failure  
      vi.advanceTimersByTime(2050);
      
      client.eventSource.simulateError(); // Third failure
      vi.advanceTimersByTime(4050);
      
      client.eventSource.simulateError(); // Fourth failure - should trigger reconnect-failed

      expect(reconnectFailedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 3
        })
      );
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should start heartbeat monitoring on connection', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      expect(client.getStatus().health).toBe('healthy');
      expect(client.lastHeartbeat).toBeDefined();
      expect(client.heartbeatInterval).toBeDefined();
    });

    it('should update last heartbeat on heartbeat events', async () => {
      const heartbeatSpy = vi.fn();
      
      client.on('heartbeat', heartbeatSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      const initialHeartbeat = client.lastHeartbeat;

      // Simulate heartbeat
      vi.advanceTimersByTime(5000);
      client.eventSource.simulateHeartbeat();

      expect(heartbeatSpy).toHaveBeenCalled();
      expect(client.lastHeartbeat).toBeGreaterThan(initialHeartbeat);
    });

    it('should emit warning on heartbeat timeout', async () => {
      const timeoutSpy = vi.fn();
      
      client.on('heartbeat-timeout', timeoutSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Advance time to trigger heartbeat timeout warning (35s)
      vi.advanceTimersByTime(37000);

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'warning',
          timeSinceLastHeartbeat: expect.any(Number)
        })
      );
    });

    it('should automatically reconnect on critical heartbeat timeout', async () => {
      const timeoutSpy = vi.fn();
      const reconnectingSpy = vi.fn();
      
      client.on('heartbeat-timeout', timeoutSpy);
      client.on('reconnecting', reconnectingSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Advance time to trigger forced reconnection (45s)
      vi.advanceTimersByTime(47000);

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'reconnecting',
          timeSinceLastHeartbeat: expect.any(Number)
        })
      );

      expect(reconnectingSpy).toHaveBeenCalled();
    });
  });

  describe('Session Continuity', () => {
    it('should add session continuity parameters on reconnection', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Set a heartbeat timestamp
      client.lastHeartbeat = Date.now() - 5000;
      
      // Generate session continuity URL
      const continuityUrl = client.addSessionContinuity('http://localhost:5000/api/v1/strategist/feed');
      const urlObj = new URL(continuityUrl);
      
      expect(urlObj.searchParams.has('since')).toBe(true);
      expect(urlObj.searchParams.has('connection_id')).toBe(true);
      expect(client.connectionId).toBeDefined();
    });

    it('should preserve connection ID across reconnections', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      const initialConnectionId = client.connectionId;

      // Simulate error and reconnection
      client.eventSource.simulateError();
      vi.advanceTimersByTime(1050); // Wait for reconnection

      expect(client.connectionId).toBe(initialConnectionId);
    });
  });

  describe('Connection Health Monitoring', () => {
    it('should report healthy status with recent heartbeat', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Simulate recent heartbeat
      client.eventSource.simulateHeartbeat();
      
      const status = client.getStatus();
      expect(status.health).toBe('healthy');
      expect(status.isConnected).toBe(true);
      expect(status.timeSinceLastHeartbeat).toBeLessThan(35000);
    });

    it('should report warning status with stale heartbeat', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Advance time to make heartbeat stale but not critical
      vi.advanceTimersByTime(37000);
      
      const status = client.getStatus();
      expect(status.health).toBe('warning');
      expect(status.timeSinceLastHeartbeat).toBeGreaterThan(35000);
      expect(status.timeSinceLastHeartbeat).toBeLessThan(45000);
    });

    it('should report critical status with very stale heartbeat', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Advance time to make heartbeat critical
      vi.advanceTimersByTime(47000);
      
      const status = client.getStatus();
      expect(status.health).toBe('critical');
      expect(status.timeSinceLastHeartbeat).toBeGreaterThan(45000);
    });
  });

  describe('Manual Reconnection', () => {
    it('should support force reconnection', async () => {
      const manualReconnectSpy = vi.fn();
      const reconnectingSpy = vi.fn();
      
      client.on('manual-reconnect-requested', manualReconnectSpy);
      client.on('reconnecting', reconnectingSpy);
      
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Force reconnection
      client.forceReconnect();

      expect(manualReconnectSpy).toHaveBeenCalled();
      expect(reconnectingSpy).toHaveBeenCalled();
      expect(client.reconnectAttempts).toBe(1);
    });

    it('should reset reconnect attempts on manual reconnection', async () => {
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Set some failed attempts
      client.reconnectAttempts = 2;

      // Force reconnection should reset attempts
      client.forceReconnect();
      
      expect(client.reconnectAttempts).toBe(1); // Will be 1 after attemptReconnect() is called
    });
  });

  describe('Event Handling', () => {
    it('should handle strategist-analysis events', async () => {
      const analysisSpy = vi.fn();
      
      client.on('strategist-analysis', analysisSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      const analysisData = { 
        ward: 'Jubilee Hills', 
        sentiment: 'positive',
        recommendations: ['Strategy A', 'Strategy B']
      };

      client.eventSource.simulateMessage(analysisData, 'strategist-analysis');

      expect(analysisSpy).toHaveBeenCalledWith(analysisData);
    });

    it('should handle analysis-progress events', async () => {
      const progressSpy = vi.fn();
      
      client.on('analysis-progress', progressSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      const progressData = { 
        stage: 'sentiment_analysis', 
        progress: 75,
        eta: '30 seconds' 
      };

      client.eventSource.simulateMessage(progressData, 'analysis-progress');

      expect(progressSpy).toHaveBeenCalledWith(progressData);
    });

    it('should handle analysis-complete events', async () => {
      const completeSpy = vi.fn();
      
      client.on('analysis-complete', completeSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      const completeData = { 
        analysis_id: 'abc123',
        total_time: '45 seconds',
        status: 'completed' 
      };

      client.eventSource.simulateMessage(completeData, 'analysis-complete');

      expect(completeSpy).toHaveBeenCalledWith(completeData);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const errorSpy = vi.fn();
      
      client.on('error', errorSpy);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Send invalid JSON
      client.eventSource.simulateMessage('invalid json data');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to parse message',
          raw: 'invalid json data'
        })
      );
    });

    it('should handle listener errors without crashing', async () => {
      const errorSpy = vi.fn();
      const faultyListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      client.on('error', errorSpy);
      client.on('message', faultyListener);
      client.connect('http://localhost:5000/api/v1/strategist/feed');
      vi.advanceTimersByTime(50);

      // Send message that will trigger faulty listener
      client.eventSource.simulateMessage({ test: 'data' });

      // Should not crash the client
      expect(client.getStatus().isConnected).toBe(true);
      expect(faultyListener).toHaveBeenCalled();
    });
  });
});

describe('SSE Reliability Integration Tests', () => {
  let integrationClient;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    integrationClient = new SSEClient({
      reconnectDelay: 100,
      maxReconnectAttempts: 5
    });
  });

  afterEach(() => {
    if (integrationClient) {
      integrationClient.disconnect();
    }
    vi.useRealTimers();
  });

  it('should maintain connection through multiple network disruptions', async () => {
    const connectedSpy = vi.fn();
    const reconnectingSpy = vi.fn();
    
    integrationClient.on('connected', connectedSpy);
    integrationClient.on('reconnecting', reconnectingSpy);

    // Initial connection
    integrationClient.connect('http://localhost:5000/api/v1/strategist/feed');
    vi.advanceTimersByTime(50);
    expect(connectedSpy).toHaveBeenCalledTimes(1);

    // Simulate multiple network disruptions
    for (let i = 0; i < 3; i++) {
      integrationClient.eventSource.simulateError();
      vi.advanceTimersByTime(150); // Wait for reconnection
      expect(reconnectingSpy).toHaveBeenCalledTimes(i + 1);
      expect(connectedSpy).toHaveBeenCalledTimes(i + 2);
    }

    // Verify final state
    const status = integrationClient.getStatus();
    expect(status.isConnected).toBe(true);
    expect(status.reconnectAttempts).toBe(0); // Reset after successful connection
  });
});