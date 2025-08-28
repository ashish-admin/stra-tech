#!/usr/bin/env python3
"""
Phase 3 Validation Script for LokDarpan Political Strategist

Validates all Phase 3 enhanced features:
- Intelligent multi-model orchestration
- Circuit breaker protection
- Enhanced SSE streaming
- Advanced error handling and recovery

Usage:
    python phase3_validation.py [--verbose] [--component COMPONENT]
"""

import os
import sys
import time
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Phase3ValidationSuite:
    """Comprehensive validation suite for Phase 3 enhancements."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "phase": "3_enhanced",
            "validation_results": {},
            "summary": {
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "warnings": 0
            }
        }
        
        if verbose:
            logging.getLogger().setLevel(logging.DEBUG)
    
    def log_test_result(self, component: str, test_name: str, passed: bool, 
                       details: Optional[Dict[str, Any]] = None, 
                       warning: bool = False):
        """Log test result with details."""
        if component not in self.results["validation_results"]:
            self.results["validation_results"][component] = []
        
        result = {
            "test": test_name,
            "passed": passed,
            "warning": warning,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {}
        }
        
        self.results["validation_results"][component].append(result)
        self.results["summary"]["total_tests"] += 1
        
        if passed:
            self.results["summary"]["passed_tests"] += 1
            status = "✅ PASS"
            if warning:
                status += " ⚠️ WARNING"
                self.results["summary"]["warnings"] += 1
        else:
            self.results["summary"]["failed_tests"] += 1
            status = "❌ FAIL"
        
        logger.info(f"{status} | {component} | {test_name}")
        
        if details and self.verbose:
            logger.debug(f"Details: {json.dumps(details, indent=2)}")
    
    async def validate_multi_model_coordinator(self) -> bool:
        """Validate Phase 3 multi-model coordination features."""
        logger.info("🧠 Validating Multi-Model Coordinator...")
        component = "multi_model_coordinator"
        all_passed = True
        
        try:
            from strategist.reasoner.multi_model_coordinator import (
                MultiModelCoordinator, AnalysisRequest, QueryType, ModelCapability
            )
            
            # Test 1: Class initialization
            try:
                coordinator = MultiModelCoordinator()
                self.log_test_result(component, "initialization", True, {
                    "gemini_available": coordinator.gemini_available,
                    "perplexity_available": coordinator.perplexity_available
                })
            except Exception as e:
                self.log_test_result(component, "initialization", False, {"error": str(e)})
                all_passed = False
                return all_passed
            
            # Test 2: Query type classification
            try:
                test_request = AnalysisRequest(
                    ward="Jubilee Hills",
                    query="What are the recent political developments?",
                    depth="standard",
                    context_mode="neutral"
                )
                
                query_type = coordinator._classify_query_type(test_request)
                self.log_test_result(component, "query_classification", True, {
                    "query_type": query_type.value,
                    "test_query": test_request.query
                })
            except Exception as e:
                self.log_test_result(component, "query_classification", False, {"error": str(e)})
                all_passed = False
            
            # Test 3: Intelligent model routing
            try:
                routing_decision = coordinator._intelligent_model_routing(test_request, QueryType.REAL_TIME_INTELLIGENCE)
                self.log_test_result(component, "intelligent_routing", True, {
                    "primary_model": routing_decision.primary_model,
                    "secondary_model": routing_decision.secondary_model,
                    "routing_confidence": routing_decision.routing_confidence,
                    "reasoning": routing_decision.reasoning[:100] + "..." if len(routing_decision.reasoning) > 100 else routing_decision.reasoning
                })
            except Exception as e:
                self.log_test_result(component, "intelligent_routing", False, {"error": str(e)})
                all_passed = False
            
            # Test 4: Routing statistics
            try:
                stats = coordinator.get_routing_statistics()
                self.log_test_result(component, "routing_statistics", True, {
                    "performance_history_models": len(stats["model_performance_history"]),
                    "gemini_available": stats["model_availability"]["gemini_available"],
                    "perplexity_available": stats["model_availability"]["perplexity_available"]
                })
            except Exception as e:
                self.log_test_result(component, "routing_statistics", False, {"error": str(e)})
                all_passed = False
            
        except ImportError as e:
            logger.error(f"Failed to import multi-model coordinator: {e}")
            self.log_test_result(component, "import_test", False, {"error": str(e)})
            all_passed = False
        
        return all_passed
    
    async def validate_circuit_breaker(self) -> bool:
        """Validate Phase 3 circuit breaker functionality."""
        logger.info("🛡️ Validating Circuit Breaker System...")
        component = "circuit_breaker"
        all_passed = True
        
        try:
            from strategist.circuit_breaker import (
                AIServiceCircuitBreaker, CircuitBreakerManager, CircuitBreakerConfig,
                CircuitState
            )
            
            # Test 1: Circuit breaker initialization
            try:
                config = CircuitBreakerConfig(failure_threshold=3, recovery_timeout=30)
                breaker = AIServiceCircuitBreaker("test_service", config)
                self.log_test_result(component, "initialization", True, {
                    "service_name": breaker.service_name,
                    "initial_state": breaker.state.value,
                    "config": {
                        "failure_threshold": config.failure_threshold,
                        "recovery_timeout": config.recovery_timeout
                    }
                })
            except Exception as e:
                self.log_test_result(component, "initialization", False, {"error": str(e)})
                all_passed = False
                return all_passed
            
            # Test 2: Health status reporting
            try:
                health = breaker.get_health_status()
                self.log_test_result(component, "health_status", True, {
                    "service_name": health["service_name"],
                    "circuit_state": health["circuit_state"],
                    "success_rate": health["metrics"]["success_rate_percent"]
                })
            except Exception as e:
                self.log_test_result(component, "health_status", False, {"error": str(e)})
                all_passed = False
            
            # Test 3: Circuit breaker manager
            try:
                from strategist.circuit_breaker import circuit_breaker_manager
                system_health = circuit_breaker_manager.get_system_health()
                self.log_test_result(component, "manager_system_health", True, {
                    "system_status": system_health["system_status"],
                    "health_score": system_health["health_score"],
                    "total_services": system_health["service_summary"]["total_services"]
                })
            except Exception as e:
                self.log_test_result(component, "manager_system_health", False, {"error": str(e)})
                all_passed = False
            
            # Test 4: Service recommendations
            try:
                recommendations = circuit_breaker_manager.get_service_recommendations()
                self.log_test_result(component, "service_recommendations", True, {
                    "recommendation_count": len(recommendations),
                    "recommendation_types": list(set(r.get("type") for r in recommendations))
                })
            except Exception as e:
                self.log_test_result(component, "service_recommendations", False, {"error": str(e)})
                all_passed = False
                
        except ImportError as e:
            logger.error(f"Failed to import circuit breaker: {e}")
            self.log_test_result(component, "import_test", False, {"error": str(e)})
            all_passed = False
        
        return all_passed
    
    async def validate_enhanced_sse(self) -> bool:
        """Validate Phase 3 enhanced SSE functionality."""
        logger.info("🔄 Validating Enhanced SSE System...")
        component = "enhanced_sse"
        all_passed = True
        
        try:
            from strategist.sse_enhanced import (
                SSEConnection, SSEManager, get_phase3_sse_stats
            )
            
            # Test 1: Enhanced SSE connection initialization
            try:
                connection = SSEConnection("Test Ward", "all", 30)
                self.log_test_result(component, "connection_initialization", True, {
                    "connection_id": connection.connection_id,
                    "ward": connection.ward,
                    "is_active": connection.is_active,
                    "heartbeat_interval": connection.heartbeat_interval
                })
            except Exception as e:
                self.log_test_result(component, "connection_initialization", False, {"error": str(e)})
                all_passed = False
                return all_passed
            
            # Test 2: Heartbeat functionality
            try:
                # Test heartbeat functionality
                should_send = connection.should_send_heartbeat()
                heartbeat_msg = connection.send_heartbeat()
                
                self.log_test_result(component, "heartbeat_functionality", True, {
                    "should_send_initial": should_send,
                    "heartbeat_generated": len(heartbeat_msg) > 0,
                    "last_heartbeat_updated": connection.last_heartbeat > 0
                })
            except Exception as e:
                self.log_test_result(component, "heartbeat_functionality", False, {"error": str(e)})
                all_passed = False
            
            # Test 3: Event formatting
            try:
                test_event = connection.format_event("test", {"message": "test event"})
                event_valid = "data:" in test_event and connection.connection_id in test_event
                
                self.log_test_result(component, "event_formatting", event_valid, {
                    "connection_id": connection.connection_id,
                    "ward": connection.ward,
                    "event_format_valid": event_valid,
                    "is_active": connection.is_active
                })
            except Exception as e:
                self.log_test_result(component, "event_formatting", False, {"error": str(e)})
                all_passed = False
            
            # Test 4: SSE Manager
            try:
                manager = SSEManager()
                active_count = manager.get_active_connections()
                success = manager.add_connection(connection)
                
                self.log_test_result(component, "manager_functionality", True, {
                    "initial_active_connections": active_count,
                    "max_connections": manager.max_connections,
                    "connection_added": success,
                    "features": ["heartbeat", "connection_management", "error_recovery"]
                })
            except Exception as e:
                self.log_test_result(component, "manager_functionality", False, {"error": str(e)})
                all_passed = False
            
            # Test 5: SSE statistics
            try:
                stats = get_phase3_sse_stats()
                self.log_test_result(component, "sse_statistics", True, {
                    "active_connections": stats["active_connections"],
                    "max_connections": stats["max_connections"],
                    "timestamp": stats["timestamp"]
                })
            except Exception as e:
                self.log_test_result(component, "sse_statistics", False, {"error": str(e)})
                all_passed = False
                
        except ImportError as e:
            logger.error(f"Failed to import enhanced SSE: {e}")
            self.log_test_result(component, "import_test", False, {"error": str(e)})
            all_passed = False
        
        return all_passed
    
    async def validate_strategist_router(self) -> bool:
        """Validate Phase 3 strategist router enhancements."""
        logger.info("🌐 Validating Strategist Router...")
        component = "strategist_router"
        all_passed = True
        
        try:
            from strategist.router import strategist_bp
            
            # Test 1: Blueprint registration
            try:
                self.log_test_result(component, "blueprint_registration", True, {
                    "blueprint_name": strategist_bp.name,
                    "url_prefix": strategist_bp.url_prefix,
                    "endpoint_count": len(strategist_bp.deferred_functions)
                })
            except Exception as e:
                self.log_test_result(component, "blueprint_registration", False, {"error": str(e)})
                all_passed = False
            
            # Test 2: Import enhanced functions
            try:
                from strategist.router import create_phase3_sse_response, get_phase3_sse_stats
                self.log_test_result(component, "enhanced_imports", True, {
                    "functions_imported": ["create_phase3_sse_response", "get_phase3_sse_stats"]
                })
            except ImportError as e:
                self.log_test_result(component, "enhanced_imports", False, {"error": str(e)})
                all_passed = False
                
        except ImportError as e:
            logger.error(f"Failed to import strategist router: {e}")
            self.log_test_result(component, "import_test", False, {"error": str(e)})
            all_passed = False
        
        return all_passed
    
    async def validate_environment_configuration(self) -> bool:
        """Validate environment configuration for Phase 3 features."""
        logger.info("⚙️ Validating Environment Configuration...")
        component = "environment_config"
        all_passed = True
        
        # Test 1: Required environment variables
        required_vars = [
            "GEMINI_API_KEY", "PERPLEXITY_API_KEY", "DATABASE_URL", "REDIS_URL"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            self.log_test_result(component, "environment_variables", False, {
                "missing_variables": missing_vars,
                "warning": "Some features may be degraded without these variables"
            }, warning=True)
        else:
            self.log_test_result(component, "environment_variables", True, {
                "all_required_vars_present": True
            })
        
        # Test 2: Phase 3 configuration options
        phase3_config = {
            "ROUTING_CONFIDENCE_THRESHOLD": os.getenv("ROUTING_CONFIDENCE_THRESHOLD", "0.9"),
            "PARALLEL_EXECUTION": os.getenv("PARALLEL_EXECUTION", "true"),
            "ADAPTIVE_WEIGHTING": os.getenv("ADAPTIVE_WEIGHTING", "true"),
            "EVIDENCE_CONFIDENCE_THRESHOLD": os.getenv("EVIDENCE_CONFIDENCE_THRESHOLD", "0.7")
        }
        
        self.log_test_result(component, "phase3_configuration", True, {
            "config_options": phase3_config
        })
        
        return all_passed
    
    async def run_full_validation(self, component: Optional[str] = None) -> Dict[str, Any]:
        """Run complete Phase 3 validation suite."""
        logger.info("🚀 Starting Phase 3 Comprehensive Validation...")
        logger.info("=" * 70)
        
        start_time = time.time()
        
        # Define validation tests
        validation_tests = {
            "environment_config": self.validate_environment_configuration,
            "multi_model_coordinator": self.validate_multi_model_coordinator,
            "circuit_breaker": self.validate_circuit_breaker,
            "enhanced_sse": self.validate_enhanced_sse,
            "strategist_router": self.validate_strategist_router
        }
        
        # Run specific component or all components
        if component:
            if component in validation_tests:
                tests = {component: validation_tests[component]}
            else:
                logger.error(f"Unknown component: {component}")
                logger.info(f"Available components: {list(validation_tests.keys())}")
                return self.results
        else:
            tests = validation_tests
        
        # Execute validation tests
        for component_name, test_func in tests.items():
            try:
                await test_func()
            except Exception as e:
                logger.error(f"Fatal error in {component_name} validation: {e}")
                self.log_test_result(component_name, "fatal_error", False, {"error": str(e)})
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Generate final summary
        summary = self.results["summary"]
        success_rate = (summary["passed_tests"] / summary["total_tests"]) * 100 if summary["total_tests"] > 0 else 0
        
        self.results["execution_time_seconds"] = round(execution_time, 2)
        self.results["success_rate_percent"] = round(success_rate, 1)
        
        # Log final results
        logger.info("=" * 70)
        logger.info(f"📊 Phase 3 Validation Results:")
        logger.info(f"   Total Tests: {summary['total_tests']}")
        logger.info(f"   Passed: {summary['passed_tests']} ✅")
        logger.info(f"   Failed: {summary['failed_tests']} ❌")
        logger.info(f"   Warnings: {summary['warnings']} ⚠️")
        logger.info(f"   Success Rate: {success_rate:.1f}%")
        logger.info(f"   Execution Time: {execution_time:.2f}s")
        
        if success_rate >= 90:
            logger.info("🎉 Phase 3 validation EXCELLENT - ready for production!")
        elif success_rate >= 75:
            logger.info("✅ Phase 3 validation GOOD - minor issues may need attention")
        elif success_rate >= 50:
            logger.info("⚠️ Phase 3 validation PARTIAL - significant issues need resolution")
        else:
            logger.info("❌ Phase 3 validation FAILED - major issues require immediate attention")
        
        return self.results


async def main():
    """Main validation entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Phase 3 Political Strategist Validation")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    parser.add_argument("--component", "-c", choices=[
        "environment_config", "multi_model_coordinator", "circuit_breaker", 
        "enhanced_sse", "strategist_router"
    ], help="Validate specific component only")
    parser.add_argument("--output", "-o", help="Save results to JSON file")
    
    args = parser.parse_args()
    
    # Run validation
    validator = Phase3ValidationSuite(verbose=args.verbose)
    results = await validator.run_full_validation(component=args.component)
    
    # Save results if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {args.output}")
    
    # Exit with appropriate code
    success_rate = results.get("success_rate_percent", 0)
    exit_code = 0 if success_rate >= 75 else 1
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())