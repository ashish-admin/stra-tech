"""
Enhanced Monitoring and Observability for Reliability Tracking

Provides comprehensive monitoring, metrics collection, and alerting
for the LokDarpan Political Strategist reliability infrastructure.
"""

import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import threading
import json
from enum import Enum

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics for monitoring."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class Metric:
    """Represents a single metric measurement."""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}


@dataclass
class Alert:
    """Represents a system alert."""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    timestamp: datetime
    component: str
    metric_name: str = None
    metric_value: float = None
    threshold: float = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class MetricsCollector:
    """
    Centralized metrics collection and aggregation system.
    """
    
    def __init__(self, max_metrics_per_type: int = 10000):
        self.metrics = defaultdict(deque)
        self.max_metrics_per_type = max_metrics_per_type
        self.lock = threading.Lock()
        
        # Aggregated statistics
        self.counters = defaultdict(float)
        self.gauges = defaultdict(float)
        self.histograms = defaultdict(list)
        self.timers = defaultdict(list)
    
    def record_metric(self, name: str, value: float, metric_type: MetricType, tags: Dict[str, str] = None):
        """Record a new metric measurement."""
        metric = Metric(
            name=name,
            value=value,
            metric_type=metric_type,
            timestamp=datetime.now(timezone.utc),
            tags=tags or {}
        )
        
        with self.lock:
            # Store in time series
            self.metrics[name].append(metric)
            
            # Limit storage to prevent memory issues
            if len(self.metrics[name]) > self.max_metrics_per_type:
                self.metrics[name].popleft()
            
            # Update aggregated values
            if metric_type == MetricType.COUNTER:
                self.counters[name] += value
            elif metric_type == MetricType.GAUGE:
                self.gauges[name] = value
            elif metric_type == MetricType.HISTOGRAM:
                self.histograms[name].append(value)
                # Keep only recent values
                if len(self.histograms[name]) > 1000:
                    self.histograms[name] = self.histograms[name][-1000:]
            elif metric_type == MetricType.TIMER:
                self.timers[name].append(value)
                # Keep only recent values
                if len(self.timers[name]) > 1000:
                    self.timers[name] = self.timers[name][-1000:]
    
    def get_metric_history(self, name: str, since: Optional[datetime] = None) -> List[Metric]:
        """Get historical data for a specific metric."""
        with self.lock:
            metrics = list(self.metrics[name])
        
        if since:
            metrics = [m for m in metrics if m.timestamp >= since]
        
        return metrics
    
    def get_metric_stats(self, name: str) -> Dict[str, Any]:
        """Get statistical summary for a metric."""
        with self.lock:
            if name not in self.metrics:
                return None
            
            recent_metrics = list(self.metrics[name])
            if not recent_metrics:
                return None
            
            values = [m.value for m in recent_metrics]
            
            stats = {
                'name': name,
                'count': len(values),
                'min': min(values) if values else 0,
                'max': max(values) if values else 0,
                'avg': sum(values) / len(values) if values else 0,
                'latest': values[-1] if values else 0,
                'timestamp': recent_metrics[-1].timestamp.isoformat() if recent_metrics else None
            }
            
            # Add percentiles for histograms and timers
            if recent_metrics[0].metric_type in [MetricType.HISTOGRAM, MetricType.TIMER]:
                sorted_values = sorted(values)
                stats.update({
                    'p50': self._percentile(sorted_values, 50),
                    'p95': self._percentile(sorted_values, 95),
                    'p99': self._percentile(sorted_values, 99)
                })
            
            return stats
    
    def get_all_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics."""
        with self.lock:
            summary = {
                'counters': dict(self.counters),
                'gauges': dict(self.gauges),
                'histograms': {name: self.get_metric_stats(name) for name in self.histograms.keys()},
                'timers': {name: self.get_metric_stats(name) for name in self.timers.keys()},
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'total_metrics': sum(len(deque_) for deque_ in self.metrics.values())
            }
            
            return summary
    
    @staticmethod
    def _percentile(sorted_values: List[float], percentile: float) -> float:
        """Calculate percentile value."""
        if not sorted_values:
            return 0
        
        index = (percentile / 100) * (len(sorted_values) - 1)
        lower = int(index)
        upper = lower + 1
        
        if upper >= len(sorted_values):
            return sorted_values[-1]
        
        weight = index - lower
        return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight


class ReliabilityMonitor:
    """
    Monitors system reliability and generates alerts based on configurable thresholds.
    """
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.alert_rules = []
        self.active_alerts = {}
        self.alert_history = deque(maxlen=1000)
        self.lock = threading.Lock()
    
    def add_alert_rule(
        self,
        name: str,
        metric_name: str,
        threshold: float,
        operator: str,  # 'gt', 'lt', 'gte', 'lte', 'eq'
        severity: AlertSeverity,
        component: str,
        description: str = None
    ):
        """Add an alerting rule."""
        rule = {
            'name': name,
            'metric_name': metric_name,
            'threshold': threshold,
            'operator': operator,
            'severity': severity,
            'component': component,
            'description': description or f"{metric_name} {operator} {threshold}"
        }
        
        self.alert_rules.append(rule)
        logger.info(f"Added alert rule: {name}")
    
    def check_alerts(self):
        """Check all alert rules and trigger alerts if necessary."""
        current_time = datetime.now(timezone.utc)
        
        for rule in self.alert_rules:
            try:
                metric_stats = self.metrics.get_metric_stats(rule['metric_name'])
                if not metric_stats:
                    continue
                
                current_value = metric_stats['latest']
                threshold = rule['threshold']
                operator = rule['operator']
                
                # Evaluate condition
                should_alert = False
                if operator == 'gt' and current_value > threshold:
                    should_alert = True
                elif operator == 'lt' and current_value < threshold:
                    should_alert = True
                elif operator == 'gte' and current_value >= threshold:
                    should_alert = True
                elif operator == 'lte' and current_value <= threshold:
                    should_alert = True
                elif operator == 'eq' and current_value == threshold:
                    should_alert = True
                
                alert_id = rule['name']
                
                if should_alert and alert_id not in self.active_alerts:
                    # Trigger new alert
                    alert = Alert(
                        id=alert_id,
                        title=f"Alert: {rule['name']}",
                        description=rule['description'],
                        severity=rule['severity'],
                        timestamp=current_time,
                        component=rule['component'],
                        metric_name=rule['metric_name'],
                        metric_value=current_value,
                        threshold=threshold
                    )
                    
                    self._trigger_alert(alert)
                
                elif not should_alert and alert_id in self.active_alerts:
                    # Resolve existing alert
                    self._resolve_alert(alert_id, current_time)
                    
            except Exception as e:
                logger.error(f"Error checking alert rule {rule['name']}: {e}")
    
    def _trigger_alert(self, alert: Alert):
        """Trigger a new alert."""
        with self.lock:
            self.active_alerts[alert.id] = alert
            self.alert_history.append(alert)
        
        logger.warning(f"ALERT TRIGGERED: {alert.title} - {alert.description} "
                      f"(Value: {alert.metric_value}, Threshold: {alert.threshold})")
        
        # Here you could integrate with external alerting systems
        # e.g., send to Slack, email, PagerDuty, etc.
    
    def _resolve_alert(self, alert_id: str, resolved_at: datetime):
        """Resolve an active alert."""
        with self.lock:
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                alert.resolved = True
                alert.resolved_at = resolved_at
                del self.active_alerts[alert_id]
        
        logger.info(f"ALERT RESOLVED: {alert_id}")
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all currently active alerts."""
        with self.lock:
            return list(self.active_alerts.values())
    
    def get_alert_history(self, since: Optional[datetime] = None) -> List[Alert]:
        """Get alert history."""
        with self.lock:
            alerts = list(self.alert_history)
        
        if since:
            alerts = [a for a in alerts if a.timestamp >= since]
        
        return alerts


