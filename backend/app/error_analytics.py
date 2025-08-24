"""
LokDarpan Error Analytics and Reporting System

Advanced error trend analysis, predictive insights, and actionable reporting
for strategic development and operations decision-making.
"""

import json
import time
import statistics
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from enum import Enum
import logging

import numpy as np
import redis
from flask import Blueprint, request, jsonify, current_app, render_template_string
from flask_login import login_required, current_user

from .error_tracking import ErrorSeverity, ErrorCategory, ErrorTracker
from .error_intelligence import ErrorIntelligenceEngine, PriorityLevel, BusinessImpact
from .security import AuditLogger

class TrendDirection(Enum):
    """Trend direction classifications."""
    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"
    VOLATILE = "volatile"
    INSUFFICIENT_DATA = "insufficient_data"

class AlertLevel(Enum):
    """Alert level classifications."""
    GREEN = "green"      # All systems normal
    YELLOW = "yellow"    # Minor issues detected
    ORANGE = "orange"    # Significant issues requiring attention
    RED = "red"          # Critical issues requiring immediate action

@dataclass
class ErrorTrend:
    """Error trend analysis result."""
    category: str
    severity: str
    period_hours: int
    total_occurrences: int
    trend_direction: TrendDirection
    trend_strength: float  # 0-1 scale
    prediction_confidence: float  # 0-1 scale
    projected_occurrences_24h: int
    top_components: List[Tuple[str, int]]
    resolution_suggestions: List[str]

@dataclass
class SystemHealthReport:
    """Comprehensive system health report."""
    timestamp: datetime
    overall_health_score: float  # 0-100 scale
    alert_level: AlertLevel
    
    # Error metrics
    total_errors_24h: int
    error_rate_trend: TrendDirection
    critical_errors: int
    high_priority_errors: int
    
    # Performance indicators
    avg_response_time: float
    error_resolution_rate: float
    system_availability: float
    
    # Component health
    component_health_scores: Dict[str, float]
    failing_components: List[str]
    
    # Strategic insights
    top_priorities: List[str]
    improvement_opportunities: List[str]
    risk_factors: List[str]
    
    # Predictions
    predicted_issues: List[str]
    maintenance_recommendations: List[str]

