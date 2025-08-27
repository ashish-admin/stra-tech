"""
Performance Metrics Collection for Political Strategist

Implements comprehensive metrics collection for monitoring system performance,
AI model performance, and user interaction patterns.
"""

import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps
import json

# Import Redis client from cache module for health checks
try:
    from ..cache import get_redis_client, is_redis_available
except ImportError:
    # Fallback if cache module is not available
    def get_redis_client():
        return None
    def is_redis_available():
        return False

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Collects and aggregates performance metrics."""
    
    def __init__(self):
        self.counters = defaultdict(int)
        self.timers = defaultdict(list)
        self.gauges = defaultdict(float)
        self.histograms = defaultdict(lambda: deque(maxlen=1000))
        self.errors = defaultdict(int)
        self.api_calls = defaultdict(lambda: {"count": 0, "total_time": 0.0})
        
    def increment(self, metric: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric."""
        key = self._build_key(metric, tags)
        self.counters[key] += value
        logger.debug(f"Incremented {key} by {value}")
        
    def timing(self, metric: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a timing metric."""
        key = self._build_key(metric, tags)
        self.timers[key].append(value)
        # Keep only last 100 measurements
        if len(self.timers[key]) > 100:
            self.timers[key] = self.timers[key][-100:]
        
    def gauge(self, metric: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric."""
        key = self._build_key(metric, tags)
        self.gauges[key] = value
        
    def histogram(self, metric: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Add value to histogram."""
        key = self._build_key(metric, tags)
        self.histograms[key].append({
            'value': value,
            'timestamp': datetime.now().isoformat()
        })
        
    def error(self, metric: str, error_type: str, tags: Optional[Dict[str, str]] = None):
        """Record an error."""
        tags = tags or {}
        tags['error_type'] = error_type
        key = self._build_key(metric, tags)
        self.errors[key] += 1
        
    def api_call(self, endpoint: str, duration: float, status_code: int):
        """Record API call metrics."""
        key = f"api.{endpoint}"
        self.api_calls[key]["count"] += 1
        self.api_calls[key]["total_time"] += duration
        
        # Track status codes
        status_key = f"api.{endpoint}.status_{status_code}"
        self.counters[status_key] += 1
        
    def _build_key(self, metric: str, tags: Optional[Dict[str, str]] = None) -> str:
        """Build metric key with tags."""
        if not tags:
            return metric
        tag_str = ",".join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{metric},{tag_str}"
        
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics."""
        summary = {
            "timestamp": datetime.now().isoformat(),
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "errors": dict(self.errors),
            "timers": {},
            "api_calls": {}
        }
        
        # Aggregate timing metrics
        for key, times in self.timers.items():
            if times:
                summary["timers"][key] = {
                    "count": len(times),
                    "avg": sum(times) / len(times),
                    "min": min(times),
                    "max": max(times),
                    "p95": sorted(times)[int(len(times) * 0.95)] if len(times) > 20 else max(times)
                }
                
        # Aggregate API call metrics
        for key, data in self.api_calls.items():
            if data["count"] > 0:
                summary["api_calls"][key] = {
                    "count": data["count"],
                    "avg_duration": data["total_time"] / data["count"],
                    "total_time": data["total_time"]
                }
                
        return summary

# Global metrics collector instance
_metrics = MetricsCollector()

def get_metrics() -> MetricsCollector:
    """Get the global metrics collector instance."""
    return _metrics

def track_time(metric_name: str, tags: Optional[Dict[str, str]] = None):
    """Decorator to track execution time of functions."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                _metrics.timing(metric_name, duration, tags)
                return result
            except Exception as e:
                duration = time.time() - start_time
                _metrics.timing(metric_name, duration, tags)
                _metrics.error(metric_name, type(e).__name__, tags)
                raise
        return wrapper
    return decorator

def track_api_call(func):
    """Decorator to track API endpoint performance."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        endpoint = func.__name__
        status_code = 200
        
        try:
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            status_code = getattr(e, 'code', 500)
            raise
        finally:
            duration = time.time() - start_time
            _metrics.api_call(endpoint, duration, status_code)
            
    return wrapper

def record_ai_model_call(model: str, operation: str, duration: float, tokens_used: int, success: bool):
    """Record AI model performance metrics."""
    tags = {
        "model": model,
        "operation": operation,
        "success": str(success)
    }
    
    _metrics.timing("ai.model.duration", duration, tags)
    _metrics.histogram("ai.model.tokens", tokens_used, tags)
    _metrics.increment("ai.model.calls", 1, tags)
    
    if not success:
        _metrics.error("ai.model.calls", "api_failure", tags)

def record_cache_operation(operation: str, hit: bool, key_pattern: str = None):
    """Record cache performance metrics."""
    tags = {
        "operation": operation,
        "result": "hit" if hit else "miss"
    }
    
    if key_pattern:
        tags["pattern"] = key_pattern
        
    _metrics.increment("cache.operations", 1, tags)

def record_user_action(action: str, ward: str, user_id: str = None):
    """Record user interaction metrics."""
    tags = {
        "action": action,
        "ward": ward
    }
    
    if user_id:
        tags["user_type"] = "authenticated"
    else:
        tags["user_type"] = "anonymous"
        
    _metrics.increment("user.actions", 1, tags)

class HealthMonitor:
    """Monitor system health and performance."""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.last_health_check = datetime.now()
        self.health_status = "healthy"
        self.alerts = deque(maxlen=100)
        
    def check_system_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check."""
        health = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "components": {},
            "alerts": []
        }
        
        # Check Redis cache
        redis_client = get_redis_client()
        if redis_client:
            try:
                redis_client.ping()
                health["components"]["cache"] = {"status": "healthy", "type": "redis"}
            except Exception as e:
                health["components"]["cache"] = {"status": "unhealthy", "error": str(e)}
                health["status"] = "degraded"
        else:
            health["components"]["cache"] = {"status": "unavailable", "message": "Redis not configured"}
            # Don't mark as degraded if Redis is intentionally not configured
            
        # Check AI service response times
        metrics = _metrics.get_metrics_summary()
        api_metrics = metrics.get("api_calls", {})
        
        for endpoint, data in api_metrics.items():
            if "ai" in endpoint and data["avg_duration"] > 10.0:  # 10s threshold
                health["alerts"].append({
                    "type": "performance",
                    "message": f"Slow AI response: {endpoint} averaging {data['avg_duration']:.2f}s",
                    "severity": "warning"
                })
                
        # Check error rates
        error_metrics = metrics.get("errors", {})
        for error_key, count in error_metrics.items():
            if count > 10:  # More than 10 errors
                health["alerts"].append({
                    "type": "error_rate",
                    "message": f"High error count: {error_key} has {count} errors",
                    "severity": "warning"
                })
                
        if health["alerts"]:
            health["status"] = "degraded" if health["status"] == "healthy" else health["status"]
            
        self.last_health_check = datetime.now()
        self.health_status = health["status"]
        
        return health
        
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary."""
        metrics = _metrics.get_metrics_summary()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "request_metrics": metrics.get("api_calls", {}),
            "ai_metrics": {
                k: v for k, v in metrics.get("timers", {}).items() 
                if "ai." in k
            },
            "cache_metrics": {
                k: v for k, v in metrics.get("counters", {}).items() 
                if "cache." in k
            },
            "error_summary": metrics.get("errors", {}),
            "system_gauges": metrics.get("gauges", {})
        }

# Global health monitor instance
_health_monitor = HealthMonitor()

def get_health_monitor() -> HealthMonitor:
    """Get the global health monitor instance."""
    return _health_monitor