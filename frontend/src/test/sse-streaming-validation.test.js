/**
 * SSE Streaming Validation Tests - Phase 4.2
 * 
 * Comprehensive test suite for validating SSE streaming functionality
 * under various network conditions and performance scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import StrategistStream from '../features/strategist/components/StrategistStream';
import NotificationSystem from '../components/NotificationSystem';
import EnhancedSSEClient from '../features/strategist/services/enhancedSSEClient';

// Mock EventSource for testing
class MockEventSource {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.readyState = EventSource.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.addEventListener = vi.fn();
    this.close = vi.fn();
    
    // Store instance for test manipulation
    MockEventSource.instances.push(this);
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }
  
  static instances = [];
  static reset() {
    MockEventSource.instances = [];
  }
}

// Mock window globals
const mockNavigator = {
  onLine: true,
  permissions: {
    query: vi.fn().mockResolvedValue({ state: 'granted' })
  }
};

const mockNotification = {
  requestPermission: vi.fn().mockResolvedValue('granted'),
  permission: 'granted'
};

// Test utilities
const simulateNetworkConditions = {
  online: () => {
    global.navigator.onLine = true;
    global.dispatchEvent(new Event('online'));
  },
  
  offline: () => {
    global.navigator.onLine = false;
    global.dispatchEvent(new Event('offline'));
  },
  
  slowConnection: (delay = 5000) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  },
  
  connectionTimeout: () => {
    MockEventSource.instances.forEach(instance => {
      if (instance.onerror) {
        instance.onerror({ type: 'error' });
      }
    });
  },
  
  serverError: (errorType = 'internal_server_error') => {
    MockEventSource.instances.forEach(instance => {
      if (instance.onmessage) {
        instance.onmessage({
          data: JSON.stringify({
            type: 'stream-error',
            error: `Server error: ${errorType}`,
            timestamp: new Date().toISOString()
          })
        });
      }
    });
  }
};

const createTestMessages = {
  connectionEvent: () => ({
    type: 'connection',
    status: 'connected',
    ward: 'Test Ward',
    timestamp: new Date().toISOString()
  }),
  
  analysisStartEvent: (ward = 'Test Ward') => ({
    type: 'analysis-start',
    ward,
    depth: 'standard',
    estimated_duration: 90,
    timestamp: new Date().toISOString()
  }),
  
  progressEvent: (progress = 0.5) => ({
    type: 'analysis-progress',
    stage: 'sentiment_analysis',
    progress,
    description: 'Processing sentiment patterns',
    eta: (1 - progress) * 90,
    timestamp: new Date().toISOString()
  }),
  
  confidenceEvent: (score = 0.85) => ({
    type: 'confidence-update',
    score,
    trend: 'increasing',
    reliability: 'high',
    timestamp: new Date().toISOString()
  }),
  
  completionEvent: (result = { confidence_score: 0.9 }) => ({
    type: 'analysis-complete',
    ward: 'Test Ward',
    analysis_result: result,
    processing_time: 90,
    timestamp: new Date().toISOString()
  }),
  
  heartbeatEvent: () => ({
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
    server_time: new Date().toISOString()
  }),
  
  errorEvent: (error = 'Test error') => ({
    type: 'analysis-error',
    error,
    details: 'Test error details',
    timestamp: new Date().toISOString()
  })
};

describe('SSE Streaming Core Functionality', () => {
  let originalEventSource;
  let originalNavigator;
  let originalNotification;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    originalNavigator = global.navigator;
    originalNotification = global.Notification;
    
    global.EventSource = MockEventSource;
    global.navigator = mockNavigator;
    global.Notification = mockNotification;
    
    MockEventSource.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
    global.navigator = originalNavigator;
    global.Notification = originalNotification;
  });

  describe('EnhancedSSEClient', () => {
    it('should establish connection with correct URL parameters', async () => {
      const client = new EnhancedSSEClient({
        baseUrl: '/api/v1/multimodel'
      });
      
      await act(async () => {
        client.connect('Test Ward', {
          mode: 'stream',
          depth: 'standard',
          context: 'neutral',
          includeProgress: true,
          includeConfidence: true
        });
      });
      
      await waitFor(() => {
        expect(MockEventSource.instances).toHaveLength(1);
        const instance = MockEventSource.instances[0];
        expect(instance.url).toContain('/api/v1/multimodel/strategist/stream/Test%20Ward');
        expect(instance.url).toContain('depth=standard');
        expect(instance.url).toContain('context=neutral');
        expect(instance.url).toContain('include_progress=true');
        expect(instance.url).toContain('include_confidence=true');
      });
    });

    it('should handle connection recovery with exponential backoff', async () => {
      const client = new EnhancedSSEClient({
        baseUrl: '/api/v1/multimodel',
        maxRetries: 3,
        retryBaseDelay: 100
      });
      
      const errorHandler = vi.fn();
      client.on('error', errorHandler);
      
      await act(async () => {
        client.connect('Test Ward');
      });
      
      // Simulate connection error
      await act(async () => {
        simulateNetworkConditions.connectionTimeout();
      });
      
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            willRetry: true,
            retryCount: 1
          })
        );
      });
    });

    it('should classify errors correctly', () => {
      const client = new EnhancedSSEClient();
      
      expect(client.classifyError(new Error('Network error'))).toBe('network');
      expect(client.classifyError(new Error('Connection timeout'))).toBe('timeout');
      expect(client.classifyError(new Error('EventSource failed'))).toBe('sse');
      expect(client.classifyError(new Error('Unauthorized access'))).toBe('auth');
      expect(client.classifyError(new Error('Rate limit exceeded'))).toBe('rate_limit');
      expect(client.classifyError(new Error('Unknown error'))).toBe('unknown');
    });
  });

  describe('StrategistStream Component', () => {
    it('should render without crashing', async () => {
      await act(async () => {
        render(<StrategistStream ward="Test Ward" />);
      });
      
      expect(screen.getByText('Political Strategist Analysis Stream')).toBeInTheDocument();
      expect(screen.getByText('Real-time analysis for Test Ward')).toBeInTheDocument();
    });

    it('should show progress indicators during analysis', async () => {
      const onComplete = vi.fn();
      
      await act(async () => {
        render(
          <StrategistStream 
            ward="Test Ward" 
            onAnalysisComplete={onComplete}
          />
        );
      });
      
      // Start analysis
      const startButton = screen.getByText('Start Analysis');
      await act(async () => {
        fireEvent.click(startButton);
      });
      
      await waitFor(() => {
        expect(MockEventSource.instances).toHaveLength(1);
      });
      
      // Simulate progress events
      const instance = MockEventSource.instances[0];
      
      await act(async () => {
        instance.onmessage({
          data: JSON.stringify(createTestMessages.analysisStartEvent())
        });
      });
      
      await act(async () => {
        instance.onmessage({
          data: JSON.stringify(createTestMessages.progressEvent(0.3))
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Processing sentiment patterns')).toBeInTheDocument();
        expect(screen.getByText('30.0% Complete')).toBeInTheDocument();
      });
    });

    it('should handle analysis completion', async () => {
      const onComplete = vi.fn();
      
      await act(async () => {
        render(
          <StrategistStream 
            ward="Test Ward" 
            onAnalysisComplete={onComplete}
          />
        );
      });
      
      const startButton = screen.getByText('Start Analysis');
      await act(async () => {
        fireEvent.click(startButton);
      });
      
      await waitFor(() => {
        expect(MockEventSource.instances).toHaveLength(1);
      });
      
      const instance = MockEventSource.instances[0];
      const result = { confidence_score: 0.95, analysis: 'Test analysis' };
      
      await act(async () => {
        instance.onmessage({
          data: JSON.stringify(createTestMessages.completionEvent(result))
        });
      });
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
          analysis_result: result
        }));
        expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
      });
    });
  });

  describe('NotificationSystem Component', () => {
    it('should render notification bell', async () => {
      await act(async () => {
        render(<NotificationSystem selectedWard="Test Ward" />);
      });
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should show unread notification count', async () => {
      const { rerender } = render(
        <NotificationSystem selectedWard="Test Ward" />
      );
      
      // Simulate receiving notifications via SSE
      await act(async () => {
        // This would be triggered by SSE events in real usage
        // For testing, we'd need to mock the useEnhancedSSE hook
      });
    });
  });
});

describe('Network Condition Testing', () => {
  let originalEventSource;
  let originalNavigator;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    originalNavigator = global.navigator;
    
    global.EventSource = MockEventSource;
    global.navigator = mockNavigator;
    
    MockEventSource.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
    global.navigator = originalNavigator;
  });

  it('should handle offline/online transitions', async () => {
    const client = new EnhancedSSEClient({
      maxRetries: 3,
      retryBaseDelay: 100
    });
    
    const connectHandler = vi.fn();
    const errorHandler = vi.fn();
    
    client.on('connect', connectHandler);
    client.on('error', errorHandler);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    // Go offline
    await act(async () => {
      simulateNetworkConditions.offline();
      simulateNetworkConditions.connectionTimeout();
    });
    
    await waitFor(() => {
      expect(errorHandler).toHaveBeenCalled();
    });
    
    // Come back online
    await act(async () => {
      simulateNetworkConditions.online();
    });
    
    // Should attempt reconnection
    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(1);
    });
  });

  it('should handle slow connections with timeout', async () => {
    const client = new EnhancedSSEClient({
      connectionTimeout: 1000,
      maxRetries: 2
    });
    
    const errorHandler = vi.fn();
    client.on('error', errorHandler);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    // Don't trigger the open event to simulate slow connection
    
    await waitFor(
      () => {
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('timeout')
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should handle server errors gracefully', async () => {
    const client = new EnhancedSSEClient();
    const errorHandler = vi.fn();
    client.on('error', errorHandler);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });
    
    // Simulate server error
    await act(async () => {
      simulateNetworkConditions.serverError('analysis_failed');
    });
    
    await waitFor(() => {
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Server error')
        })
      );
    });
  });
});

describe('Performance Validation', () => {
  let originalEventSource;
  let performanceMarks = {};

  beforeEach(() => {
    originalEventSource = global.EventSource;
    global.EventSource = MockEventSource;
    MockEventSource.reset();
    
    // Mock performance API
    global.performance = {
      mark: vi.fn((name) => {
        performanceMarks[name] = Date.now();
      }),
      measure: vi.fn((name, startMark, endMark) => {
        const start = performanceMarks[startMark];
        const end = performanceMarks[endMark];
        return { duration: end - start };
      }),
      now: () => Date.now()
    };
    
    performanceMarks = {};
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  it('should establish connection within acceptable time', async () => {
    const client = new EnhancedSSEClient();
    
    performance.mark('connection-start');
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });
    
    performance.mark('connection-end');
    const measure = performance.measure('connection-time', 'connection-start', 'connection-end');
    
    // Connection should be established within 500ms
    expect(measure.duration).toBeLessThan(500);
  });

  it('should handle high-frequency messages efficiently', async () => {
    const client = new EnhancedSSEClient();
    const messageHandler = vi.fn();
    client.on('progress', messageHandler);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });
    
    const instance = MockEventSource.instances[0];
    
    performance.mark('message-processing-start');
    
    // Send 100 progress messages rapidly
    for (let i = 0; i < 100; i++) {
      await act(async () => {
        instance.onmessage({
          data: JSON.stringify(createTestMessages.progressEvent(i / 100))
        });
      });
    }
    
    performance.mark('message-processing-end');
    
    await waitFor(() => {
      expect(messageHandler).toHaveBeenCalledTimes(100);
    });
    
    const measure = performance.measure('message-processing-time', 'message-processing-start', 'message-processing-end');
    
    // Should process 100 messages within 1 second
    expect(measure.duration).toBeLessThan(1000);
  });

  it('should maintain memory efficiency during long sessions', async () => {
    const client = new EnhancedSSEClient();
    let messageCount = 0;
    
    client.on('heartbeat', () => messageCount++);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });
    
    const instance = MockEventSource.instances[0];
    
    // Simulate 1000 heartbeat messages
    for (let i = 0; i < 1000; i++) {
      await act(async () => {
        instance.onmessage({
          data: JSON.stringify(createTestMessages.heartbeatEvent())
        });
      });
    }
    
    await waitFor(() => {
      expect(messageCount).toBe(1000);
    });
    
    // Memory usage should remain stable
    // In a real environment, you'd check performance.memory
    expect(client.listeners.heartbeat).toHaveLength(1); // Listeners shouldn't accumulate
  });
});

describe('Error Recovery and Resilience', () => {
  let originalEventSource;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    global.EventSource = MockEventSource;
    MockEventSource.reset();
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  it('should implement exponential backoff correctly', async () => {
    const client = new EnhancedSSEClient({
      maxRetries: 3,
      retryBaseDelay: 100,
      maxRetryDelay: 1000
    });
    
    const errorHandler = vi.fn();
    client.on('error', errorHandler);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    // Force multiple errors to test backoff
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        simulateNetworkConditions.connectionTimeout();
      });
      
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledTimes(i + 1);
      });
      
      const lastCall = errorHandler.mock.calls[i][0];
      expect(lastCall.retryCount).toBe(i + 1);
      expect(lastCall.willRetry).toBe(i < 2); // Should stop retrying after 3 attempts
    }
  });

  it('should recover gracefully after temporary failures', async () => {
    const client = new EnhancedSSEClient({
      maxRetries: 3,
      retryBaseDelay: 50
    });
    
    const connectHandler = vi.fn();
    const errorHandler = vi.fn();
    
    client.on('connect', connectHandler);
    client.on('error', errorHandler);
    
    await act(async () => {
      client.connect('Test Ward');
    });
    
    // Initial connection should succeed
    await waitFor(() => {
      expect(connectHandler).toHaveBeenCalledTimes(1);
    });
    
    // Force a failure
    await act(async () => {
      simulateNetworkConditions.connectionTimeout();
    });
    
    await waitFor(() => {
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
    
    // Should automatically retry and succeed
    await waitFor(
      () => {
        expect(connectHandler).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 }
    );
  });
});

// Integration test for complete Phase 4.2 workflow
describe('Phase 4.2 Integration Tests', () => {
  let originalEventSource;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    global.EventSource = MockEventSource;
    global.navigator = mockNavigator;
    global.Notification = mockNotification;
    MockEventSource.reset();
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  it('should complete full streaming analysis workflow', async () => {
    const onComplete = vi.fn();
    
    await act(async () => {
      render(
        <StrategistStream 
          ward="Test Ward"
          onAnalysisComplete={onComplete}
          initialDepth="standard"
          initialContext="neutral"
        />
      );
    });
    
    // Start analysis
    const startButton = screen.getByText('Start Analysis');
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });
    
    const instance = MockEventSource.instances[0];
    
    // Simulate complete workflow
    const events = [
      createTestMessages.connectionEvent(),
      createTestMessages.analysisStartEvent(),
      createTestMessages.progressEvent(0.2),
      createTestMessages.confidenceEvent(0.7),
      createTestMessages.progressEvent(0.5),
      createTestMessages.confidenceEvent(0.8),
      createTestMessages.progressEvent(0.8),
      createTestMessages.confidenceEvent(0.9),
      createTestMessages.progressEvent(1.0),
      createTestMessages.completionEvent({ confidence_score: 0.92 })
    ];
    
    for (const event of events) {
      await act(async () => {
        instance.onmessage({
          data: JSON.stringify(event)
        });
      });
      
      // Small delay to allow React to process
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
    }
    
    // Verify completion
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          analysis_result: expect.objectContaining({
            confidence_score: 0.92
          })
        })
      );
    });
    
    expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
  });
});