class ErrorAnalytics:
    """
    Advanced error analytics engine providing:
    - Real-time error trend analysis
    - Predictive error forecasting
    - System health scoring
    - Strategic insights and recommendations
    - Automated reporting and alerting
    """
    
    def __init__(self, error_tracker: ErrorTracker, redis_client: redis.Redis = None):
        self.error_tracker = error_tracker
        self.redis_client = redis_client
        self.intelligence_engine = ErrorIntelligenceEngine()
        self.logger = logging.getLogger('lokdarpan.error_analytics')
        
        # Analytics configuration
        self.analysis_windows = {
            'realtime': 3600,      # 1 hour
            'short': 21600,        # 6 hours
            'medium': 86400,       # 24 hours
            'long': 604800,        # 1 week
            'extended': 2592000    # 30 days
        }
        
        # Health scoring weights
        self.health_weights = {
            'error_rate': 0.3,
            'response_time': 0.25,
            'availability': 0.2,
            'resolution_rate': 0.15,
            'trend_direction': 0.1
        }
        
        # Alert thresholds
        self.alert_thresholds = {
            'critical_errors': 5,
            'error_rate_per_hour': 50,
            'response_time_ms': 2000,
            'availability_percent': 99.0
        }
    
    def analyze_error_trends(self, time_window_hours: int = 24) -> List[ErrorTrend]:
        """
        Analyze error trends across categories and severity levels.
        
        Args:
            time_window_hours: Analysis time window in hours
            
        Returns:
            List of error trend analyses
        """
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
            
            # Get historical errors
            historical_errors = self._get_historical_errors(cutoff_time)
            
            if not historical_errors:
                return []
            
            # Group errors by category and severity
            error_groups = defaultdict(list)
            for error in historical_errors:
                key = f"{error.get('category', 'unknown')}:{error.get('severity', 'medium')}"
                error_groups[key].append(error)
            
            trends = []
            for group_key, group_errors in error_groups.items():
                if len(group_errors) >= 3:  # Minimum for trend analysis
                    trend = self._analyze_group_trend(group_key, group_errors, time_window_hours)
                    if trend:
                        trends.append(trend)
            
            # Sort by severity and trend strength
            trends.sort(key=lambda x: (self._severity_weight(x.severity), -x.trend_strength))
            
            return trends
        
        except Exception as e:
            self.logger.error(f"Error trend analysis failed: {e}")
            return []
    
    def generate_system_health_report(self) -> SystemHealthReport:
        """Generate comprehensive system health report."""
        try:
            now = datetime.now(timezone.utc)
            
            # Collect metrics
            error_metrics = self._collect_error_metrics()
            performance_metrics = self._collect_performance_metrics()
            component_metrics = self._collect_component_metrics()
            
            # Calculate health scores
            overall_health = self._calculate_overall_health(error_metrics, performance_metrics)
            alert_level = self._determine_alert_level(error_metrics, performance_metrics)
            
            # Generate insights
            priorities = self._identify_top_priorities(error_metrics, component_metrics)
            improvements = self._identify_improvement_opportunities(error_metrics, performance_metrics)
            risks = self._identify_risk_factors(error_metrics, component_metrics)
            
            # Generate predictions
            predictions = self._generate_predictions(error_metrics)
            maintenance = self._generate_maintenance_recommendations(component_metrics)
            
            report = SystemHealthReport(
                timestamp=now,
                overall_health_score=overall_health,
                alert_level=alert_level,
                
                total_errors_24h=error_metrics['total_24h'],
                error_rate_trend=error_metrics['trend_direction'],
                critical_errors=error_metrics['critical_count'],
                high_priority_errors=error_metrics['high_priority_count'],
                
                avg_response_time=performance_metrics['avg_response_time'],
                error_resolution_rate=performance_metrics['resolution_rate'],
                system_availability=performance_metrics['availability'],
                
                component_health_scores=component_metrics['health_scores'],
                failing_components=component_metrics['failing_components'],
                
                top_priorities=priorities,
                improvement_opportunities=improvements,
                risk_factors=risks,
                
                predicted_issues=predictions,
                maintenance_recommendations=maintenance
            )
            
            # Cache report
            self._cache_health_report(report)
            
            return report
        
        except Exception as e:
            self.logger.error(f"Health report generation failed: {e}")
            return self._generate_fallback_report()
    
    def _get_historical_errors(self, cutoff_time: datetime) -> List[Dict[str, Any]]:
        """Get historical errors from storage."""
        try:
            errors = []
            
            # Get errors from Redis if available
            if self.redis_client:
                error_keys = self.redis_client.keys("lokdarpan:errors:*")
                for key in error_keys:
                    try:
                        error_data = json.loads(self.redis_client.get(key))
                        error_time = datetime.fromisoformat(error_data['timestamp'].replace('Z', '+00:00'))
                        
                        if error_time >= cutoff_time:
                            errors.append(error_data)
                    except (json.JSONDecodeError, KeyError, ValueError):
                        continue
            
            # Get errors from error tracker buffer
            for error in self.error_tracker.error_buffer:
                if error.timestamp >= cutoff_time:
                    errors.append(error.to_dict())
            
            return errors
        
        except Exception as e:
            self.logger.warning(f"Failed to get historical errors: {e}")
            return []
    
    def _analyze_group_trend(self, group_key: str, group_errors: List[Dict], time_window_hours: int) -> Optional[ErrorTrend]:
        """Analyze trend for a specific error group."""
        try:
            category, severity = group_key.split(':', 1)
            
            # Sort errors by timestamp
            sorted_errors = sorted(group_errors, key=lambda x: x.get('timestamp', ''))
            
            # Create time buckets
            bucket_size = max(time_window_hours // 12, 1)  # 12 buckets
            buckets = defaultdict(int)
            component_counts = Counter()
            
            now = datetime.now(timezone.utc)
            
            for error in sorted_errors:
                try:
                    error_time = datetime.fromisoformat(error['timestamp'].replace('Z', '+00:00'))
                    hours_ago = (now - error_time).total_seconds() / 3600
                    bucket = int(hours_ago // bucket_size)
                    
                    if bucket < 12:  # Only consider recent buckets
                        buckets[bucket] += 1
                        component_counts[error.get('component', 'unknown')] += 1
                except (ValueError, KeyError):
                    continue
            
            if len(buckets) < 3:  # Need minimum data points
                return None
            
            # Calculate trend
            trend_data = [buckets[i] for i in range(12)]
            trend_direction, trend_strength = self._calculate_trend_direction(trend_data)
            
            # Predict future occurrences
            prediction_confidence = min(len(sorted_errors) / 20.0, 1.0)  # More data = higher confidence
            projected_24h = self._project_occurrences(trend_data, trend_direction, 24)
            
            # Get resolution suggestions
            sample_error = sorted_errors[0]
            intelligence = self.intelligence_engine.analyze_error(sample_error, sorted_errors)
            
            return ErrorTrend(
                category=category,
                severity=severity,
                period_hours=time_window_hours,
                total_occurrences=len(group_errors),
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                prediction_confidence=prediction_confidence,
                projected_occurrences_24h=projected_24h,
                top_components=component_counts.most_common(5),
                resolution_suggestions=intelligence.prevention_suggestions[:3]
            )
        
        except Exception as e:
            self.logger.warning(f"Group trend analysis failed for {group_key}: {e}")
            return None
    
    def _calculate_trend_direction(self, data_points: List[int]) -> Tuple[TrendDirection, float]:
        """Calculate trend direction and strength from data points."""
        try:
            if len(data_points) < 3:
                return TrendDirection.INSUFFICIENT_DATA, 0.0
            
            # Remove zeros for better analysis
            non_zero_points = [x for x in data_points if x > 0]
            if len(non_zero_points) < 2:
                return TrendDirection.STABLE, 0.0
            
            # Calculate linear regression slope
            x = list(range(len(data_points)))
            n = len(data_points)
            
            sum_x = sum(x)
            sum_y = sum(data_points)
            sum_xy = sum(x[i] * data_points[i] for i in range(n))
            sum_x2 = sum(xi * xi for xi in x)
            
            if n * sum_x2 - sum_x * sum_x == 0:
                return TrendDirection.STABLE, 0.0
            
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            
            # Calculate correlation coefficient for strength
            mean_x = sum_x / n
            mean_y = sum_y / n
            
            numerator = sum((x[i] - mean_x) * (data_points[i] - mean_y) for i in range(n))
            denom_x = sum((x[i] - mean_x) ** 2 for i in range(n))
            denom_y = sum((data_points[i] - mean_y) ** 2 for i in range(n))
            
            if denom_x == 0 or denom_y == 0:
                correlation = 0
            else:
                correlation = numerator / (denom_x * denom_y) ** 0.5
            
            strength = abs(correlation)
            
            # Determine direction
            if abs(slope) < 0.1:
                direction = TrendDirection.STABLE
            elif slope > 0.5:
                direction = TrendDirection.INCREASING
            elif slope < -0.5:
                direction = TrendDirection.DECREASING
            else:
                direction = TrendDirection.VOLATILE if strength > 0.5 else TrendDirection.STABLE
            
            return direction, strength
        
        except Exception as e:
            self.logger.warning(f"Trend calculation failed: {e}")
            return TrendDirection.STABLE, 0.0
    
    def _project_occurrences(self, trend_data: List[int], trend_direction: TrendDirection, hours: int) -> int:
        """Project future error occurrences."""
        try:
            if not trend_data or trend_direction == TrendDirection.INSUFFICIENT_DATA:
                return 0
            
            recent_average = sum(trend_data[-3:]) / 3 if len(trend_data) >= 3 else sum(trend_data) / len(trend_data)
            
            multipliers = {
                TrendDirection.INCREASING: 1.5,
                TrendDirection.DECREASING: 0.5,
                TrendDirection.STABLE: 1.0,
                TrendDirection.VOLATILE: 1.2
            }
            
            multiplier = multipliers.get(trend_direction, 1.0)
            projection = int(recent_average * multiplier * (hours / 12))  # 12-hour buckets
            
            return max(0, projection)
        
        except Exception:
            return 0
    
    def _collect_error_metrics(self) -> Dict[str, Any]:
        """Collect error-related metrics."""
        try:
            now = datetime.now(timezone.utc)
            last_24h = now - timedelta(hours=24)
            
            # Get recent errors
            recent_errors = self._get_historical_errors(last_24h)
            
            # Basic counts
            total_24h = len(recent_errors)
            critical_count = sum(1 for e in recent_errors if e.get('severity') == 'critical')
            high_count = sum(1 for e in recent_errors if e.get('severity') == 'high')
            
            # Calculate error rate trend
            if len(recent_errors) >= 6:
                # Split into periods for trend
                mid_point = last_24h + timedelta(hours=12)
                first_half = [e for e in recent_errors if datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) < mid_point]
                second_half = [e for e in recent_errors if datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) >= mid_point]
                
                first_rate = len(first_half)
                second_rate = len(second_half)
                
                if first_rate == 0:
                    trend_direction = TrendDirection.INCREASING
                elif second_rate / first_rate > 1.2:
                    trend_direction = TrendDirection.INCREASING
                elif second_rate / first_rate < 0.8:
                    trend_direction = TrendDirection.DECREASING
                else:
                    trend_direction = TrendDirection.STABLE
            else:
                trend_direction = TrendDirection.INSUFFICIENT_DATA
            
            return {
                'total_24h': total_24h,
                'critical_count': critical_count,
                'high_priority_count': critical_count + high_count,
                'error_rate_per_hour': total_24h / 24,
                'trend_direction': trend_direction
            }
        
        except Exception as e:
            self.logger.warning(f"Error metrics collection failed: {e}")
            return {
                'total_24h': 0,
                'critical_count': 0,
                'high_priority_count': 0,
                'error_rate_per_hour': 0,
                'trend_direction': TrendDirection.STABLE
            }
    
    def _collect_performance_metrics(self) -> Dict[str, Any]:
        """Collect performance-related metrics."""
        try:
            # Get performance data from Redis if available
            if self.redis_client:
                perf_keys = self.redis_client.keys("lokdarpan:performance:*")
                response_times = []
                
                for key in perf_keys:
                    try:
                        perf_data = json.loads(self.redis_client.get(key))
                        if 'response_time' in perf_data:
                            response_times.append(perf_data['response_time'])
                    except (json.JSONDecodeError, KeyError):
                        continue
                
                avg_response_time = statistics.mean(response_times) * 1000 if response_times else 200
            else:
                avg_response_time = 200  # Default assumption
            
            # Calculate other metrics
            resolution_rate = 0.85  # Placeholder - would calculate from actual resolution data
            availability = 99.5     # Placeholder - would calculate from uptime data
            
            return {
                'avg_response_time': avg_response_time,
                'resolution_rate': resolution_rate,
                'availability': availability
            }
        
        except Exception as e:
            self.logger.warning(f"Performance metrics collection failed: {e}")
            return {
                'avg_response_time': 300,
                'resolution_rate': 0.8,
                'availability': 99.0
            }
    
    def _collect_component_metrics(self) -> Dict[str, Any]:
        """Collect component-specific health metrics."""
        try:
            now = datetime.now(timezone.utc)
            last_24h = now - timedelta(hours=24)
            recent_errors = self._get_historical_errors(last_24h)
            
            # Count errors by component
            component_errors = Counter(e.get('component', 'unknown') for e in recent_errors)
            
            # Calculate health scores (inverse of error count)
            max_errors = max(component_errors.values()) if component_errors else 1
            health_scores = {}
            failing_components = []
            
            # Default components to check
            components = ['frontend', 'backend', 'database', 'strategist', 'api', 'auth']
            
            for component in components:
                error_count = component_errors.get(component, 0)
                # Health score: 100 - (error_count / max_errors * 50)
                health_score = max(50, 100 - (error_count / max_errors * 50)) if max_errors > 0 else 100
                health_scores[component] = health_score
                
                if health_score < 70:
                    failing_components.append(component)
            
            return {
                'health_scores': health_scores,
                'failing_components': failing_components,
                'component_errors': dict(component_errors)
            }
        
        except Exception as e:
            self.logger.warning(f"Component metrics collection failed: {e}")
            return {
                'health_scores': {},
                'failing_components': [],
                'component_errors': {}
            }
    
    def _calculate_overall_health(self, error_metrics: Dict, performance_metrics: Dict) -> float:
        """Calculate overall system health score (0-100)."""
        try:
            # Error rate component
            error_rate = error_metrics['error_rate_per_hour']
            error_score = max(0, 100 - (error_rate * 2))  # Penalize high error rates
            
            # Response time component
            response_time = performance_metrics['avg_response_time']
            response_score = max(0, 100 - (response_time - 200) / 10)  # 200ms baseline
            
            # Availability component
            availability = performance_metrics['availability']
            availability_score = availability  # Direct mapping
            
            # Resolution rate component
            resolution_rate = performance_metrics['resolution_rate']
            resolution_score = resolution_rate * 100
            
            # Trend component
            trend_direction = error_metrics['trend_direction']
            trend_scores = {
                TrendDirection.DECREASING: 100,
                TrendDirection.STABLE: 80,
                TrendDirection.INCREASING: 40,
                TrendDirection.VOLATILE: 60,
                TrendDirection.INSUFFICIENT_DATA: 70
            }
            trend_score = trend_scores.get(trend_direction, 70)
            
            # Weighted average
            overall_score = (
                error_score * self.health_weights['error_rate'] +
                response_score * self.health_weights['response_time'] +
                availability_score * self.health_weights['availability'] +
                resolution_score * self.health_weights['resolution_rate'] +
                trend_score * self.health_weights['trend_direction']
            )
            
            return max(0, min(100, overall_score))
        
        except Exception as e:
            self.logger.warning(f"Health calculation failed: {e}")
            return 75.0  # Default to moderate health
    
    def _determine_alert_level(self, error_metrics: Dict, performance_metrics: Dict) -> AlertLevel:
        """Determine system alert level."""
        try:
            # Critical conditions
            if (error_metrics['critical_count'] >= self.alert_thresholds['critical_errors'] or
                error_metrics['error_rate_per_hour'] >= self.alert_thresholds['error_rate_per_hour'] or
                performance_metrics['avg_response_time'] >= self.alert_thresholds['response_time_ms'] or
                performance_metrics['availability'] <= self.alert_thresholds['availability_percent']):
                return AlertLevel.RED
            
            # High priority conditions
            if (error_metrics['high_priority_count'] >= 10 or
                error_metrics['trend_direction'] == TrendDirection.INCREASING or
                performance_metrics['resolution_rate'] < 0.7):
                return AlertLevel.ORANGE
            
            # Minor issues
            if (error_metrics['total_24h'] > 20 or
                performance_metrics['avg_response_time'] > 1000):
                return AlertLevel.YELLOW
            
            # All good
            return AlertLevel.GREEN
        
        except Exception:
            return AlertLevel.YELLOW
    
    def _identify_top_priorities(self, error_metrics: Dict, component_metrics: Dict) -> List[str]:
        """Identify top priorities for resolution."""
        priorities = []
        
        try:
            # Critical errors
            if error_metrics['critical_count'] > 0:
                priorities.append(f"Resolve {error_metrics['critical_count']} critical errors immediately")
            
            # Failing components
            failing = component_metrics['failing_components']
            if failing:
                priorities.append(f"Address issues in {', '.join(failing[:3])} components")
            
            # High error rate
            if error_metrics['error_rate_per_hour'] > 20:
                priorities.append("Investigate high error rate pattern")
            
            # Trend issues
            if error_metrics['trend_direction'] == TrendDirection.INCREASING:
                priorities.append("Address increasing error trend")
            
            return priorities[:5]  # Top 5 priorities
        
        except Exception:
            return ["Review system health metrics"]
    
    def _identify_improvement_opportunities(self, error_metrics: Dict, performance_metrics: Dict) -> List[str]:
        """Identify improvement opportunities."""
        opportunities = []
        
        try:
            # Performance improvements
            if performance_metrics['avg_response_time'] > 500:
                opportunities.append("Optimize response times")
            
            # Resolution rate improvements
            if performance_metrics['resolution_rate'] < 0.9:
                opportunities.append("Improve error resolution processes")
            
            # Proactive monitoring
            if error_metrics['total_24h'] > 10:
                opportunities.append("Implement proactive error prevention")
            
            # Documentation
            opportunities.append("Update error handling documentation")
            
            return opportunities[:4]
        
        except Exception:
            return ["Review system optimization opportunities"]
    
    def _identify_risk_factors(self, error_metrics: Dict, component_metrics: Dict) -> List[str]:
        """Identify system risk factors."""
        risks = []
        
        try:
            # High error rate risk
            if error_metrics['error_rate_per_hour'] > 10:
                risks.append("High error rate may impact user experience")
            
            # Component failure risk
            failing_count = len(component_metrics['failing_components'])
            if failing_count > 2:
                risks.append("Multiple component failures indicate systemic issues")
            
            # Trend-based risks
            if error_metrics['trend_direction'] == TrendDirection.INCREASING:
                risks.append("Increasing error trend suggests deteriorating system health")
            
            return risks[:3]
        
        except Exception:
            return []
    
    def _generate_predictions(self, error_metrics: Dict) -> List[str]:
        """Generate predictive insights."""
        predictions = []
        
        try:
            # Based on error rate
            if error_metrics['error_rate_per_hour'] > 15:
                predictions.append("Error rate may exceed critical threshold within 24 hours")
            
            # Based on trend
            if error_metrics['trend_direction'] == TrendDirection.INCREASING:
                predictions.append("Error frequency likely to continue increasing without intervention")
            
            return predictions[:3]
        
        except Exception:
            return []
    
    def _generate_maintenance_recommendations(self, component_metrics: Dict) -> List[str]:
        """Generate maintenance recommendations."""
        recommendations = []
        
        try:
            # Component-specific recommendations
            failing = component_metrics['failing_components']
            if 'database' in failing:
                recommendations.append("Schedule database maintenance and optimization")
            
            if 'api' in failing:
                recommendations.append("Review API endpoint performance and error handling")
            
            if len(failing) > 1:
                recommendations.append("Conduct comprehensive system health review")
            
            # General recommendations
            recommendations.append("Update error tracking and monitoring systems")
            
            return recommendations[:4]
        
        except Exception:
            return ["Schedule routine system maintenance"]
    
    def _cache_health_report(self, report: SystemHealthReport):
        """Cache health report for quick access."""
        try:
            if self.redis_client:
                report_data = asdict(report)
                # Convert datetime and enum objects to strings
                report_data['timestamp'] = report.timestamp.isoformat()
                report_data['alert_level'] = report.alert_level.value
                report_data['error_rate_trend'] = report.error_rate_trend.value
                
                self.redis_client.setex(
                    "lokdarpan:health_report:latest",
                    3600,  # Cache for 1 hour
                    json.dumps(report_data, default=str)
                )
        except Exception as e:
            self.logger.warning(f"Failed to cache health report: {e}")
    
    def _generate_fallback_report(self) -> SystemHealthReport:
        """Generate fallback report when analysis fails."""
        return SystemHealthReport(
            timestamp=datetime.now(timezone.utc),
            overall_health_score=75.0,
            alert_level=AlertLevel.YELLOW,
            
            total_errors_24h=0,
            error_rate_trend=TrendDirection.STABLE,
            critical_errors=0,
            high_priority_errors=0,
            
            avg_response_time=300.0,
            error_resolution_rate=0.8,
            system_availability=99.0,
            
            component_health_scores={},
            failing_components=[],
            
            top_priorities=["System health analysis unavailable"],
            improvement_opportunities=["Review error tracking system"],
            risk_factors=[],
            
            predicted_issues=[],
            maintenance_recommendations=["Check error analytics system"]
        )
    
    def _severity_weight(self, severity: str) -> int:
        """Get weight for severity ordering."""
        weights = {
            'critical': 4,
            'high': 3,
            'medium': 2,
            'low': 1,
            'info': 0
        }
        return weights.get(severity, 1)

