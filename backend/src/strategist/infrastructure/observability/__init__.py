"""
Observability Module for Political Strategist

Provides comprehensive monitoring, logging, and metrics collection for the
AI-powered political strategist system.
"""

import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps

from .metrics import (
    get_metrics, 
    get_health_monitor,
    track_time,
    track_api_call,
    record_ai_model_call,
    record_cache_operation,
    record_user_action
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class StrategistObserver:
    """Main observability class for monitoring strategist operations."""
    
    def __init__(self):
        self.metrics = get_metrics()
        self.health_monitor = get_health_monitor()
        self.start_time = datetime.now()
        
    def log_analysis_start(self, ward: str, depth: str, context: str, user_id: str = None):
        """Log the start of a strategic analysis."""
        logger.info(f"Strategic analysis started - Ward: {ward}, Depth: {depth}, Context: {context}")
        
        tags = {
            "ward": ward,
            "depth": depth,
            "context": context
        }
        
        self.metrics.increment("strategist.analysis.started", 1, tags)
        record_user_action("analysis_start", ward, user_id)
        
    def log_analysis_complete(self, ward: str, duration: float, confidence: float, sources_count: int):
        """Log the completion of a strategic analysis."""
        logger.info(f"Strategic analysis completed - Ward: {ward}, Duration: {duration:.2f}s, Confidence: {confidence:.2f}")
        
        tags = {"ward": ward}
        
        self.metrics.timing("strategist.analysis.duration", duration, tags)
        self.metrics.gauge("strategist.analysis.confidence", confidence, tags)
        self.metrics.histogram("strategist.analysis.sources", sources_count, tags)
        self.metrics.increment("strategist.analysis.completed", 1, tags)
        
    def log_ai_call(self, model: str, operation: str, duration: float, tokens: int, success: bool, error: str = None):
        """Log AI model API calls."""
        logger.info(f"AI call - Model: {model}, Operation: {operation}, Duration: {duration:.2f}s, Success: {success}")
        
        if error:
            logger.error(f"AI call failed - Model: {model}, Error: {error}")
            
        record_ai_model_call(model, operation, duration, tokens, success)
        
    def log_cache_operation(self, operation: str, key: str, hit: bool):
        """Log cache operations."""
        logger.debug(f"Cache {operation} - Key: {key}, Hit: {hit}")
        record_cache_operation(operation, hit, key.split(":")[0])
        
    def log_intelligence_feed_event(self, ward: str, event_type: str, priority: str):
        """Log intelligence feed events."""
        logger.info(f"Intelligence feed event - Ward: {ward}, Type: {event_type}, Priority: {priority}")
        
        tags = {
            "ward": ward,
            "event_type": event_type,
            "priority": priority
        }
        
        self.metrics.increment("strategist.intelligence.events", 1, tags)
        
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        return {
            "system_uptime": (datetime.now() - self.start_time).total_seconds(),
            "health_status": self.health_monitor.health_status,
            "metrics_summary": self.metrics.get_metrics_summary(),
            "performance_summary": self.health_monitor.get_performance_summary(),
            "last_health_check": self.health_monitor.last_health_check.isoformat()
        }
        
    def get_health_status(self) -> Dict[str, Any]:
        """Get current system health status."""
        return self.health_monitor.check_system_health()

# Global observer instance
_observer = StrategistObserver()

def get_observer() -> StrategistObserver:
    """Get the global observer instance."""
    return _observer

def monitor_strategist_operation(operation_name: str):
    """Decorator to monitor strategist operations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            observer = get_observer()
            
            # Extract ward if available
            ward = "unknown"
            if args and hasattr(args[0], 'ward'):
                ward = args[0].ward
            elif 'ward' in kwargs:
                ward = kwargs['ward']
                
            tags = {"operation": operation_name, "ward": ward}
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                observer.metrics.timing("strategist.operations", duration, tags)
                observer.metrics.increment("strategist.operations.success", 1, tags)
                return result
            except Exception as e:
                duration = time.time() - start_time
                observer.metrics.timing("strategist.operations", duration, tags)
                observer.metrics.error("strategist.operations", type(e).__name__, tags)
                raise
                
        return wrapper
    return decorator

# Export key functions
__all__ = [
    'StrategistObserver',
    'get_observer',
    'get_metrics',
    'get_health_monitor',
    'track_time',
    'track_api_call',
    'monitor_strategist_operation',
    'record_ai_model_call',
    'record_cache_operation',
    'record_user_action'
]