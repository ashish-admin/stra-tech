"""
Phase 3: AI Service Circuit Breaker System

Implements circuit breaker pattern for graceful degradation when AI services fail.
Provides health monitoring, failure tracking, and intelligent recovery strategies.
"""

import time
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Callable, Tuple, List
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker state enumeration."""
    CLOSED = "closed"        # Normal operation
    OPEN = "open"            # Circuit breaker triggered, failing fast
    HALF_OPEN = "half_open"  # Testing if service has recovered


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration."""
    failure_threshold: int = 5          # Number of failures before opening circuit
    recovery_timeout: int = 60          # Seconds to wait before attempting recovery
    success_threshold: int = 3          # Successful calls needed to close circuit from half-open
    timeout_seconds: float = 30.0       # Request timeout
    exponential_backoff: bool = True    # Use exponential backoff for recovery
    max_recovery_timeout: int = 300     # Maximum recovery timeout (5 minutes)


@dataclass
class ServiceMetrics:
    """Service performance and health metrics."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    average_response_time: float = 0.0
    circuit_open_count: int = 0
    last_circuit_open_time: Optional[datetime] = None
    response_times: list = field(default_factory=list)


class AIServiceCircuitBreaker:
    """
    Phase 3: Circuit breaker for AI services with intelligent recovery.
    
    Monitors AI service health and implements circuit breaker pattern to prevent
    cascade failures and provide graceful degradation.
    """
    
    def __init__(self, service_name: str, config: Optional[CircuitBreakerConfig] = None):
        self.service_name = service_name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.metrics = ServiceMetrics()
        self.state_change_time = datetime.now(timezone.utc)
        self.recovery_timeout_multiplier = 1
        self._lock = asyncio.Lock()
        
        logger.info(f"Circuit breaker initialized for {service_name}: {self.config}")
    
    async def call_service(
        self, 
        service_func: Callable,
        *args,
        fallback_func: Optional[Callable] = None,
        **kwargs
    ) -> Tuple[Any, bool]:
        """
        Call AI service with circuit breaker protection.
        
        Args:
            service_func: The AI service function to call
            *args: Arguments for service function
            fallback_func: Fallback function if circuit is open
            **kwargs: Keyword arguments for service function
            
        Returns:
            Tuple of (result, is_success)
        """
        async with self._lock:
            self.metrics.total_requests += 1
            
            # Check circuit state and decide whether to proceed
            if self.state == CircuitState.OPEN:
                if not self._should_attempt_reset():
                    logger.warning(f"Circuit breaker OPEN for {self.service_name} - using fallback")
                    if fallback_func:
                        try:
                            fallback_result = await self._execute_with_timeout(fallback_func, *args, **kwargs)
                            return fallback_result, False
                        except Exception as e:
                            logger.error(f"Fallback function failed for {self.service_name}: {e}")
                            return self._default_fallback_response(), False
                    return self._default_fallback_response(), False
                else:
                    # Transition to half-open to test service
                    self.state = CircuitState.HALF_OPEN
                    self.state_change_time = datetime.now(timezone.utc)
                    logger.info(f"Circuit breaker transitioning to HALF_OPEN for {self.service_name}")
            
            # Attempt to call the service
            start_time = time.time()
            try:
                result = await self._execute_with_timeout(service_func, *args, **kwargs)
                
                # Record successful call
                response_time = time.time() - start_time
                await self._record_success(response_time)
                
                return result, True
                
            except Exception as e:
                # Record failed call
                response_time = time.time() - start_time
                await self._record_failure(e, response_time)
                
                # Use fallback if available
                if fallback_func:
                    try:
                        logger.info(f"Using fallback for {self.service_name} after failure: {e}")
                        fallback_result = await self._execute_with_timeout(fallback_func, *args, **kwargs)
                        return fallback_result, False
                    except Exception as fallback_error:
                        logger.error(f"Fallback function failed for {self.service_name}: {fallback_error}")
                
                return self._default_fallback_response(), False
    
    async def _execute_with_timeout(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with timeout protection."""
        return await asyncio.wait_for(
            func(*args, **kwargs),
            timeout=self.config.timeout_seconds
        )
    
    async def _record_success(self, response_time: float):
        """Record successful service call."""
        self.metrics.successful_requests += 1
        self.metrics.consecutive_failures = 0
        self.metrics.consecutive_successes += 1
        self.metrics.last_success_time = datetime.now(timezone.utc)
        
        # Update response time metrics
        self.metrics.response_times.append(response_time)
        if len(self.metrics.response_times) > 100:
            self.metrics.response_times.pop(0)  # Keep last 100 response times
        
        self.metrics.average_response_time = sum(self.metrics.response_times) / len(self.metrics.response_times)
        
        # Check if we should close circuit from half-open state
        if self.state == CircuitState.HALF_OPEN:
            if self.metrics.consecutive_successes >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.state_change_time = datetime.now(timezone.utc)
                self.recovery_timeout_multiplier = 1  # Reset backoff multiplier
                logger.info(f"Circuit breaker CLOSED for {self.service_name} after successful recovery")
        
        logger.debug(f"Success recorded for {self.service_name}: {response_time:.2f}s response time")
    
    async def _record_failure(self, error: Exception, response_time: float):
        """Record failed service call."""
        self.metrics.failed_requests += 1
        self.metrics.consecutive_successes = 0
        self.metrics.consecutive_failures += 1
        self.metrics.last_failure_time = datetime.now(timezone.utc)
        
        # Update response time (even for failures)
        self.metrics.response_times.append(response_time)
        if len(self.metrics.response_times) > 100:
            self.metrics.response_times.pop(0)
        
        error_type = type(error).__name__
        logger.warning(f"Failure recorded for {self.service_name}: {error_type} - {str(error)[:100]}")
        
        # Check if we should open circuit
        if (self.state in [CircuitState.CLOSED, CircuitState.HALF_OPEN] and 
            self.metrics.consecutive_failures >= self.config.failure_threshold):
            
            self.state = CircuitState.OPEN
            self.state_change_time = datetime.now(timezone.utc)
            self.metrics.circuit_open_count += 1
            self.metrics.last_circuit_open_time = datetime.now(timezone.utc)
            
            # Apply exponential backoff
            if self.config.exponential_backoff:
                self.recovery_timeout_multiplier = min(
                    self.recovery_timeout_multiplier * 2,
                    self.config.max_recovery_timeout // self.config.recovery_timeout
                )
            
            logger.error(f"Circuit breaker OPENED for {self.service_name} after {self.metrics.consecutive_failures} failures")
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt to reset."""
        if self.state != CircuitState.OPEN:
            return False
        
        recovery_timeout = self.config.recovery_timeout * self.recovery_timeout_multiplier
        time_since_open = (datetime.now(timezone.utc) - self.state_change_time).total_seconds()
        
        return time_since_open >= recovery_timeout
    
    def _default_fallback_response(self) -> Dict[str, Any]:
        """Default fallback response when service is unavailable."""
        return {
            "error": f"{self.service_name} temporarily unavailable",
            "fallback_mode": True,
            "circuit_breaker_state": self.state.value,
            "service_name": self.service_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "retry_after": self.config.recovery_timeout * self.recovery_timeout_multiplier
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get detailed health status of the circuit breaker."""
        success_rate = (
            self.metrics.successful_requests / max(1, self.metrics.total_requests)
        ) * 100
        
        return {
            "service_name": self.service_name,
            "circuit_state": self.state.value,
            "state_duration_seconds": (
                datetime.now(timezone.utc) - self.state_change_time
            ).total_seconds(),
            "metrics": {
                "total_requests": self.metrics.total_requests,
                "success_rate_percent": round(success_rate, 2),
                "consecutive_failures": self.metrics.consecutive_failures,
                "consecutive_successes": self.metrics.consecutive_successes,
                "average_response_time_ms": round(self.metrics.average_response_time * 1000, 2),
                "circuit_open_count": self.metrics.circuit_open_count,
                "last_failure": self.metrics.last_failure_time.isoformat() if self.metrics.last_failure_time else None,
                "last_success": self.metrics.last_success_time.isoformat() if self.metrics.last_success_time else None
            },
            "config": {
                "failure_threshold": self.config.failure_threshold,
                "recovery_timeout": self.config.recovery_timeout,
                "success_threshold": self.config.success_threshold,
                "timeout_seconds": self.config.timeout_seconds
            },
            "recovery": {
                "timeout_multiplier": self.recovery_timeout_multiplier,
                "next_reset_attempt": (
                    self.state_change_time + timedelta(
                        seconds=self.config.recovery_timeout * self.recovery_timeout_multiplier
                    )
                ).isoformat() if self.state == CircuitState.OPEN else None
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def reset_circuit(self):
        """Manually reset circuit breaker (for administrative use)."""
        logger.info(f"Manually resetting circuit breaker for {self.service_name}")
        self.state = CircuitState.CLOSED
        self.state_change_time = datetime.now(timezone.utc)
        self.metrics.consecutive_failures = 0
        self.metrics.consecutive_successes = 0
        self.recovery_timeout_multiplier = 1


class CircuitBreakerManager:
    """
    Phase 3: Manager for multiple AI service circuit breakers.
    
    Coordinates circuit breakers across different AI services and provides
    centralized health monitoring and control.
    """
    
    def __init__(self):
        self.circuit_breakers: Dict[str, AIServiceCircuitBreaker] = {}
        self.global_fallback_enabled = True
        self.health_check_interval = 30  # seconds
        
        logger.info("Circuit breaker manager initialized")
    
    def get_or_create_circuit_breaker(
        self, 
        service_name: str, 
        config: Optional[CircuitBreakerConfig] = None
    ) -> AIServiceCircuitBreaker:
        """Get existing or create new circuit breaker for service."""
        if service_name not in self.circuit_breakers:
            self.circuit_breakers[service_name] = AIServiceCircuitBreaker(service_name, config)
            logger.info(f"Created circuit breaker for service: {service_name}")
        
        return self.circuit_breakers[service_name]
    
    async def call_with_circuit_breaker(
        self,
        service_name: str,
        service_func: Callable,
        *args,
        fallback_func: Optional[Callable] = None,
        circuit_config: Optional[CircuitBreakerConfig] = None,
        **kwargs
    ) -> Tuple[Any, bool]:
        """
        Call service with circuit breaker protection.
        
        Args:
            service_name: Name of the service
            service_func: Service function to call
            fallback_func: Fallback function if service fails
            circuit_config: Circuit breaker configuration
            
        Returns:
            Tuple of (result, is_success)
        """
        circuit_breaker = self.get_or_create_circuit_breaker(service_name, circuit_config)
        return await circuit_breaker.call_service(service_func, *args, fallback_func=fallback_func, **kwargs)
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status."""
        total_services = len(self.circuit_breakers)
        healthy_services = sum(
            1 for cb in self.circuit_breakers.values() 
            if cb.state == CircuitState.CLOSED
        )
        
        degraded_services = sum(
            1 for cb in self.circuit_breakers.values() 
            if cb.state == CircuitState.HALF_OPEN
        )
        
        failed_services = sum(
            1 for cb in self.circuit_breakers.values() 
            if cb.state == CircuitState.OPEN
        )
        
        # Calculate system health score
        if total_services == 0:
            health_score = 100.0
        else:
            health_score = (
                (healthy_services * 100 + degraded_services * 50) / total_services
            )
        
        # Determine overall system status
        if health_score >= 80:
            system_status = "healthy"
        elif health_score >= 50:
            system_status = "degraded"
        else:
            system_status = "unhealthy"
        
        return {
            "system_status": system_status,
            "health_score": round(health_score, 1),
            "service_summary": {
                "total_services": total_services,
                "healthy_services": healthy_services,
                "degraded_services": degraded_services,
                "failed_services": failed_services
            },
            "services": {
                name: cb.get_health_status() 
                for name, cb in self.circuit_breakers.items()
            },
            "global_fallback_enabled": self.global_fallback_enabled,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def reset_all_circuits(self):
        """Reset all circuit breakers (for administrative use)."""
        logger.info("Resetting all circuit breakers")
        for circuit_breaker in self.circuit_breakers.values():
            circuit_breaker.reset_circuit()
    
    def get_service_recommendations(self) -> List[Dict[str, Any]]:
        """Get recommendations for improving service reliability."""
        recommendations = []
        
        for name, cb in self.circuit_breakers.items():
            health = cb.get_health_status()
            success_rate = health["metrics"]["success_rate_percent"]
            avg_response_time = health["metrics"]["average_response_time_ms"]
            
            if success_rate < 95:
                recommendations.append({
                    "service": name,
                    "type": "reliability",
                    "priority": "high" if success_rate < 80 else "medium",
                    "recommendation": f"Service {name} has {success_rate:.1f}% success rate. Consider investigating root cause.",
                    "metric": f"Success rate: {success_rate:.1f}%"
                })
            
            if avg_response_time > 10000:  # > 10 seconds
                recommendations.append({
                    "service": name,
                    "type": "performance",
                    "priority": "medium",
                    "recommendation": f"Service {name} has high response time. Consider optimization.",
                    "metric": f"Avg response time: {avg_response_time:.0f}ms"
                })
            
            if cb.metrics.circuit_open_count > 5:
                recommendations.append({
                    "service": name,
                    "type": "stability",
                    "priority": "high",
                    "recommendation": f"Service {name} has triggered circuit breaker {cb.metrics.circuit_open_count} times. Review service stability.",
                    "metric": f"Circuit breaker triggers: {cb.metrics.circuit_open_count}"
                })
        
        return recommendations


# Global circuit breaker manager instance
circuit_breaker_manager = CircuitBreakerManager()


# Convenience functions for common AI services
async def call_gemini_with_circuit_breaker(
    service_func: Callable,
    *args,
    fallback_func: Optional[Callable] = None,
    **kwargs
) -> Tuple[Any, bool]:
    """Call Gemini service with circuit breaker protection."""
    config = CircuitBreakerConfig(
        failure_threshold=3,
        recovery_timeout=45,
        timeout_seconds=20.0
    )
    return await circuit_breaker_manager.call_with_circuit_breaker(
        "gemini-2.0-flash-exp",
        service_func,
        *args,
        fallback_func=fallback_func,
        circuit_config=config,
        **kwargs
    )


async def call_perplexity_with_circuit_breaker(
    service_func: Callable,
    *args,
    fallback_func: Optional[Callable] = None,
    **kwargs
) -> Tuple[Any, bool]:
    """Call Perplexity service with circuit breaker protection."""
    config = CircuitBreakerConfig(
        failure_threshold=4,
        recovery_timeout=60,
        timeout_seconds=25.0
    )
    return await circuit_breaker_manager.call_with_circuit_breaker(
        "perplexity-pro",
        service_func,
        *args,
        fallback_func=fallback_func,
        circuit_config=config,
        **kwargs
    )