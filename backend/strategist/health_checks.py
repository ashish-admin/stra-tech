"""
Health Check System for Political Strategist

Comprehensive health monitoring for:
- AI service availability
- Database connectivity
- Cache system status
- SSE connections
- Performance metrics
"""

import os
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ComponentStatus(Enum):
    """Component status levels."""
    UP = "up"
    DOWN = "down"
    PARTIAL = "partial"
    UNKNOWN = "unknown"


@dataclass
class ComponentHealth:
    """Health status for a single component."""
    name: str
    status: ComponentStatus
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    last_check: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = {
            'name': self.name,
            'status': self.status.value,
            'message': self.message
        }
        if self.latency_ms is not None:
            data['latency_ms'] = round(self.latency_ms, 2)
        if self.last_check:
            data['last_check'] = self.last_check.isoformat()
        if self.metadata:
            data['metadata'] = self.metadata
        return data


class HealthChecker:
    """Main health check coordinator."""
    
    def __init__(self):
        self.components: List[ComponentHealth] = []
        self.last_check_time: Optional[datetime] = None
        self.check_interval = 30  # seconds
        
    async def check_all_components(self) -> Dict[str, Any]:
        """
        Check health of all components.
        
        Returns:
            Complete health status report
        """
        start_time = time.time()
        self.components = []
        
        # Run all health checks concurrently
        tasks = [
            self._check_database(),
            self._check_cache(),
            self._check_ai_services(),
            self._check_sse_system(),
            self._check_file_system()
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for result in results:
            if isinstance(result, ComponentHealth):
                self.components.append(result)
            elif isinstance(result, Exception):
                logger.error(f"Health check error: {result}")
                self.components.append(ComponentHealth(
                    name="unknown",
                    status=ComponentStatus.UNKNOWN,
                    message=str(result)
                ))
        
        # Calculate overall status
        overall_status = self._calculate_overall_status()
        check_duration_ms = (time.time() - start_time) * 1000
        self.last_check_time = datetime.now(timezone.utc)
        
        return {
            'status': overall_status.value,
            'timestamp': self.last_check_time.isoformat(),
            'check_duration_ms': round(check_duration_ms, 2),
            'components': [c.to_dict() for c in self.components],
            'summary': self._generate_summary()
        }
    
    def _calculate_overall_status(self) -> HealthStatus:
        """Calculate overall health status from component statuses."""
        if not self.components:
            return HealthStatus.UNKNOWN
        
        statuses = [c.status for c in self.components]
        
        # If any critical component is down, system is unhealthy
        critical_components = ['database', 'cache']
        critical_statuses = [c.status for c in self.components if c.name in critical_components]
        if ComponentStatus.DOWN in critical_statuses:
            return HealthStatus.UNHEALTHY
        
        # If all components are up, system is healthy
        if all(s == ComponentStatus.UP for s in statuses):
            return HealthStatus.HEALTHY
        
        # If any component is down or partial, system is degraded
        if ComponentStatus.DOWN in statuses or ComponentStatus.PARTIAL in statuses:
            return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate health summary statistics."""
        total = len(self.components)
        if total == 0:
            return {}
        
        up_count = sum(1 for c in self.components if c.status == ComponentStatus.UP)
        down_count = sum(1 for c in self.components if c.status == ComponentStatus.DOWN)
        partial_count = sum(1 for c in self.components if c.status == ComponentStatus.PARTIAL)
        
        avg_latency = None
        latencies = [c.latency_ms for c in self.components if c.latency_ms is not None]
        if latencies:
            avg_latency = sum(latencies) / len(latencies)
        
        return {
            'total_components': total,
            'healthy_components': up_count,
            'unhealthy_components': down_count,
            'degraded_components': partial_count,
            'health_percentage': round((up_count / total) * 100, 1),
            'average_latency_ms': round(avg_latency, 2) if avg_latency else None
        }
    
    async def _check_database(self) -> ComponentHealth:
        """Check database connectivity."""
        try:
            start = time.time()
            from app.models import db, User
            from flask import current_app
            
            # Try to execute a simple query
            with current_app.app_context():
                user_count = db.session.query(User).count()
                latency_ms = (time.time() - start) * 1000
                
                return ComponentHealth(
                    name='database',
                    status=ComponentStatus.UP,
                    latency_ms=latency_ms,
                    message=f'Connected, {user_count} users',
                    last_check=datetime.now(timezone.utc),
                    metadata={'user_count': user_count}
                )
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return ComponentHealth(
                name='database',
                status=ComponentStatus.DOWN,
                message=str(e)[:200],
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_cache(self) -> ComponentHealth:
        """Check Redis cache connectivity."""
        try:
            redis_url = os.getenv('REDIS_URL')
            if not redis_url:
                return ComponentHealth(
                    name='cache',
                    status=ComponentStatus.PARTIAL,
                    message='Redis not configured, using in-memory cache',
                    last_check=datetime.now(timezone.utc)
                )
            
            start = time.time()
            import redis.asyncio as redis
            
            # Test Redis connection
            r = redis.from_url(redis_url)
            await r.ping()
            info = await r.info()
            await r.close()
            
            latency_ms = (time.time() - start) * 1000
            
            return ComponentHealth(
                name='cache',
                status=ComponentStatus.UP,
                latency_ms=latency_ms,
                message='Redis connected',
                last_check=datetime.now(timezone.utc),
                metadata={
                    'version': info.get('redis_version'),
                    'used_memory': info.get('used_memory_human'),
                    'connected_clients': info.get('connected_clients')
                }
            )
        except Exception as e:
            logger.warning(f"Cache health check failed: {e}")
            return ComponentHealth(
                name='cache',
                status=ComponentStatus.PARTIAL,
                message=f'Redis unavailable, using fallback: {str(e)[:100]}',
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_ai_services(self) -> ComponentHealth:
        """Check AI service availability."""
        try:
            from .ai_connection_pool import get_pool_manager
            
            manager = get_pool_manager()
            stats = manager.get_all_stats()
            
            # Check which services are available
            available_services = []
            unavailable_services = []
            total_success_rate = 0
            service_count = 0
            
            for service, service_stats in stats.items():
                if service_stats['total_requests'] > 0:
                    success_rate = service_stats.get('success_rate', '0%')
                    success_rate_value = float(success_rate.rstrip('%'))
                    total_success_rate += success_rate_value
                    service_count += 1
                    
                    if success_rate_value > 50:
                        available_services.append(service)
                    else:
                        unavailable_services.append(service)
                else:
                    # Service not tested yet, check if configured
                    if manager.is_service_available(service):
                        available_services.append(service)
            
            # Check API key configuration
            gemini_configured = bool(os.getenv('GEMINI_API_KEY'))
            perplexity_configured = bool(os.getenv('PERPLEXITY_API_KEY'))
            
            if not gemini_configured and not perplexity_configured:
                return ComponentHealth(
                    name='ai_services',
                    status=ComponentStatus.DOWN,
                    message='No AI services configured',
                    last_check=datetime.now(timezone.utc)
                )
            
            # Determine status
            if len(available_services) == 0:
                status = ComponentStatus.DOWN
                message = 'All AI services unavailable'
            elif len(unavailable_services) > 0:
                status = ComponentStatus.PARTIAL
                message = f'Partial: {", ".join(available_services)} up, {", ".join(unavailable_services)} down'
            else:
                status = ComponentStatus.UP
                message = f'All services operational: {", ".join(available_services)}'
            
            avg_success_rate = (total_success_rate / service_count) if service_count > 0 else 0
            
            return ComponentHealth(
                name='ai_services',
                status=status,
                message=message,
                last_check=datetime.now(timezone.utc),
                metadata={
                    'configured_services': {
                        'gemini': gemini_configured,
                        'perplexity': perplexity_configured
                    },
                    'available_services': available_services,
                    'average_success_rate': f'{avg_success_rate:.1f}%',
                    'detailed_stats': stats
                }
            )
        except Exception as e:
            logger.error(f"AI services health check failed: {e}")
            return ComponentHealth(
                name='ai_services',
                status=ComponentStatus.UNKNOWN,
                message=str(e)[:200],
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_sse_system(self) -> ComponentHealth:
        """Check SSE system status."""
        try:
            from .sse_enhanced import get_sse_stats
            
            sse_stats = get_sse_stats()
            active_connections = sse_stats.get('active_connections', 0)
            max_connections = sse_stats.get('max_connections', 100)
            
            # Calculate load percentage
            load_percentage = (active_connections / max_connections) * 100 if max_connections > 0 else 0
            
            if load_percentage > 90:
                status = ComponentStatus.PARTIAL
                message = f'High load: {active_connections}/{max_connections} connections'
            else:
                status = ComponentStatus.UP
                message = f'Operational: {active_connections}/{max_connections} connections'
            
            return ComponentHealth(
                name='sse_system',
                status=status,
                message=message,
                last_check=datetime.now(timezone.utc),
                metadata={
                    'active_connections': active_connections,
                    'max_connections': max_connections,
                    'load_percentage': round(load_percentage, 1)
                }
            )
        except Exception as e:
            logger.warning(f"SSE system health check failed: {e}")
            return ComponentHealth(
                name='sse_system',
                status=ComponentStatus.PARTIAL,
                message='SSE system check failed',
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_file_system(self) -> ComponentHealth:
        """Check file system status."""
        try:
            import shutil
            
            # Check disk usage
            usage = shutil.disk_usage('/')
            used_percentage = (usage.used / usage.total) * 100
            
            if used_percentage > 90:
                status = ComponentStatus.PARTIAL
                message = f'Low disk space: {used_percentage:.1f}% used'
            else:
                status = ComponentStatus.UP
                message = f'Disk space OK: {used_percentage:.1f}% used'
            
            return ComponentHealth(
                name='file_system',
                status=status,
                message=message,
                last_check=datetime.now(timezone.utc),
                metadata={
                    'total_gb': round(usage.total / (1024**3), 2),
                    'used_gb': round(usage.used / (1024**3), 2),
                    'free_gb': round(usage.free / (1024**3), 2),
                    'used_percentage': round(used_percentage, 1)
                }
            )
        except Exception as e:
            logger.warning(f"File system health check failed: {e}")
            return ComponentHealth(
                name='file_system',
                status=ComponentStatus.UNKNOWN,
                message=str(e)[:200],
                last_check=datetime.now(timezone.utc)
            )


# Global health checker instance
_health_checker = HealthChecker()


async def get_health_status() -> Dict[str, Any]:
    """Get current health status."""
    return await _health_checker.check_all_components()


async def get_quick_health() -> Dict[str, Any]:
    """Get quick health status (cached if recent)."""
    # If last check was within 30 seconds, return cached result
    if (_health_checker.last_check_time and 
        datetime.now(timezone.utc) - _health_checker.last_check_time < timedelta(seconds=30)):
        
        return {
            'status': _health_checker._calculate_overall_status().value,
            'timestamp': _health_checker.last_check_time.isoformat(),
            'cached': True,
            'components': [c.to_dict() for c in _health_checker.components]
        }
    
    # Otherwise perform new check
    return await get_health_status()


def get_readiness_probe() -> tuple[bool, Dict[str, Any]]:
    """
    Kubernetes readiness probe.
    
    Returns:
        Tuple of (is_ready, details)
    """
    try:
        # Quick synchronous checks
        checks = {
            'database': bool(os.getenv('DATABASE_URL')),
            'ai_configured': bool(os.getenv('GEMINI_API_KEY') or os.getenv('PERPLEXITY_API_KEY'))
        }
        
        is_ready = all(checks.values())
        
        return is_ready, {
            'ready': is_ready,
            'checks': checks,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Readiness probe error: {e}")
        return False, {
            'ready': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }


def get_liveness_probe() -> tuple[bool, Dict[str, Any]]:
    """
    Kubernetes liveness probe.
    
    Returns:
        Tuple of (is_alive, details)
    """
    try:
        # Simple check that service is running
        return True, {
            'alive': True,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'service': 'political_strategist'
        }
    except Exception as e:
        logger.error(f"Liveness probe error: {e}")
        return False, {
            'alive': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }