/**
 * SSE Performance Monitor - Phase 4.2
 * 
 * Real-time performance monitoring and validation for SSE streaming functionality.
 * Provides metrics collection, performance analysis, and health monitoring.
 */

class SSEPerformanceMonitor {
  constructor() {
    this.metrics = {
      connections: {
        total: 0,
        successful: 0,
        failed: 0,
        currentActive: 0
      },
      latency: {
        connection: [],
        heartbeat: [],
        message: []
      },
      messages: {
        total: 0,
        byType: {},
        errors: 0,
        processed: 0
      },
      reliability: {
        uptime: 0,
        downtime: 0,
        reconnections: 0,
        lastConnected: null,
        lastDisconnected: null
      },
      performance: {
        memoryUsage: [],
        processingTime: [],
        queueSize: []
      }
    };
    
    this.startTime = Date.now();
    this.isMonitoring = false;
    this.performanceTimer = null;
    this.healthCheckTimer = null;
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    console.log('[SSE Performance Monitor] Started monitoring');
    
    // Start periodic performance collection
    this.performanceTimer = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 5000); // Collect every 5 seconds
    
    // Start health check
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Health check every 30 seconds
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    console.log('[SSE Performance Monitor] Stopped monitoring');
  }

  /**
   * Record connection attempt
   */
  recordConnectionAttempt(ward, startTime) {
    this.metrics.connections.total++;
    
    return {
      ward,
      startTime,
      endTime: null,
      success: false,
      latency: null
    };
  }

  /**
   * Record successful connection
   */
  recordConnectionSuccess(attempt) {
    attempt.endTime = Date.now();
    attempt.success = true;
    attempt.latency = attempt.endTime - attempt.startTime;
    
    this.metrics.connections.successful++;
    this.metrics.connections.currentActive++;
    this.metrics.latency.connection.push(attempt.latency);
    this.metrics.reliability.lastConnected = attempt.endTime;
    
    // Keep only last 100 latency measurements
    if (this.metrics.latency.connection.length > 100) {
      this.metrics.latency.connection = this.metrics.latency.connection.slice(-100);
    }
    
    console.log(`[SSE Performance Monitor] Connection successful: ${attempt.latency}ms latency`);
  }

  /**
   * Record connection failure
   */
  recordConnectionFailure(attempt, error) {
    attempt.endTime = Date.now();
    attempt.success = false;
    attempt.error = error.message;
    
    this.metrics.connections.failed++;
    this.metrics.reliability.lastDisconnected = attempt.endTime;
    
    console.warn(`[SSE Performance Monitor] Connection failed:`, error);
  }

  /**
   * Record connection closed
   */
  recordConnectionClosed(reason) {
    this.metrics.connections.currentActive = Math.max(0, this.metrics.connections.currentActive - 1);
    this.metrics.reliability.lastDisconnected = Date.now();
    
    if (reason === 'reconnection') {
      this.metrics.reliability.reconnections++;
    }
    
    console.log(`[SSE Performance Monitor] Connection closed: ${reason}`);
  }

  /**
   * Record message received
   */
  recordMessageReceived(type, data, processingStartTime) {
    const processingTime = Date.now() - processingStartTime;
    
    this.metrics.messages.total++;
    this.metrics.messages.byType[type] = (this.metrics.messages.byType[type] || 0) + 1;
    this.metrics.performance.processingTime.push(processingTime);
    
    // Record heartbeat latency if available
    if (type === 'heartbeat' && data.server_time) {
      const latency = Date.now() - new Date(data.server_time).getTime();
      this.metrics.latency.heartbeat.push(latency);
      
      // Keep only last 50 heartbeat latencies
      if (this.metrics.latency.heartbeat.length > 50) {
        this.metrics.latency.heartbeat = this.metrics.latency.heartbeat.slice(-50);
      }
    }
    
    // Keep only last 1000 processing times
    if (this.metrics.performance.processingTime.length > 1000) {
      this.metrics.performance.processingTime = this.metrics.performance.processingTime.slice(-1000);
    }
    
    this.metrics.messages.processed++;
  }

  /**
   * Record message processing error
   */
  recordMessageError(type, error) {
    this.metrics.messages.errors++;
    
    console.error(`[SSE Performance Monitor] Message processing error (${type}):`, error);
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    if (!this.isMonitoring) return;
    
    // Collect memory usage if available
    if (performance.memory) {
      this.metrics.performance.memoryUsage.push({
        timestamp: Date.now(),
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      });
      
      // Keep only last 100 memory measurements
      if (this.metrics.performance.memoryUsage.length > 100) {
        this.metrics.performance.memoryUsage = this.metrics.performance.memoryUsage.slice(-100);
      }
    }
    
    // Update uptime
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    if (this.metrics.connections.currentActive > 0) {
      this.metrics.reliability.uptime = totalTime - this.metrics.reliability.downtime;
    } else {
      if (this.metrics.reliability.lastDisconnected) {
        this.metrics.reliability.downtime += now - this.metrics.reliability.lastDisconnected;
      }
    }
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    if (!this.isMonitoring) return;
    
    const health = this.getHealthStatus();
    
    if (health.status !== 'healthy') {
      console.warn('[SSE Performance Monitor] Health check warning:', health);
    } else {
      console.log('[SSE Performance Monitor] Health check passed:', health.score);
    }
    
    // Emit health status for monitoring
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sse-health-check', { 
        detail: health 
      }));
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    return {
      uptime: Math.round((this.metrics.reliability.uptime / totalTime) * 100),
      connections: {
        total: this.metrics.connections.total,
        successRate: this.metrics.connections.total > 0 
          ? Math.round((this.metrics.connections.successful / this.metrics.connections.total) * 100)
          : 0,
        active: this.metrics.connections.currentActive,
        reconnections: this.metrics.reliability.reconnections
      },
      latency: {
        connection: this.calculateLatencyStats(this.metrics.latency.connection),
        heartbeat: this.calculateLatencyStats(this.metrics.latency.heartbeat),
        message: this.calculateLatencyStats(this.metrics.performance.processingTime)
      },
      messages: {
        total: this.metrics.messages.total,
        processed: this.metrics.messages.processed,
        errorRate: this.metrics.messages.total > 0
          ? Math.round((this.metrics.messages.errors / this.metrics.messages.total) * 100)
          : 0,
        byType: this.metrics.messages.byType
      },
      memory: this.getMemoryStats(),
      timestamp: now,
      monitoringDuration: totalTime
    };
  }

  /**
   * Calculate latency statistics
   */
  calculateLatencyStats(latencies) {
    if (!latencies || latencies.length === 0) {
      return null;
    }
    
    const sorted = [...latencies].sort((a, b) => a - b);
    const length = sorted.length;
    
    return {
      min: sorted[0],
      max: sorted[length - 1],
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / length),
      p50: sorted[Math.floor(length * 0.5)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)],
      samples: length
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (this.metrics.performance.memoryUsage.length === 0) {
      return null;
    }
    
    const latest = this.metrics.performance.memoryUsage[this.metrics.performance.memoryUsage.length - 1];
    const usagePercent = Math.round((latest.used / latest.total) * 100);
    
    return {
      current: {
        used: Math.round(latest.used / 1024 / 1024), // MB
        total: Math.round(latest.total / 1024 / 1024), // MB
        usagePercent
      },
      samples: this.metrics.performance.memoryUsage.length
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const summary = this.getPerformanceSummary();
    let score = 100;
    let issues = [];
    let status = 'healthy';
    
    // Check connection success rate
    if (summary.connections.successRate < 95) {
      score -= (95 - summary.connections.successRate);
      issues.push(`Low connection success rate: ${summary.connections.successRate}%`);
    }
    
    // Check uptime
    if (summary.uptime < 95) {
      score -= (95 - summary.uptime);
      issues.push(`Low uptime: ${summary.uptime}%`);
    }
    
    // Check error rate
    if (summary.messages.errorRate > 5) {
      score -= summary.messages.errorRate;
      issues.push(`High message error rate: ${summary.messages.errorRate}%`);
    }
    
    // Check heartbeat latency
    if (summary.latency.heartbeat && summary.latency.heartbeat.avg > 5000) {
      score -= 10;
      issues.push(`High heartbeat latency: ${summary.latency.heartbeat.avg}ms`);
    }
    
    // Check memory usage
    if (summary.memory && summary.memory.current.usagePercent > 80) {
      score -= (summary.memory.current.usagePercent - 80);
      issues.push(`High memory usage: ${summary.memory.current.usagePercent}%`);
    }
    
    // Determine status
    if (score >= 90) {
      status = 'healthy';
    } else if (score >= 70) {
      status = 'warning';
    } else {
      status = 'critical';
    }
    
    return {
      status,
      score: Math.max(0, score),
      issues,
      summary,
      timestamp: Date.now()
    };
  }

  /**
   * Get detailed metrics for debugging
   */
  getDetailedMetrics() {
    return {
      ...this.metrics,
      isMonitoring: this.isMonitoring,
      startTime: this.startTime,
      monitoringDuration: Date.now() - this.startTime
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      connections: {
        total: 0,
        successful: 0,
        failed: 0,
        currentActive: 0
      },
      latency: {
        connection: [],
        heartbeat: [],
        message: []
      },
      messages: {
        total: 0,
        byType: {},
        errors: 0,
        processed: 0
      },
      reliability: {
        uptime: 0,
        downtime: 0,
        reconnections: 0,
        lastConnected: null,
        lastDisconnected: null
      },
      performance: {
        memoryUsage: [],
        processingTime: [],
        queueSize: []
      }
    };
    
    this.startTime = Date.now();
    
    console.log('[SSE Performance Monitor] Metrics reset');
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const summary = this.getPerformanceSummary();
    const health = this.getHealthStatus();
    
    const report = {
      timestamp: new Date().toISOString(),
      monitoring_duration: summary.monitoringDuration,
      health_status: health,
      performance_summary: summary,
      recommendations: this.generateRecommendations(health, summary)
    };
    
    console.log('[SSE Performance Monitor] Performance Report:', report);
    
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(health, summary) {
    const recommendations = [];
    
    if (summary.connections.successRate < 95) {
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        issue: 'Low connection success rate',
        suggestion: 'Check network stability and server availability'
      });
    }
    
    if (summary.messages.errorRate > 5) {
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        issue: 'High message error rate',
        suggestion: 'Review message processing logic and error handling'
      });
    }
    
    if (summary.latency.connection && summary.latency.connection.avg > 2000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        issue: 'Slow connection times',
        suggestion: 'Optimize connection parameters and check network latency'
      });
    }
    
    if (summary.memory && summary.memory.current.usagePercent > 80) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: 'High memory usage',
        suggestion: 'Review memory leaks and optimize message handling'
      });
    }
    
    if (summary.connections.reconnections > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'stability',
        issue: 'Frequent reconnections',
        suggestion: 'Investigate connection stability and retry logic'
      });
    }
    
    return recommendations;
  }
}

// Create global instance
const ssePerformanceMonitor = new SSEPerformanceMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  ssePerformanceMonitor.start();
}

export default ssePerformanceMonitor;