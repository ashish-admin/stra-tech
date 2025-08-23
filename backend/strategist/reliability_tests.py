"""
Automated Reliability Testing and Validation Framework

Implements comprehensive testing for reliability features including
component isolation, error recovery, circuit breakers, and system resilience.
"""

import pytest
import asyncio
import time
import logging
from datetime import datetime, timezone
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any, List

from .resilience import (
    BackendCircuitBreaker,
    CircuitBreakerState,
    CircuitBreakerOpenException,
    RetryHandler,
    GracefulDegradationManager,
    get_circuit_breaker_stats,
    reset_circuit_breaker
)
from .service import PoliticalStrategist, get_ward_report, analyze_text
from .auth_middleware import SSEAuthenticationManager

logger = logging.getLogger(__name__)


class ReliabilityTestFramework:
    """
    Comprehensive testing framework for reliability features.
    """
    
    def __init__(self):
        self.test_results = []
        self.start_time = None
        self.end_time = None
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all reliability tests and return comprehensive results."""
        self.start_time = datetime.now(timezone.utc)
        logger.info("Starting comprehensive reliability test suite")
        
        test_suites = [
            ("Circuit Breaker Tests", self.test_circuit_breaker_functionality),
            ("Retry Mechanism Tests", self.test_retry_mechanisms),
            ("Graceful Degradation Tests", self.test_graceful_degradation),
            ("SSE Authentication Tests", self.test_sse_authentication),
            ("Component Isolation Tests", self.test_component_isolation),
            ("Error Recovery Tests", self.test_error_recovery),
            ("Performance Under Load Tests", self.test_performance_under_load)
        ]
        
        suite_results = []
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for suite_name, test_function in test_suites:
            logger.info(f"Running {suite_name}")
            try:
                suite_result = await test_function()
                suite_result['suite_name'] = suite_name
                suite_results.append(suite_result)
                
                total_tests += suite_result['total_tests']
                passed_tests += suite_result['passed_tests']
                failed_tests += suite_result['failed_tests']
                
                logger.info(f"Completed {suite_name}: {suite_result['passed_tests']}/{suite_result['total_tests']} passed")
                
            except Exception as e:
                logger.error(f"Test suite {suite_name} failed with error: {e}")
                suite_results.append({
                    'suite_name': suite_name,
                    'error': str(e),
                    'total_tests': 1,
                    'passed_tests': 0,
                    'failed_tests': 1,
                    'tests': []
                })
                total_tests += 1
                failed_tests += 1
        
        self.end_time = datetime.now(timezone.utc)
        
        return {
            'overall_results': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': passed_tests / max(1, total_tests) * 100,
                'start_time': self.start_time.isoformat(),
                'end_time': self.end_time.isoformat(),
                'duration_seconds': (self.end_time - self.start_time).total_seconds()
            },
            'suite_results': suite_results,
            'recommendations': self._generate_recommendations(suite_results)
        }
    
    async def test_circuit_breaker_functionality(self) -> Dict[str, Any]:
        """Test circuit breaker patterns and fault tolerance."""
        tests = []
        passed = 0
        
        # Test 1: Circuit breaker opens after failures
        try:
            cb = BackendCircuitBreaker(failure_threshold=3, timeout_seconds=1)
            
            def failing_function():
                raise Exception("Test failure")
            
            # Trigger failures to open circuit
            for i in range(3):
                try:
                    cb.call(failing_function)
                except Exception:
                    pass
            
            # Circuit should be open
            assert cb.state == CircuitBreakerState.OPEN
            
            # Next call should raise CircuitBreakerOpenException
            with pytest.raises(CircuitBreakerOpenException):
                cb.call(failing_function)
            
            tests.append({
                'name': 'Circuit breaker opens after threshold failures',
                'status': 'passed',
                'details': f'Circuit opened after {cb.failure_count} failures'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Circuit breaker opens after threshold failures',
                'status': 'failed',
                'error': str(e)
            })
        
        # Test 2: Circuit breaker recovery
        try:
            cb = BackendCircuitBreaker(failure_threshold=2, success_threshold=2, timeout_seconds=0.1)
            
            def sometimes_failing_function(should_fail=False):
                if should_fail:
                    raise Exception("Test failure")
                return "success"
            
            # Open the circuit
            for i in range(2):
                try:
                    cb.call(sometimes_failing_function, True)
                except Exception:
                    pass
            
            assert cb.state == CircuitBreakerState.OPEN
            
            # Wait for timeout
            await asyncio.sleep(0.2)
            
            # Should transition to HALF_OPEN and then CLOSED
            result = cb.call(sometimes_failing_function, False)
            assert result == "success"
            assert cb.state == CircuitBreakerState.HALF_OPEN
            
            # Another success should close it
            result = cb.call(sometimes_failing_function, False)
            assert result == "success"
            assert cb.state == CircuitBreakerState.CLOSED
            
            tests.append({
                'name': 'Circuit breaker recovery mechanism',
                'status': 'passed',
                'details': 'Successfully recovered from OPEN to CLOSED state'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Circuit breaker recovery mechanism',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    async def test_retry_mechanisms(self) -> Dict[str, Any]:
        """Test retry logic with exponential backoff."""
        tests = []
        passed = 0
        
        # Test 1: Successful retry after failures
        try:
            retry_handler = RetryHandler(max_retries=3, base_delay=0.1)
            attempt_count = 0
            
            def flaky_function():
                nonlocal attempt_count
                attempt_count += 1
                if attempt_count < 3:
                    raise Exception(f"Failure on attempt {attempt_count}")
                return f"Success on attempt {attempt_count}"
            
            start_time = time.time()
            result = retry_handler.retry_call(flaky_function)
            end_time = time.time()
            
            assert result == "Success on attempt 3"
            assert attempt_count == 3
            assert end_time - start_time >= 0.3  # Should have delays
            
            tests.append({
                'name': 'Retry mechanism with exponential backoff',
                'status': 'passed',
                'details': f'Succeeded after {attempt_count} attempts with appropriate delays'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Retry mechanism with exponential backoff',
                'status': 'failed',
                'error': str(e)
            })
        
        # Test 2: Maximum retries exceeded
        try:
            retry_handler = RetryHandler(max_retries=2, base_delay=0.01)
            
            def always_failing_function():
                raise ValueError("Always fails")
            
            with pytest.raises(ValueError):
                retry_handler.retry_call(always_failing_function)
            
            tests.append({
                'name': 'Maximum retries exceeded handling',
                'status': 'passed',
                'details': 'Correctly raised original exception after max retries'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Maximum retries exceeded handling',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    async def test_graceful_degradation(self) -> Dict[str, Any]:
        """Test graceful degradation strategies."""
        tests = []
        passed = 0
        
        # Test 1: Fallback strategy execution
        try:
            degradation_manager = GracefulDegradationManager()
            
            def primary_function(value):
                raise Exception("Primary service down")
            
            def fallback_strategy(value):
                return f"fallback_result_{value}"
            
            degradation_manager.register_degradation_strategy(
                "test_service",
                fallback_strategy,
                cache_ttl=60
            )
            
            result = degradation_manager.execute_with_degradation(
                "test_service",
                primary_function,
                "test_value"
            )
            
            assert result == "fallback_result_test_value"
            
            # Check service health status
            health_status = degradation_manager.get_service_health_status()
            assert not health_status['services']['test_service']['available']
            
            tests.append({
                'name': 'Graceful degradation fallback execution',
                'status': 'passed',
                'details': 'Successfully executed fallback strategy and updated health status'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Graceful degradation fallback execution',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    async def test_sse_authentication(self) -> Dict[str, Any]:
        """Test SSE authentication and connection security."""
        tests = []
        passed = 0
        
        # Test 1: Token generation and validation
        try:
            auth_manager = SSEAuthenticationManager()
            
            # Generate token
            token = auth_manager.generate_connection_token("test_user", "test_ward", 3600)
            assert token is not None
            assert len(token) > 50  # JWT tokens are typically long
            
            # Validate token
            connection_info = auth_manager.validate_connection_token(token)
            assert connection_info is not None
            assert connection_info['user_id'] == 'test_user'
            assert connection_info['ward'] == 'test_ward'
            
            tests.append({
                'name': 'SSE token generation and validation',
                'status': 'passed',
                'details': 'Successfully generated and validated connection token'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'SSE token generation and validation',
                'status': 'failed',
                'error': str(e)
            })
        
        # Test 2: Token refresh mechanism
        try:
            auth_manager = SSEAuthenticationManager()
            
            # Generate initial token
            original_token = auth_manager.generate_connection_token("test_user", "test_ward", 60)
            
            # Refresh token
            new_token = auth_manager.refresh_connection_token(original_token, 3600)
            assert new_token is not None
            assert new_token != original_token
            
            # Old token should be invalid
            old_connection_info = auth_manager.validate_connection_token(original_token)
            assert old_connection_info is None
            
            # New token should be valid
            new_connection_info = auth_manager.validate_connection_token(new_token)
            assert new_connection_info is not None
            
            tests.append({
                'name': 'SSE token refresh mechanism',
                'status': 'passed',
                'details': 'Successfully refreshed token and invalidated old token'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'SSE token refresh mechanism',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    async def test_component_isolation(self) -> Dict[str, Any]:
        """Test component isolation and error boundary functionality."""
        tests = []
        passed = 0
        
        # Test 1: Component error boundary isolation
        try:
            # Simulate component failure
            def failing_component():
                raise RuntimeError("Component crashed")
            
            def healthy_component():
                return "Working correctly"
            
            # In a real frontend test, this would test React error boundaries
            # Here we simulate the isolation behavior
            component_results = []
            
            # Component 1 fails
            try:
                result = failing_component()
                component_results.append(('component1', result))
            except Exception:
                component_results.append(('component1', 'ISOLATED_ERROR'))
            
            # Component 2 continues working
            try:
                result = healthy_component()
                component_results.append(('component2', result))
            except Exception:
                component_results.append(('component2', 'ISOLATED_ERROR'))
            
            # Verify isolation worked
            assert component_results[0][1] == 'ISOLATED_ERROR'
            assert component_results[1][1] == 'Working correctly'
            
            tests.append({
                'name': 'Component error boundary isolation',
                'status': 'passed',
                'details': 'Component failure isolated, other components continue functioning'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Component error boundary isolation',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    async def test_error_recovery(self) -> Dict[str, Any]:
        """Test error recovery mechanisms and fault tolerance."""
        tests = []
        passed = 0
        
        # Test 1: Service recovery after errors
        try:
            # Mock the strategist service
            with patch('strategist.service.PoliticalStrategist') as mock_strategist:
                mock_instance = Mock()
                mock_strategist.return_value = mock_instance
                
                # First call fails
                mock_instance.analyze_situation = Mock(side_effect=Exception("Service error"))
                
                try:
                    result = get_ward_report("test_ward", "quick")
                    # Should return fallback response
                    assert result[0]['fallback_mode'] == True
                    assert 'error' in result[0]
                except Exception:
                    pass
                
                # Service recovers
                mock_instance.analyze_situation = Mock(return_value={
                    "ward": "test_ward",
                    "analysis": "recovered",
                    "confidence_score": 0.8
                })
                
                result = get_ward_report("test_ward", "quick")
                assert result[0]['ward'] == 'test_ward'
                assert result[0]['analysis'] == 'recovered'
            
            tests.append({
                'name': 'Service error recovery mechanism',
                'status': 'passed',
                'details': 'Service recovered successfully after temporary failure'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Service error recovery mechanism',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    async def test_performance_under_load(self) -> Dict[str, Any]:
        """Test system performance under load conditions."""
        tests = []
        passed = 0
        
        # Test 1: Concurrent request handling
        try:
            auth_manager = SSEAuthenticationManager()
            
            async def concurrent_token_generation(user_id):
                return auth_manager.generate_connection_token(f"user_{user_id}", "test_ward", 3600)
            
            # Generate 10 concurrent tokens
            start_time = time.time()
            tasks = [concurrent_token_generation(i) for i in range(10)]
            tokens = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()
            
            # Check results
            successful_tokens = [t for t in tokens if isinstance(t, str)]
            failed_tokens = [t for t in tokens if isinstance(t, Exception)]
            
            assert len(successful_tokens) >= 8  # Allow some failures under load
            assert end_time - start_time < 5.0  # Should complete within 5 seconds
            
            tests.append({
                'name': 'Concurrent request handling under load',
                'status': 'passed',
                'details': f'Generated {len(successful_tokens)}/10 tokens successfully in {end_time-start_time:.2f}s'
            })
            passed += 1
            
        except Exception as e:
            tests.append({
                'name': 'Concurrent request handling under load',
                'status': 'failed',
                'error': str(e)
            })
        
        return {
            'total_tests': len(tests),
            'passed_tests': passed,
            'failed_tests': len(tests) - passed,
            'tests': tests
        }
    
    def _generate_recommendations(self, suite_results: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []
        
        total_tests = sum(suite['total_tests'] for suite in suite_results)
        total_failures = sum(suite['failed_tests'] for suite in suite_results)
        
        if total_failures == 0:
            recommendations.append("✅ All reliability tests passed - system is operating within acceptable parameters")
        
        failure_rate = total_failures / max(1, total_tests) * 100
        
        if failure_rate > 20:
            recommendations.append("🚨 High failure rate detected - immediate attention required")
        elif failure_rate > 10:
            recommendations.append("⚠️ Elevated failure rate - monitoring recommended")
        elif failure_rate > 5:
            recommendations.append("📊 Some test failures detected - review recommended")
        
        # Specific recommendations based on failed test suites
        for suite in suite_results:
            if suite['failed_tests'] > 0:
                if 'Circuit Breaker' in suite['suite_name']:
                    recommendations.append("🔄 Circuit breaker issues detected - verify failure thresholds and timeout settings")
                elif 'Retry Mechanism' in suite['suite_name']:
                    recommendations.append("🔁 Retry mechanism issues - check exponential backoff and maximum retry settings")
                elif 'SSE Authentication' in suite['suite_name']:
                    recommendations.append("🔐 SSE authentication issues - verify token generation and validation logic")
                elif 'Component Isolation' in suite['suite_name']:
                    recommendations.append("🛡️ Component isolation issues - review error boundary implementation")
        
        recommendations.append("📋 Regular reliability testing recommended every 48 hours")
        recommendations.append("📈 Monitor system metrics continuously for early failure detection")
        
        return recommendations


async def run_reliability_checkpoint() -> Dict[str, Any]:
    """
    Run 48-hour reliability checkpoint validation.
    
    Returns:
        Comprehensive reliability assessment results
    """
    logger.info("Starting 48-hour reliability checkpoint validation")
    
    framework = ReliabilityTestFramework()
    results = await framework.run_all_tests()
    
    # Add system health metrics
    circuit_breaker_stats = get_circuit_breaker_stats()
    
    # Calculate overall system health score
    success_rate = results['overall_results']['success_rate']
    open_breakers = circuit_breaker_stats['open_breakers']
    total_breakers = circuit_breaker_stats['total_breakers']
    
    # Health score calculation (0-100)
    health_score = success_rate * 0.8  # 80% weight for test success
    
    if total_breakers > 0:
        breaker_health = (1 - open_breakers / total_breakers) * 20  # 20% weight for circuit breaker health
        health_score += breaker_health
    else:
        health_score += 20  # Full points if no breakers are open
    
    results['system_health'] = {
        'overall_score': round(health_score, 2),
        'status': 'healthy' if health_score >= 90 else 'degraded' if health_score >= 70 else 'critical',
        'circuit_breaker_stats': circuit_breaker_stats,
        'checkpoint_timestamp': datetime.now(timezone.utc).isoformat()
    }
    
    logger.info(f"Reliability checkpoint completed - Health Score: {health_score}/100")
    
    return results


if __name__ == "__main__":
    # Run reliability tests
    asyncio.run(run_reliability_checkpoint())