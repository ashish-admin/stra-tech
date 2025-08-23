"""
Observability and Monitoring for Political Strategist

Health checks, performance monitoring, and structured logging.
"""

import os
import time
import logging
import functools
from datetime import datetime, timezone
from typing import Dict, Any, Callable

import redis
import google.generativeai as genai

logger = logging.getLogger(__name__)


def track_api_call(func: Callable) -> Callable:
    """
    Decorator to track API call performance and metrics.
    
    Logs response times, success rates, and error patterns.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        endpoint = func.__name__
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Log successful call
            logger.info(f"API call completed", extra={
                'endpoint': endpoint,
                'duration_ms': round(duration * 1000, 2),
                'status': 'success',
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Log failed call
            logger.error(f"API call failed", extra={
                'endpoint': endpoint,
                'duration_ms': round(duration * 1000, 2),
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
            raise
    
    return wrapper


def get_health_status() -> Dict[str, Any]:
    """
    Comprehensive health check for strategist system.
    
    Returns:
        Health status with dependency checks and performance metrics
    """
    health = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "dependencies": {},
        "performance": {},
        "errors": []
    }
    
    try:
        # Check Redis connectivity
        health["dependencies"]["redis"] = _check_redis()
        
        # Check AI services
        health["dependencies"]["gemini"] = _check_gemini()
        health["dependencies"]["perplexity"] = _check_perplexity()
        health["dependencies"]["openai"] = _check_openai()
        
        # Check database connectivity
        health["dependencies"]["database"] = _check_database()
        
        # Calculate overall status
        dependency_statuses = [dep["status"] for dep in health["dependencies"].values()]
        if "critical_failure" in dependency_statuses:
            health["status"] = "critical"
        elif "degraded" in dependency_statuses:
            health["status"] = "degraded"
        elif all(status == "healthy" for status in dependency_statuses):
            health["status"] = "healthy"
        else:
            health["status"] = "partial"
        
        # Performance metrics
        health["performance"] = _get_performance_metrics()
        
        logger.info(f"Health check completed: {health['status']}")
        return health
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        health.update({
            "status": "error",
            "error": str(e),
            "errors": [str(e)]
        })
        return health


def _check_redis() -> Dict[str, Any]:
    """Check Redis connectivity and performance."""
    try:
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        r = redis.from_url(redis_url)
        
        start_time = time.time()
        r.ping()
        latency = (time.time() - start_time) * 1000
        
        info = r.info()
        
        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "connected_clients": info.get('connected_clients', 0),
            "used_memory": info.get('used_memory_human', 'unknown'),
            "hit_rate": info.get('keyspace_hits', 0) / max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))
        }
        
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "critical_failure",
            "error": str(e),
            "impact": "Caching unavailable"
        }


def _check_gemini() -> Dict[str, Any]:
    """Check Gemini AI service connectivity."""
    try:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return {
                "status": "degraded",
                "error": "API key not configured",
                "impact": "Strategic analysis unavailable"
            }
        
        # Quick connectivity test
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        start_time = time.time()
        response = model.generate_content("Test connectivity", generation_config={
            "max_output_tokens": 10,
            "temperature": 0
        })
        latency = (time.time() - start_time) * 1000
        
        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "model": "gemini-1.5-flash",
            "response_length": len(response.text) if response.text else 0
        }
        
    except Exception as e:
        logger.error(f"Gemini health check failed: {e}")
        return {
            "status": "critical_failure", 
            "error": str(e),
            "impact": "AI strategic analysis unavailable"
        }


def _check_perplexity() -> Dict[str, Any]:
    """Check Perplexity AI service connectivity."""
    try:
        api_key = os.getenv('PERPLEXITY_API_KEY')
        if not api_key:
            return {
                "status": "degraded",
                "error": "API key not configured",
                "impact": "Real-time intelligence gathering limited"
            }
        
        import requests
        
        start_time = time.time()
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 5
            },
            timeout=10
        )
        latency = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            return {
                "status": "healthy",
                "latency_ms": round(latency, 2),
                "model": "llama-3.1-sonar-small-128k-online"
            }
        else:
            return {
                "status": "degraded",
                "error": f"HTTP {response.status_code}",
                "impact": "Intelligence gathering may be limited"
            }
        
    except Exception as e:
        logger.error(f"Perplexity health check failed: {e}")
        return {
            "status": "degraded",
            "error": str(e),
            "impact": "Real-time intelligence gathering unavailable"
        }


def _check_openai() -> Dict[str, Any]:
    """Check OpenAI service connectivity."""
    try:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return {
                "status": "degraded",
                "error": "API key not configured",
                "impact": "Embedding services unavailable"
            }
        
        import requests
        
        start_time = time.time()
        response = requests.post(
            "https://api.openai.com/v1/embeddings",
            headers={'Authorization': f'Bearer {api_key}'},
            json={
                "model": "text-embedding-3-small",
                "input": "test"
            },
            timeout=10
        )
        latency = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            return {
                "status": "healthy",
                "latency_ms": round(latency, 2),
                "model": "text-embedding-3-small"
            }
        else:
            return {
                "status": "degraded",
                "error": f"HTTP {response.status_code}",
                "impact": "Embedding services may be limited"
            }
        
    except Exception as e:
        logger.error(f"OpenAI health check failed: {e}")
        return {
            "status": "degraded",
            "error": str(e),
            "impact": "Embedding services unavailable"
        }


def _check_database() -> Dict[str, Any]:
    """Check database connectivity."""
    try:
        from ..extensions import db
        
        start_time = time.time()
        # Simple query to test connectivity
        result = db.session.execute(db.text("SELECT 1")).scalar()
        latency = (time.time() - start_time) * 1000
        
        if result == 1:
            return {
                "status": "healthy",
                "latency_ms": round(latency, 2),
                "connection": "active"
            }
        else:
            return {
                "status": "degraded",
                "error": "Unexpected query result",
                "impact": "Data access may be limited"
            }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "critical_failure",
            "error": str(e),
            "impact": "Data access unavailable"
        }


def _get_performance_metrics() -> Dict[str, Any]:
    """Get system performance metrics."""
    try:
        import psutil
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_usage_percent": cpu_percent,
            "memory_usage_percent": memory.percent,
            "memory_available_mb": round(memory.available / 1024 / 1024),
            "disk_usage_percent": disk.percent,
            "disk_free_gb": round(disk.free / 1024 / 1024 / 1024, 1),
            "load_average": list(os.getloadavg()) if hasattr(os, 'getloadavg') else None
        }
        
    except ImportError:
        # psutil not available
        return {
            "note": "Detailed performance metrics unavailable (psutil not installed)"
        }
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        return {
            "error": "Performance metrics unavailable"
        }


class StrategistLogger:
    """Structured logging for strategist operations."""
    
    @staticmethod
    def log_analysis_request(ward: str, depth: str, context_mode: str):
        """Log analysis request with structured data."""
        logger.info("Strategic analysis requested", extra={
            'event': 'analysis_request',
            'ward': ward,
            'depth': depth,
            'context_mode': context_mode,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    @staticmethod
    def log_analysis_completion(ward: str, confidence: float, action_count: int, duration: float):
        """Log analysis completion with metrics."""
        logger.info("Strategic analysis completed", extra={
            'event': 'analysis_complete',
            'ward': ward,
            'confidence_score': confidence,
            'recommended_actions': action_count,
            'duration_seconds': round(duration, 2),
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    @staticmethod
    def log_intelligence_update(ward: str, source: str, priority: str):
        """Log new intelligence update."""
        logger.info("Intelligence update received", extra={
            'event': 'intelligence_update',
            'ward': ward,
            'source': source,
            'priority': priority,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    @staticmethod
    def log_error(operation: str, error: str, context: Dict[str, Any] = None):
        """Log error with context."""
        logger.error("Strategist operation failed", extra={
            'event': 'operation_error',
            'operation': operation,
            'error': error,
            'context': context or {},
            'timestamp': datetime.now(timezone.utc).isoformat()
        })