"""
Observability Dashboard for Political Strategist

Provides comprehensive monitoring dashboards and health check endpoints
for real-time system monitoring and performance analysis.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from flask import Blueprint, jsonify, request
from flask_login import login_required

from .metrics import get_metrics, get_health_monitor

logger = logging.getLogger(__name__)

observability_bp = Blueprint('observability', __name__, url_prefix='/api/v1/monitor')


@observability_bp.route('/health', methods=['GET'])
def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        System health status
    """
    try:
        health_monitor = get_health_monitor()
        health_status = health_monitor.check_system_health()
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return jsonify(health_status), status_code
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@observability_bp.route('/metrics', methods=['GET'])
@login_required
def metrics_summary():
    """
    Get comprehensive metrics summary.
    
    Returns:
        Performance metrics and system statistics
    """
    try:
        metrics = get_metrics()
        summary = metrics.get_metrics_summary()
        
        return jsonify(summary)
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        return jsonify({
            "error": "Metrics unavailable",
            "timestamp": datetime.now().isoformat()
        }), 500


@observability_bp.route('/performance', methods=['GET'])
@login_required
def performance_dashboard():
    """
    Get detailed performance dashboard data.
    
    Returns:
        Performance metrics with trends and alerts
    """
    try:
        health_monitor = get_health_monitor()
        metrics = get_metrics()
        
        dashboard = {
            "timestamp": datetime.now().isoformat(),
            "system_health": health_monitor.check_system_health(),
            "performance_summary": health_monitor.get_performance_summary(),
            "metrics_summary": metrics.get_metrics_summary(),
            "recommendations": generate_performance_recommendations(metrics, health_monitor)
        }
        
        return jsonify(dashboard)
        
    except Exception as e:
        logger.error(f"Error generating performance dashboard: {e}")
        return jsonify({
            "error": "Performance dashboard unavailable",
            "timestamp": datetime.now().isoformat()
        }), 500


@observability_bp.route('/ai-metrics', methods=['GET'])
@login_required
def ai_performance_metrics():
    """
    Get AI model performance metrics.
    
    Returns:
        AI-specific performance data and model health
    """
    try:
        metrics = get_metrics()
        summary = metrics.get_metrics_summary()
        
        # Filter AI-related metrics
        ai_metrics = {
            "model_calls": {k: v for k, v in summary.get("counters", {}).items() if "ai.model" in k},
            "model_timings": {k: v for k, v in summary.get("timers", {}).items() if "ai.model" in k},
            "model_errors": {k: v for k, v in summary.get("errors", {}).items() if "ai.model" in k},
            "api_calls": {k: v for k, v in summary.get("api_calls", {}).items() if any(ai in k for ai in ["gemini", "perplexity", "openai"])}
        }
        
        # Calculate AI health score
        total_calls = sum(ai_metrics["model_calls"].values())
        total_errors = sum(ai_metrics["model_errors"].values())
        error_rate = (total_errors / max(1, total_calls)) * 100
        
        ai_health = {
            "overall_health": "healthy" if error_rate < 5 else "degraded" if error_rate < 15 else "critical",
            "error_rate_percent": error_rate,
            "total_calls": total_calls,
            "total_errors": total_errors
        }
        
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "ai_health": ai_health,
            "ai_metrics": ai_metrics
        })
        
    except Exception as e:
        logger.error(f"Error getting AI metrics: {e}")
        return jsonify({
            "error": "AI metrics unavailable",
            "timestamp": datetime.now().isoformat()
        }), 500


@observability_bp.route('/alerts', methods=['GET'])
@login_required
def system_alerts():
    """
    Get current system alerts and warnings.
    
    Returns:
        List of active alerts and their severity levels
    """
    try:
        health_monitor = get_health_monitor()
        health_status = health_monitor.check_system_health()
        
        alerts = health_status.get("alerts", [])
        
        # Add performance-based alerts
        performance = health_monitor.get_performance_summary()
        
        # Check for slow API responses
        for endpoint, data in performance.get("request_metrics", {}).items():
            if data.get("avg_duration", 0) > 5.0:  # 5 second threshold
                alerts.append({
                    "type": "performance",
                    "severity": "warning",
                    "message": f"Slow API response: {endpoint} averaging {data['avg_duration']:.2f}s",
                    "timestamp": datetime.now().isoformat()
                })
        
        # Check for high error rates
        for error_type, count in performance.get("error_summary", {}).items():
            if count > 5:
                alerts.append({
                    "type": "error_rate",
                    "severity": "warning" if count < 20 else "critical",
                    "message": f"High error count: {error_type} has {count} errors",
                    "timestamp": datetime.now().isoformat()
                })
        
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "alert_count": len(alerts),
            "alerts": alerts
        })
        
    except Exception as e:
        logger.error(f"Error getting system alerts: {e}")
        return jsonify({
            "error": "Alerts unavailable",
            "timestamp": datetime.now().isoformat()
        }), 500


def generate_performance_recommendations(metrics, health_monitor) -> List[Dict[str, Any]]:
    """Generate performance improvement recommendations."""
    recommendations = []
    
    try:
        summary = metrics.get_metrics_summary()
        performance = health_monitor.get_performance_summary()
        
        # Check cache hit rate
        cache_hits = summary.get("counters", {}).get("cache.operations,result=hit", 0)
        cache_misses = summary.get("counters", {}).get("cache.operations,result=miss", 0)
        
        if cache_misses > 0:
            hit_rate = cache_hits / (cache_hits + cache_misses)
            if hit_rate < 0.7:  # Less than 70% hit rate
                recommendations.append({
                    "type": "caching",
                    "priority": "medium",
                    "recommendation": f"Cache hit rate is {hit_rate:.1%}. Consider increasing cache TTL or warming cache.",
                    "impact": "Reduce AI API calls and improve response time"
                })
        
        # Check AI response times
        ai_timings = {k: v for k, v in summary.get("timers", {}).items() if "ai.model" in k}
        for timing_key, data in ai_timings.items():
            if data.get("avg", 0) > 8.0:  # 8 second threshold
                recommendations.append({
                    "type": "ai_performance",
                    "priority": "high",
                    "recommendation": f"AI model {timing_key} is slow (avg: {data['avg']:.1f}s). Consider model optimization.",
                    "impact": "Improve user experience and reduce timeout errors"
                })
        
        # Check error rates
        error_counts = summary.get("errors", {})
        for error_key, count in error_counts.items():
            if count > 10:
                recommendations.append({
                    "type": "reliability",
                    "priority": "high",
                    "recommendation": f"High error count for {error_key} ({count} errors). Investigate root cause.",
                    "impact": "Improve system reliability and user experience"
                })
                
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        recommendations.append({
            "type": "monitoring",
            "priority": "medium", 
            "recommendation": "Monitoring system needs attention - some metrics unavailable",
            "impact": "Improve system observability"
        })
    
    return recommendations