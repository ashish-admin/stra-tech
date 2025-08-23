"""
Backend Error Recovery and Resilience Framework

Implements circuit breaker patterns, graceful degradation, retry mechanisms,
and fault tolerance for the LokDarpan Political Strategist system.
"""

import time
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Callable, List
from functools import wraps
from enum import Enum
import random

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states for fault tolerance."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing recovery


class BackendCircuitBreaker:
    """
    Circuit breaker implementation for backend service resilience.
    
    Prevents cascade failures by monitoring error rates and temporarily
    blocking requests to failing services.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout_seconds: int = 60,
        expected_exception: Exception = Exception
    ):
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout_seconds = timeout_seconds
        self.expected_exception = expected_exception
        
        # State tracking
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.last_success_time = None
        
        # Metrics
        self.total_requests = 0
        self.total_failures = 0
        self.state_changes = []
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator to wrap functions with circuit breaker logic."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""
        self.total_requests += 1
        
        if self.state == CircuitBreakerState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitBreakerState.HALF_OPEN
                logger.info(f"Circuit breaker for {func.__name__} transitioning to HALF_OPEN")
                self._record_state_change("HALF_OPEN")
            else:
                logger.warning(f"Circuit breaker for {func.__name__} is OPEN, request blocked")
                raise CircuitBreakerOpenException(
                    f"Circuit breaker is open for {func.__name__}. "
                    f"Will retry after {self.timeout_seconds} seconds."
                )
        
        try:
            # Execute the function
            result = func(*args, **kwargs)
            self._record_success()
            return result
            
        except self.expected_exception as e:
            self._record_failure()
            raise e
    
    def _record_success(self):
        """Record a successful request."""
        self.success_count += 1
        self.last_success_time = datetime.now(timezone.utc)
        
        if self.state == CircuitBreakerState.HALF_OPEN:
            if self.success_count >= self.success_threshold:
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                logger.info("Circuit breaker reset to CLOSED after successful recovery")
                self._record_state_change("CLOSED")
        
        elif self.state == CircuitBreakerState.CLOSED:
            # Reset failure count on success
            self.failure_count = 0
    
    def _record_failure(self):
        """Record a failed request."""
        self.failure_count += 1
        self.total_failures += 1
        self.last_failure_time = datetime.now(timezone.utc)
        
        if self.state == CircuitBreakerState.CLOSED or self.state == CircuitBreakerState.HALF_OPEN:
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitBreakerState.OPEN
                self.success_count = 0
                logger.warning(f"Circuit breaker opened due to {self.failure_count} failures")
                self._record_state_change("OPEN")
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = datetime.now(timezone.utc) - self.last_failure_time
        return time_since_failure.total_seconds() >= self.timeout_seconds
    
    def _record_state_change(self, new_state: str):
        """Record state change for monitoring."""
        self.state_changes.append({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'from_state': self.state.value if hasattr(self.state, 'value') else str(self.state),
            'to_state': new_state,
            'failure_count': self.failure_count,
            'success_count': self.success_count
        })
        
        # Keep only last 100 state changes
        if len(self.state_changes) > 100:
            self.state_changes = self.state_changes[-100:]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics."""
        return {
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'total_requests': self.total_requests,
            'total_failures': self.total_failures,
            'failure_rate': self.total_failures / max(1, self.total_requests),
            'last_failure_time': self.last_failure_time.isoformat() if self.last_failure_time else None,
            'last_success_time': self.last_success_time.isoformat() if self.last_success_time else None,
            'recent_state_changes': self.state_changes[-10:],  # Last 10 changes
            'thresholds': {
                'failure_threshold': self.failure_threshold,
                'success_threshold': self.success_threshold,
                'timeout_seconds': self.timeout_seconds
            }
        }
    
    def reset(self):
        """Manually reset circuit breaker to closed state."""
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        logger.info("Circuit breaker manually reset to CLOSED state")
        self._record_state_change("CLOSED")


class CircuitBreakerOpenException(Exception):
    """Exception raised when circuit breaker is open."""
    pass