# Create analytics API blueprint
analytics_bp = Blueprint('error_analytics', __name__, url_prefix='/api/v1/analytics')

@analytics_bp.route('/trends', methods=['GET'])
@login_required
def get_error_trends():
    """Get error trend analysis."""
    try:
        hours = int(request.args.get('hours', 24))
        
        # Get error tracker and create analytics engine
        error_tracker = getattr(current_app, 'error_tracker', None)
        if not error_tracker:
            return jsonify({'error': 'Error tracking system not available'}), 503
        
        analytics = ErrorAnalytics(error_tracker)
        trends = analytics.analyze_error_trends(hours)
        
        # Convert trends to JSON-serializable format
        trends_data = []
        for trend in trends:
            trend_dict = asdict(trend)
            trend_dict['trend_direction'] = trend.trend_direction.value
            trends_data.append(trend_dict)
        
        return jsonify({
            'success': True,
            'trends': trends_data,
            'analysis_period_hours': hours,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
    
    except Exception as e:
        current_app.logger.error(f"Error trends analysis failed: {e}")
        return jsonify({'error': 'Failed to analyze error trends'}), 500

@analytics_bp.route('/health', methods=['GET'])
@login_required
def get_system_health():
    """Get comprehensive system health report."""
    try:
        # Get error tracker and create analytics engine
        error_tracker = getattr(current_app, 'error_tracker', None)
        if not error_tracker:
            return jsonify({'error': 'Error tracking system not available'}), 503
        
        analytics = ErrorAnalytics(error_tracker)
        health_report = analytics.generate_system_health_report()
        
        # Convert report to JSON-serializable format
        report_dict = asdict(health_report)
        report_dict['timestamp'] = health_report.timestamp.isoformat()
        report_dict['alert_level'] = health_report.alert_level.value
        report_dict['error_rate_trend'] = health_report.error_rate_trend.value
        
        # Log access
        AuditLogger.log_data_access(
            'system_health',
            'GET',
            {
                'user_id': current_user.id if current_user.is_authenticated else None,
                'health_score': health_report.overall_health_score,
                'alert_level': health_report.alert_level.value
            }
        )
        
        return jsonify({
            'success': True,
            'health_report': report_dict
        })
    
    except Exception as e:
        current_app.logger.error(f"System health report generation failed: {e}")
        return jsonify({'error': 'Failed to generate health report'}), 500

@analytics_bp.route('/dashboard', methods=['GET'])
@login_required
def get_analytics_dashboard():
    """Get analytics dashboard data."""
    try:
        # Get error tracker and create analytics engine
        error_tracker = getattr(current_app, 'error_tracker', None)
        if not error_tracker:
            return jsonify({'error': 'Error tracking system not available'}), 503
        
        analytics = ErrorAnalytics(error_tracker)
        
        # Get multiple time windows
        short_trends = analytics.analyze_error_trends(6)   # 6 hours
        daily_trends = analytics.analyze_error_trends(24)  # 24 hours
        health_report = analytics.generate_system_health_report()
        
        dashboard_data = {
            'health_summary': {
                'overall_score': health_report.overall_health_score,
                'alert_level': health_report.alert_level.value,
                'total_errors_24h': health_report.total_errors_24h,
                'critical_errors': health_report.critical_errors
            },
            'trends': {
                'short_term': [asdict(t) for t in short_trends[:5]],
                'daily': [asdict(t) for t in daily_trends[:5]]
            },
            'insights': {
                'top_priorities': health_report.top_priorities[:3],
                'predicted_issues': health_report.predicted_issues,
                'improvement_opportunities': health_report.improvement_opportunities[:3]
            },
            'component_health': health_report.component_health_scores
        }
        
        # Convert enum values to strings
        for trend_list in dashboard_data['trends'].values():
            for trend in trend_list:
                if 'trend_direction' in trend:
                    trend['trend_direction'] = trend['trend_direction'].value if hasattr(trend['trend_direction'], 'value') else str(trend['trend_direction'])
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
    
    except Exception as e:
        current_app.logger.error(f"Analytics dashboard generation failed: {e}")
        return jsonify({'error': 'Failed to generate analytics dashboard'}), 500

@analytics_bp.route('/export', methods=['GET'])
@login_required
def export_analytics_report():
    """Export comprehensive analytics report."""
    try:
        format_type = request.args.get('format', 'json').lower()
        
        # Get error tracker and create analytics engine
        error_tracker = getattr(current_app, 'error_tracker', None)
        if not error_tracker:
            return jsonify({'error': 'Error tracking system not available'}), 503
        
        analytics = ErrorAnalytics(error_tracker)
        
        # Generate comprehensive data
        trends_24h = analytics.analyze_error_trends(24)
        trends_7d = analytics.analyze_error_trends(168)  # 7 days
        health_report = analytics.generate_system_health_report()
        
        export_data = {
            'metadata': {
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'report_type': 'comprehensive_analytics',
                'time_periods': ['24h', '7d'],
                'user_id': current_user.id if current_user.is_authenticated else None
            },
            'health_report': asdict(health_report),
            'error_trends': {
                '24h': [asdict(t) for t in trends_24h],
                '7d': [asdict(t) for t in trends_7d]
            }
        }
        
        # Convert enum values to strings for JSON serialization
        def convert_enums(obj):
            if hasattr(obj, 'value'):
                return obj.value
            elif isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, dict):
                return {k: convert_enums(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_enums(item) for item in obj]
            return obj
        
        export_data = convert_enums(export_data)
        
        # Log export activity
        AuditLogger.log_data_access(
            'analytics_export',
            'GET',
            {
                'user_id': current_user.id if current_user.is_authenticated else None,
                'format': format_type,
                'data_size': len(str(export_data))
            }
        )
        
        if format_type == 'json':
            return jsonify({
                'success': True,
                'export_data': export_data
            })
        else:
            return jsonify({'error': 'Only JSON format supported currently'}), 400
    
    except Exception as e:
        current_app.logger.error(f"Analytics export failed: {e}")
        return jsonify({'error': 'Failed to export analytics report'}), 500