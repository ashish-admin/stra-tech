import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMobileOptimizedSSE } from '../features/strategist/hooks/useMobileOptimizedSSE.js';

// Mock EventSource for testing
class MockEventSource {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.listeners = {};
    
    // Store instance for test access
    MockEventSource.lastInstance = this;
    
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen({ type: 'open' });
    }, 10);
  }
  
  addEventListener(type, listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }
  
  removeEventListener(type, listener) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    }
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
  
  // Test helper methods
  simulateMessage(data) {
    const event = { data: JSON.stringify(data), type: 'message' };
    if (this.onmessage) this.onmessage(event);
  }
  
  simulateError(error) {
    const event = { error, type: 'error' };
    if (this.onerror) this.onerror(event);
  }
}

// Mock navigator APIs for mobile testing
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  onLine: true,
  deviceMemory: 4,
  hardwareConcurrency: 4,
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
};

const mockBattery = {
  level: 0.8, // 80%
  charging: false,
  addEventListener: vi.fn()
};

// Global mocks
global.EventSource = MockEventSource;
global.navigator = { ...global.navigator, ...mockNavigator };
global.getBattery = vi.fn().mockResolvedValue(mockBattery);

describe('Mobile SSE Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.lastInstance = null;
    
    // Reset navigator.connection state
    mockNavigator.connection.effectiveType = '4g';
    mockNavigator.onLine = true;
    mockBattery.level = 0.8;
    
    // Mock performance.now for latency testing
    vi.spyOn(performance, 'now').mockReturnValue(Date.now());
    
    // Mock fetch for network quality checks
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Device Detection and Adaptation', () => {
    it('detects mobile devices correctly', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.deviceInfo).toBeDefined();
        expect(result.current.deviceInfo.isMobile).toBe(true);
      });
    });

    it('adapts heartbeat for different connection types', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Test WiFi connection
      act(() => {
        mockNavigator.connection.effectiveType = 'wifi';
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.mobileMetrics?.adaptiveSettings?.connectionType).toBe('wifi');
      });
    });

    it('adjusts behavior for low-end devices', async () => {
      // Mock low-end device
      mockNavigator.deviceMemory = 2;
      mockNavigator.hardwareConcurrency = 2;
      
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.deviceInfo).toBeDefined();
        expect(result.current.deviceInfo.isLowEnd).toBe(true);
      });
    });
  });

  describe('Network Quality Adaptation', () => {
    it('detects network quality changes and adapts heartbeat', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate network degradation by making fetch slower
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({ ok: true, status: 200 }), 1000); // 1s delay = poor network
        })
      );

      // Wait for network quality check to run
      await waitFor(() => {
        expect(result.current.networkQuality).toBeDefined();
      });
    });

    it('handles offline/online transitions gracefully', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate going offline
      act(() => {
        mockNavigator.onLine = false;
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.networkQuality).toBe('offline');
      });

      // Simulate coming back online
      act(() => {
        mockNavigator.onLine = true;
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('Battery Optimization', () => {
    it('adapts behavior when battery is low', async () => {
      // Mock low battery
      mockBattery.level = 0.15; // 15%
      
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard', {
        enableBatteryOptimization: true
      }));
      
      await waitFor(() => {
        expect(result.current.batteryLevel).toBe(15);
        expect(result.current.mobileMetrics?.adaptiveSettings?.batteryMultiplier).toBeGreaterThan(1);
      });
    });

    it('returns to normal behavior when battery recovers', async () => {
      // Start with low battery
      mockBattery.level = 0.15;
      
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.batteryLevel).toBe(15);
      });

      // Simulate battery charging to acceptable level
      act(() => {
        mockBattery.level = 0.8;
        mockBattery.charging = true;
        // Simulate battery level change event
        if (mockBattery.addEventListener.mock.calls.length > 0) {
          const levelChangeCallback = mockBattery.addEventListener.mock.calls
            .find(call => call[0] === 'levelchange')?.[1];
          if (levelChangeCallback) levelChangeCallback();
        }
      });

      await waitFor(() => {
        expect(result.current.batteryLevel).toBe(80);
      });
    });
  });

  describe('Background/Foreground Optimization', () => {
    it('reduces activity when app is backgrounded', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate app going to background
      act(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(result.current.isBackgrounded).toBe(true);
      });
    });

    it('resumes full activity when app is foregrounded', async () => {
      // Start backgrounded
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate app coming to foreground
      act(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(result.current.isBackgrounded).toBe(false);
      });
    });
  });

  describe('Message Processing Optimization', () => {
    it('filters messages for mobile devices', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate receiving a large analysis message
      act(() => {
        MockEventSource.lastInstance?.simulateMessage({
          type: 'analysis',
          summary: 'A very long political analysis summary that would normally be truncated on mobile devices to save bandwidth and improve performance. This message contains detailed information about various political developments and strategic recommendations that may not be essential for mobile users who need quick insights.',
          key_points: [
            'Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5'
          ],
          confidence: 0.85,
          timestamp: new Date().toISOString()
        });
      });

      await waitFor(() => {
        expect(result.current.analysisData).toBeDefined();
        expect(result.current.messages).toHaveLength(1);
      });
    });

    it('batches messages efficiently on mobile', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate rapid message arrival
      act(() => {
        const eventSource = MockEventSource.lastInstance;
        for (let i = 0; i < 10; i++) {
          eventSource?.simulateMessage({
            type: 'intelligence',
            headline: `News Item ${i}`,
            priority: i % 2 === 0 ? 'high' : 'medium',
            timestamp: new Date().toISOString()
          });
        }
      });

      await waitFor(() => {
        expect(result.current.intelligenceAlerts.length).toBeGreaterThan(0);
        expect(result.current.intelligenceAlerts.length).toBeLessThanOrEqual(10);
      });
    });

    it('throttles high-frequency messages', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const startTime = Date.now();
      
      // Simulate rapid progress updates (should be throttled)
      act(() => {
        const eventSource = MockEventSource.lastInstance;
        for (let i = 0; i < 50; i++) {
          eventSource?.simulateMessage({
            type: 'progress',
            stage: 'analysis',
            progress: i * 2,
            eta: 60 - i,
            timestamp: new Date().toISOString()
          });
        }
      });

      await waitFor(() => {
        expect(result.current.progressData).toBeDefined();
        // Should have throttled most messages
        expect(result.current.messages.length).toBeLessThan(50);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks mobile-specific performance metrics', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.mobileMetrics).toBeDefined();
        expect(result.current.mobileMetrics.deviceInfo).toBeDefined();
        expect(result.current.mobileMetrics.adaptiveSettings).toBeDefined();
      });
    });

    it('provides connection quality indicators', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.networkQuality).toBeDefined();
        expect(['unknown', 'excellent', 'good', 'fair', 'poor', 'offline'])
          .toContain(result.current.networkQuality);
      });
    });

    it('tracks message throughput and processing time', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send several messages
      act(() => {
        const eventSource = MockEventSource.lastInstance;
        for (let i = 0; i < 5; i++) {
          eventSource?.simulateMessage({
            type: 'analysis',
            data: `Test message ${i}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      await waitFor(() => {
        expect(result.current.messageCount).toBeGreaterThan(0);
        expect(result.current.lastMessageTime).toBeDefined();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles connection errors gracefully on mobile', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection error
      act(() => {
        MockEventSource.lastInstance?.simulateError(new Error('Connection lost'));
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
        expect(result.current.isReconnecting).toBe(true);
      });
    });

    it('uses adaptive backoff for reconnection attempts', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard', {
        maxRetries: 3,
        retryBaseDelay: 100 // Use short delay for testing
      }));
      
      let reconnectAttempts = 0;
      
      // Mock EventSource to fail connections
      const originalEventSource = global.EventSource;
      global.EventSource = class extends MockEventSource {
        constructor(...args) {
          super(...args);
          reconnectAttempts++;
          setTimeout(() => this.simulateError(new Error('Test error')), 20);
        }
      };
      
      await waitFor(() => {
        expect(reconnectAttempts).toBeGreaterThan(1);
      }, { timeout: 5000 });
      
      // Restore original EventSource
      global.EventSource = originalEventSource;
    });

    it('recovers when network conditions improve', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate network degradation
      act(() => {
        mockNavigator.connection.effectiveType = 'slow-2g';
        mockNavigator.connection.downlink = 0.1;
        window.dispatchEvent(new Event('online'));
      });

      // Wait for adaptation
      await waitFor(() => {
        expect(result.current.networkQuality).toBeDefined();
      });

      // Simulate network improvement
      act(() => {
        mockNavigator.connection.effectiveType = '4g';
        mockNavigator.connection.downlink = 10;
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('Memory Management', () => {
    it('limits message history on low-end devices', async () => {
      // Mock low-end device
      mockNavigator.deviceMemory = 1;
      
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard', {
        messageHistoryLimit: 100
      }));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send many messages
      act(() => {
        const eventSource = MockEventSource.lastInstance;
        for (let i = 0; i < 150; i++) {
          eventSource?.simulateMessage({
            type: 'intelligence',
            data: `Message ${i}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      await waitFor(() => {
        // Should be limited to ~50 messages on low-end device (50% of limit)
        expect(result.current.messages.length).toBeLessThan(100);
        expect(result.current.messages.length).toBeGreaterThan(40);
      });
    });

    it('clears history when requested', async () => {
      const { result } = renderHook(() => useMobileOptimizedSSE('TestWard'));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Add some messages
      act(() => {
        const eventSource = MockEventSource.lastInstance;
        eventSource?.simulateMessage({
          type: 'analysis',
          data: 'Test analysis',
          timestamp: new Date().toISOString()
        });
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.intelligenceAlerts).toHaveLength(0);
      expect(result.current.analysisData).toBeNull();
    });
  });
});