class RetryHandler:
    """
    Advanced retry handler with exponential backoff, jitter, and condition-based retries.
    """
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retry_conditions: Optional[List[Callable]] = None
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retry_conditions = retry_conditions or [self._default_retry_condition]
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator to add retry logic to functions."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self.retry_call(func, *args, **kwargs)
        return wrapper
    
    def retry_call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry logic."""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                result = func(*args, **kwargs)
                if attempt > 0:
                    logger.info(f"Function {func.__name__} succeeded after {attempt} retries")
                return result
                
            except Exception as e:
                last_exception = e
                
                # Check if we should retry this exception
                should_retry = any(condition(e) for condition in self.retry_conditions)
                
                if not should_retry or attempt == self.max_retries:
                    if attempt > 0:
                        logger.error(f"Function {func.__name__} failed after {attempt} retries: {e}")
                    raise e
                
                # Calculate delay with exponential backoff
                delay = min(
                    self.base_delay * (self.exponential_base ** attempt),
                    self.max_delay
                )
                
                # Add jitter to prevent thundering herd
                if self.jitter:
                    delay *= (0.5 + random.random() * 0.5)
                
                logger.warning(f"Function {func.__name__} failed (attempt {attempt + 1}/{self.max_retries + 1}), "
                             f"retrying in {delay:.2f}s: {e}")
                
                time.sleep(delay)
        
        # This should never be reached, but just in case
        raise last_exception
    
    @staticmethod
    def _default_retry_condition(exception: Exception) -> bool:
        """Default condition for retrying - retry on most exceptions except certain types."""
        # Don't retry on these exception types
        non_retryable = (
            ValueError,
            TypeError,
            AttributeError,
            KeyError,
            FileNotFoundError,
            PermissionError
        )
        
        return not isinstance(exception, non_retryable)


class GracefulDegradationManager:
    """
    Manager for graceful degradation strategies when services are unavailable.
    """
    
    def __init__(self):
        self.degradation_strategies = {}
        self.service_health = {}
        self.fallback_cache = {}
    
    def register_degradation_strategy(
        self, 
        service_name: str, 
        strategy: Callable,
        cache_ttl: int = 300
    ):
        """
        Register a degradation strategy for a service.
        
        Args:
            service_name: Name of the service
            strategy: Fallback function to call when service is unavailable
            cache_ttl: TTL for caching fallback results (seconds)
        """
        self.degradation_strategies[service_name] = {
            'strategy': strategy,
            'cache_ttl': cache_ttl
        }
        self.service_health[service_name] = {
            'available': True,
            'last_check': datetime.now(timezone.utc),
            'failure_count': 0
        }
        logger.info(f"Registered degradation strategy for service: {service_name}")
    
    def execute_with_degradation(
        self, 
        service_name: str, 
        primary_func: Callable,
        *args, 
        **kwargs
    ) -> Any:
        """
        Execute function with graceful degradation fallback.
        
        Args:
            service_name: Name of the service
            primary_func: Primary function to attempt
            *args, **kwargs: Arguments for the function
            
        Returns:
            Result from primary function or degraded fallback
        """
        try:
            # Attempt primary function
            result = primary_func(*args, **kwargs)
            
            # Mark service as healthy
            self._mark_service_healthy(service_name)
            
            return result
            
        except Exception as e:
            logger.warning(f"Service {service_name} failed: {e}")
            
            # Mark service as unhealthy
            self._mark_service_unhealthy(service_name)
            
            # Try degraded fallback
            return self._execute_degraded_fallback(service_name, e, *args, **kwargs)
    
    def _execute_degraded_fallback(
        self, 
        service_name: str, 
        original_error: Exception,
        *args, 
        **kwargs
    ) -> Any:
        """Execute degraded fallback strategy."""
        strategy_info = self.degradation_strategies.get(service_name)
        if not strategy_info:
            logger.error(f"No degradation strategy registered for service: {service_name}")
            raise original_error
        
        try:
            # Check cache first
            cache_key = f"{service_name}:{hash(str(args) + str(kwargs))}"
            cached_result = self._get_cached_result(cache_key, strategy_info['cache_ttl'])
            if cached_result is not None:
                logger.info(f"Using cached fallback result for service: {service_name}")
                return cached_result
            
            # Execute fallback strategy
            logger.info(f"Executing degradation strategy for service: {service_name}")
            fallback_result = strategy_info['strategy'](*args, **kwargs)
            
            # Cache the result
            self._cache_result(cache_key, fallback_result)
            
            return fallback_result
            
        except Exception as fallback_error:
            logger.error(f"Degradation strategy failed for service {service_name}: {fallback_error}")
            # Return a minimal fallback response
            return self._get_minimal_fallback(service_name, original_error)
    
    def _mark_service_healthy(self, service_name: str):
        """Mark a service as healthy."""
        if service_name in self.service_health:
            self.service_health[service_name].update({
                'available': True,
                'last_check': datetime.now(timezone.utc),
                'failure_count': 0
            })
    
    def _mark_service_unhealthy(self, service_name: str):
        """Mark a service as unhealthy."""
        if service_name in self.service_health:
            health = self.service_health[service_name]
            health.update({
                'available': False,
                'last_check': datetime.now(timezone.utc),
                'failure_count': health.get('failure_count', 0) + 1
            })
    
    def _get_cached_result(self, cache_key: str, ttl: int) -> Any:
        """Get cached result if still valid."""
        cached = self.fallback_cache.get(cache_key)
        if cached:
            age = (datetime.now(timezone.utc) - cached['timestamp']).total_seconds()
            if age < ttl:
                return cached['result']
        return None
    
    def _cache_result(self, cache_key: str, result: Any):
        """Cache a result with timestamp."""
        self.fallback_cache[cache_key] = {
            'result': result,
            'timestamp': datetime.now(timezone.utc)
        }
        
        # Clean old cache entries (keep last 100)
        if len(self.fallback_cache) > 100:
            # Remove oldest entries
            oldest_keys = sorted(
                self.fallback_cache.keys(),
                key=lambda k: self.fallback_cache[k]['timestamp']
            )[:50]
            for key in oldest_keys:
                del self.fallback_cache[key]
    
    def _get_minimal_fallback(self, service_name: str, original_error: Exception) -> Dict[str, Any]:
        """Get minimal fallback response when all else fails."""
        return {
            'error': f'Service {service_name} is temporarily unavailable',
            'fallback_mode': True,
            'original_error': str(original_error),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'retry_after_seconds': 60
        }
    
    def get_service_health_status(self) -> Dict[str, Any]:
        """Get health status of all registered services."""
        return {
            'services': dict(self.service_health),
            'total_services': len(self.service_health),
            'healthy_services': sum(1 for h in self.service_health.values() if h['available']),
            'degraded_services': sum(1 for h in self.service_health.values() if not h['available']),
            'cache_entries': len(self.fallback_cache),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }


# Global instances
circuit_breakers: Dict[str, BackendCircuitBreaker] = {}
degradation_manager = GracefulDegradationManager()


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    success_threshold: int = 3,
    timeout_seconds: int = 60
):
    """
    Decorator to add circuit breaker protection to functions.
    
    Args:
        name: Unique name for the circuit breaker
        failure_threshold: Number of failures before opening circuit
        success_threshold: Number of successes needed to close circuit
        timeout_seconds: Time to wait before trying again
    """
    def decorator(func: Callable) -> Callable:
        if name not in circuit_breakers:
            circuit_breakers[name] = BackendCircuitBreaker(
                failure_threshold=failure_threshold,
                success_threshold=success_threshold,
                timeout_seconds=timeout_seconds
            )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return circuit_breakers[name].call(func, *args, **kwargs)
        
        return wrapper
    return decorator


def retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
):
    """
    Decorator to add retry logic with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay between retries (seconds)
        max_delay: Maximum delay between retries (seconds)
        exponential_base: Base for exponential backoff
        jitter: Add random jitter to prevent thundering herd
    """
    def decorator(func: Callable) -> Callable:
        retry_handler = RetryHandler(
            max_retries=max_retries,
            base_delay=base_delay,
            max_delay=max_delay,
            exponential_base=exponential_base,
            jitter=jitter
        )
        return retry_handler(func)
    return decorator


def with_degradation(service_name: str, fallback_strategy: Callable):
    """
    Decorator to add graceful degradation to functions.
    
    Args:
        service_name: Name of the service for health tracking
        fallback_strategy: Function to call when primary function fails
    """
    def decorator(func: Callable) -> Callable:
        # Register the degradation strategy
        degradation_manager.register_degradation_strategy(
            service_name, 
            fallback_strategy
        )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return degradation_manager.execute_with_degradation(
                service_name, 
                func, 
                *args, 
                **kwargs
            )
        
        return wrapper
    return decorator


def get_circuit_breaker_stats() -> Dict[str, Any]:
    """Get statistics for all circuit breakers."""
    return {
        'circuit_breakers': {name: cb.get_stats() for name, cb in circuit_breakers.items()},
        'total_breakers': len(circuit_breakers),
        'open_breakers': sum(1 for cb in circuit_breakers.values() 
                           if cb.state == CircuitBreakerState.OPEN),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


def get_degradation_stats() -> Dict[str, Any]:
    """Get graceful degradation statistics."""
    return degradation_manager.get_service_health_status()


def reset_circuit_breaker(name: str) -> bool:
    """
    Reset a specific circuit breaker.
    
    Args:
        name: Name of the circuit breaker to reset
        
    Returns:
        True if reset successful, False if breaker not found
    """
    if name in circuit_breakers:
        circuit_breakers[name].reset()
        return True
    return False


def reset_all_circuit_breakers():
    """Reset all circuit breakers to closed state."""
    for name, cb in circuit_breakers.items():
        cb.reset()
    logger.info(f"Reset {len(circuit_breakers)} circuit breakers")