class ReliabilityDashboard:
    """
    Provides a comprehensive view of system reliability metrics and health.
    """
    
    def __init__(self, metrics_collector: MetricsCollector, monitor: ReliabilityMonitor):
        self.metrics = metrics_collector
        self.monitor = monitor
    
    def get_system_health_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive system health dashboard."""
        now = datetime.now(timezone.utc)
        one_hour_ago = now - timedelta(hours=1)
        
        # Get metrics summary
        metrics_summary = self.metrics.get_all_metrics_summary()
        
        # Get active alerts
        active_alerts = self.monitor.get_active_alerts()
        recent_alerts = self.monitor.get_alert_history(since=one_hour_ago)
        
        # Calculate health scores
        error_rate = self._calculate_error_rate()
        availability = self._calculate_availability()
        performance_score = self._calculate_performance_score()
        
        # Overall health score (0-100)
        overall_health = (
            (1 - error_rate) * 0.4 +  # 40% weight for error rate
            availability * 0.4 +       # 40% weight for availability
            performance_score * 0.2    # 20% weight for performance
        ) * 100
        
        return {
            'overall_health': {
                'score': round(overall_health, 2),
                'status': self._health_status(overall_health),
                'timestamp': now.isoformat()
            },
            'components': {
                'error_rate': {
                    'value': round(error_rate * 100, 2),
                    'status': 'healthy' if error_rate < 0.01 else 'degraded' if error_rate < 0.05 else 'critical',
                    'threshold': '< 1% healthy, < 5% degraded'
                },
                'availability': {
                    'value': round(availability * 100, 2),
                    'status': 'healthy' if availability > 0.99 else 'degraded' if availability > 0.95 else 'critical',
                    'threshold': '> 99% healthy, > 95% degraded'
                },
                'performance': {
                    'value': round(performance_score * 100, 2),
                    'status': 'healthy' if performance_score > 0.8 else 'degraded' if performance_score > 0.6 else 'critical',
                    'threshold': '> 80% healthy, > 60% degraded'
                }
            },
            'alerts': {
                'active_count': len(active_alerts),
                'recent_count': len(recent_alerts),
                'active_alerts': [asdict(alert) for alert in active_alerts[:10]],  # Top 10
                'critical_alerts': len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
                'emergency_alerts': len([a for a in active_alerts if a.severity == AlertSeverity.EMERGENCY])
            },
            'metrics': {
                'total_metrics': metrics_summary['total_metrics'],
                'counters': len(metrics_summary['counters']),
                'gauges': len(metrics_summary['gauges']),
                'histograms': len(metrics_summary['histograms']),
                'timers': len(metrics_summary['timers'])
            },
            'uptime': self._calculate_uptime(),
            'last_updated': now.isoformat()
        }
    
    def get_component_health(self, component_name: str) -> Dict[str, Any]:
        """Get health status for a specific component."""
        # Get component-specific metrics
        component_metrics = {}
        all_metrics = self.metrics.get_all_metrics_summary()
        
        # Filter metrics for this component
        for metric_type in ['counters', 'gauges', 'histograms', 'timers']:
            component_metrics[metric_type] = {
                name: data for name, data in all_metrics[metric_type].items()
                if component_name in name.lower()
            }
        
        # Get component-specific alerts
        active_alerts = [
            alert for alert in self.monitor.get_active_alerts()
            if alert.component.lower() == component_name.lower()
        ]
        
        return {
            'component': component_name,
            'health_score': self._calculate_component_health_score(component_name),
            'metrics': component_metrics,
            'active_alerts': [asdict(alert) for alert in active_alerts],
            'status': 'healthy' if not active_alerts else 'degraded',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def _calculate_error_rate(self) -> float:
        """Calculate overall error rate."""
        error_metrics = self.metrics.get_metric_stats('errors_total')
        request_metrics = self.metrics.get_metric_stats('requests_total')
        
        if not error_metrics or not request_metrics:
            return 0.0
        
        errors = error_metrics['latest']
        requests = request_metrics['latest']
        
        return errors / max(requests, 1)
    
    def _calculate_availability(self) -> float:
        """Calculate system availability."""
        # Simple availability calculation based on successful requests
        success_metrics = self.metrics.get_metric_stats('requests_successful')
        total_metrics = self.metrics.get_metric_stats('requests_total')
        
        if not success_metrics or not total_metrics:
            return 1.0  # Assume healthy if no data
        
        successful = success_metrics['latest']
        total = total_metrics['latest']
        
        return successful / max(total, 1)
    
    def _calculate_performance_score(self) -> float:
        """Calculate performance score based on response times."""
        response_time_stats = self.metrics.get_metric_stats('response_time')
        
        if not response_time_stats:
            return 1.0  # Assume good performance if no data
        
        avg_response_time = response_time_stats['avg']
        
        # Score based on response time thresholds
        if avg_response_time < 100:  # < 100ms excellent
            return 1.0
        elif avg_response_time < 500:  # < 500ms good
            return 0.8
        elif avg_response_time < 1000:  # < 1s acceptable
            return 0.6
        elif avg_response_time < 2000:  # < 2s poor
            return 0.4
        else:  # > 2s critical
            return 0.2
    
    def _calculate_component_health_score(self, component_name: str) -> float:
        """Calculate health score for a specific component."""
        # Simple implementation - can be enhanced based on component-specific metrics
        active_alerts = [
            alert for alert in self.monitor.get_active_alerts()
            if alert.component.lower() == component_name.lower()
        ]
        
        if not active_alerts:
            return 100.0
        
        # Deduct points based on alert severity
        score = 100.0
        for alert in active_alerts:
            if alert.severity == AlertSeverity.EMERGENCY:
                score -= 50
            elif alert.severity == AlertSeverity.CRITICAL:
                score -= 30
            elif alert.severity == AlertSeverity.WARNING:
                score -= 10
            elif alert.severity == AlertSeverity.INFO:
                score -= 5
        
        return max(0.0, score)
    
    def _calculate_uptime(self) -> Dict[str, Any]:
        """Calculate system uptime statistics."""
        # This is a simplified implementation
        # In production, you'd track actual uptime/downtime events
        now = datetime.now(timezone.utc)
        
        return {
            'current_uptime_hours': 24,  # Placeholder
            'uptime_percentage_24h': 99.9,  # Placeholder
            'uptime_percentage_7d': 99.8,  # Placeholder
            'uptime_percentage_30d': 99.5,  # Placeholder
            'last_downtime': None,  # Placeholder
            'calculated_at': now.isoformat()
        }
    
    @staticmethod
    def _health_status(score: float) -> str:
        """Convert health score to status string."""
        if score >= 90:
            return 'healthy'
        elif score >= 70:
            return 'degraded'
        else:
            return 'critical'


# Global instances
metrics_collector = MetricsCollector()
reliability_monitor = ReliabilityMonitor(metrics_collector)
dashboard = ReliabilityDashboard(metrics_collector, reliability_monitor)


def setup_default_monitoring():
    """Setup default monitoring rules for the LokDarpan system."""
    
    # Error rate alerts
    reliability_monitor.add_alert_rule(
        name="high_error_rate",
        metric_name="error_rate",
        threshold=0.05,  # 5%
        operator="gt",
        severity=AlertSeverity.WARNING,
        component="strategist",
        description="Error rate exceeded 5% threshold"
    )
    
    reliability_monitor.add_alert_rule(
        name="critical_error_rate",
        metric_name="error_rate",
        threshold=0.10,  # 10%
        operator="gt",
        severity=AlertSeverity.CRITICAL,
        component="strategist",
        description="Error rate exceeded 10% - immediate attention required"
    )
    
    # Response time alerts
    reliability_monitor.add_alert_rule(
        name="slow_response_time",
        metric_name="response_time_avg",
        threshold=2000,  # 2 seconds
        operator="gt",
        severity=AlertSeverity.WARNING,
        component="strategist",
        description="Average response time exceeded 2 seconds"
    )
    
    # Circuit breaker alerts
    reliability_monitor.add_alert_rule(
        name="circuit_breaker_open",
        metric_name="circuit_breaker_open_count",
        threshold=0,
        operator="gt",
        severity=AlertSeverity.CRITICAL,
        component="strategist",
        description="Circuit breakers are open - service degradation detected"
    )
    
    # SSE connection alerts
    reliability_monitor.add_alert_rule(
        name="sse_connection_failures",
        metric_name="sse_connection_errors",
        threshold=10,
        operator="gt",
        severity=AlertSeverity.WARNING,
        component="sse",
        description="High number of SSE connection errors detected"
    )
    
    logger.info("Default monitoring rules configured")


def record_metric(name: str, value: float, metric_type: MetricType, tags: Dict[str, str] = None):
    """Convenience function to record a metric."""
    metrics_collector.record_metric(name, value, metric_type, tags)


def check_system_health():
    """Perform health checks and update monitoring."""
    reliability_monitor.check_alerts()
    
    # Record system health metrics
    health_data = dashboard.get_system_health_dashboard()
    record_metric("system_health_score", health_data['overall_health']['score'], MetricType.GAUGE)
    record_metric("active_alerts_count", health_data['alerts']['active_count'], MetricType.GAUGE)
    record_metric("critical_alerts_count", health_data['alerts']['critical_alerts'], MetricType.GAUGE)


# Initialize default monitoring on import
setup_default_monitoring()