"""
Async Service Coordination Context Manager

Manages AI service lifecycle and coordination for LokDarpan Phase 3.
Provides standardized async patterns for multi-model AI integration.
"""

import asyncio
import logging
import aiohttp
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class AsyncServiceError(Exception):
    """Custom exception for async service coordination issues."""
    pass


class AsyncServiceCoordinator:
    """
    Manages async AI service lifecycle and coordination.
    
    Features:
    - Shared HTTP session management
    - Concurrent AI service coordination
    - Resource cleanup and error handling
    - Timeout and fallback management
    - Performance monitoring integration
    """
    
    def __init__(self, timeout: int = 120, max_connections: int = 10):
        self.timeout = timeout
        self.max_connections = max_connections
        self.services = {}
        self.session: Optional[aiohttp.ClientSession] = None
        self.logger = logging.getLogger(__name__)
        self.start_time = None
        
    async def __aenter__(self):
        """Async context entry - initialize services and resources."""
        self.start_time = datetime.now(timezone.utc)
        
        # Initialize HTTP session with optimized settings
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        connector = aiohttp.TCPConnector(
            limit=self.max_connections,
            ttl_dns_cache=300,
            use_dns_cache=True,
            enable_cleanup_closed=True
        )
        
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers={'User-Agent': 'LokDarpan-AI-Coordinator/3.0'}
        )
        
        # Initialize AI service references (lazy initialization)
        self._init_service_registry()
        
        self.logger.info("AsyncServiceCoordinator initialized with shared session")
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context exit - cleanup resources."""
        cleanup_start = datetime.now(timezone.utc)
        
        try:
            # Close HTTP session
            if self.session:
                await self.session.close()
                
            # Log session duration
            if self.start_time:
                duration = (datetime.now(timezone.utc) - self.start_time).total_seconds()
                self.logger.info(f"AsyncServiceCoordinator session duration: {duration:.2f}s")
                
        except Exception as e:
            self.logger.error(f"Error during async coordinator cleanup: {e}")
            
        # Log any coordination issues
        if exc_type:
            self.logger.error(f"Async coordination error: {exc_type.__name__}: {exc_val}")
            
        cleanup_duration = (datetime.now(timezone.utc) - cleanup_start).total_seconds()
        self.logger.debug(f"Async cleanup completed in {cleanup_duration:.3f}s")
            
        return False  # Don't suppress exceptions
    
    def _init_service_registry(self):
        """Initialize service registry for lazy loading."""
        self.services = {
            'orchestrator': None,
            'strategist': None,
            'budget_manager': None,
            'perplexity_client': None,
            'gemini_client': None,
            'claude_client': None
        }
    
    async def get_orchestrator(self):
        """Get AI orchestrator with shared session."""
        if not self.services['orchestrator']:
            from .ai_orchestrator import get_orchestrator
            orchestrator = get_orchestrator()
            
            # Inject shared session into clients if they support it
            await self._inject_session_to_clients(orchestrator)
            self.services['orchestrator'] = orchestrator
            
        return self.services['orchestrator']
    
    async def get_strategist(self, ward: str, context_mode: str = "neutral"):
        """Get configured Political Strategist for ward analysis."""
        from ..strategist.service import PoliticalStrategist
        
        strategist = PoliticalStrategist(ward, context_mode)
        
        # Inject shared session if strategist supports it
        if hasattr(strategist, 'set_http_session'):
            await strategist.set_http_session(self.session)
        
        return strategist
    
    async def get_budget_manager(self):
        """Get budget manager with shared session."""
        if not self.services['budget_manager']:
            from .budget_manager import get_budget_manager
            self.services['budget_manager'] = get_budget_manager()
            
        return self.services['budget_manager']
    
    async def _inject_session_to_clients(self, orchestrator):
        """Inject shared HTTP session to AI clients that support it."""
        clients = [
            'perplexity_client',
            'gemini_client', 
            'claude_client',
            'openai_client'
        ]
        
        for client_name in clients:
            if hasattr(orchestrator, client_name):
                client = getattr(orchestrator, client_name)
                if hasattr(client, 'set_http_session'):
                    await client.set_http_session(self.session)
                    self.logger.debug(f"Injected session to {client_name}")
    
    async def coordinate_multi_service_call(self, operations: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinate multiple async AI service calls with timeout and fallback.
        
        Args:
            operations: Dict of operation_name -> coroutine/callable
            
        Returns:
            Dict of operation_name -> result
        """
        if not operations:
            return {}
            
        try:
            # Create tasks for concurrent execution
            tasks = {}
            for name, operation in operations.items():
                if asyncio.iscoroutine(operation):
                    tasks[name] = asyncio.create_task(operation)
                elif callable(operation):
                    tasks[name] = asyncio.create_task(operation())
                else:
                    self.logger.warning(f"Invalid operation type for {name}: {type(operation)}")
                    continue
            
            if not tasks:
                return {}
            
            # Execute with individual timeouts
            results = {}
            timeout_per_task = min(90, self.timeout // len(tasks))
            
            for name, task in tasks.items():
                try:
                    result = await asyncio.wait_for(task, timeout=timeout_per_task)
                    results[name] = result
                    self.logger.debug(f"Operation {name} completed successfully")
                    
                except asyncio.TimeoutError:
                    self.logger.warning(f"Operation {name} timed out after {timeout_per_task}s")
                    results[name] = {
                        "error": "timeout", 
                        "fallback": True,
                        "timeout_duration": timeout_per_task
                    }
                    
                except Exception as e:
                    self.logger.error(f"Operation {name} failed: {e}")
                    results[name] = {
                        "error": str(e), 
                        "fallback": True,
                        "error_type": type(e).__name__
                    }
            
            # Log coordination summary
            success_count = len([r for r in results.values() if not isinstance(r, dict) or not r.get("error")])
            self.logger.info(f"Multi-service coordination: {success_count}/{len(operations)} successful")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Multi-service coordination failed: {e}")
            raise AsyncServiceError(f"Coordination failure: {e}")
    
    async def execute_with_fallback(self, primary_operation, fallback_operation=None, timeout: int = None):
        """
        Execute primary operation with optional fallback.
        
        Args:
            primary_operation: Main async operation to execute
            fallback_operation: Fallback operation if primary fails
            timeout: Optional timeout override
            
        Returns:
            Operation result or fallback result
        """
        operation_timeout = timeout or self.timeout
        
        try:
            # Try primary operation
            if asyncio.iscoroutine(primary_operation):
                result = await asyncio.wait_for(primary_operation, timeout=operation_timeout)
            elif callable(primary_operation):
                result = await asyncio.wait_for(primary_operation(), timeout=operation_timeout)
            else:
                raise AsyncServiceError(f"Invalid primary operation type: {type(primary_operation)}")
                
            self.logger.debug("Primary operation completed successfully")
            return result
            
        except (asyncio.TimeoutError, Exception) as e:
            self.logger.warning(f"Primary operation failed: {e}")
            
            # Try fallback if available
            if fallback_operation:
                try:
                    if asyncio.iscoroutine(fallback_operation):
                        fallback_result = await asyncio.wait_for(fallback_operation, timeout=30)
                    elif callable(fallback_operation):
                        fallback_result = await asyncio.wait_for(fallback_operation(), timeout=30)
                    else:
                        raise AsyncServiceError(f"Invalid fallback operation type: {type(fallback_operation)}")
                        
                    self.logger.info("Fallback operation completed successfully")
                    return {
                        "result": fallback_result,
                        "fallback_used": True,
                        "primary_error": str(e)
                    }
                    
                except Exception as fallback_error:
                    self.logger.error(f"Fallback operation also failed: {fallback_error}")
                    raise AsyncServiceError(f"Both primary and fallback failed: {e}, {fallback_error}")
            else:
                raise AsyncServiceError(f"Primary operation failed and no fallback available: {e}")
    
    async def health_check_all_services(self) -> Dict[str, Any]:
        """
        Perform health checks on all configured AI services.
        
        Returns:
            Health status for each service
        """
        health_operations = {}
        
        try:
            # Get orchestrator for service health checks
            orchestrator = await self.get_orchestrator()
            
            # Define health check operations
            if hasattr(orchestrator, 'get_system_status'):
                health_operations['orchestrator'] = orchestrator.get_system_status()
            
            # Budget manager health
            budget_manager = await self.get_budget_manager()
            if hasattr(budget_manager, 'get_current_status'):
                health_operations['budget_manager'] = budget_manager.get_current_status()
            
            # Execute health checks concurrently
            health_results = await self.coordinate_multi_service_call(health_operations)
            
            # Assess overall health
            overall_status = "healthy"
            failed_services = []
            
            for service, result in health_results.items():
                if isinstance(result, dict) and result.get("error"):
                    failed_services.append(service)
                    overall_status = "degraded" if overall_status == "healthy" else "unhealthy"
            
            return {
                "overall_status": overall_status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "services": health_results,
                "failed_services": failed_services,
                "coordinator_uptime": (datetime.now(timezone.utc) - self.start_time).total_seconds() if self.start_time else 0
            }
            
        except Exception as e:
            self.logger.error(f"Health check coordination failed: {e}")
            return {
                "overall_status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def start_real_time_stream(self, ward: str, depth: str = "standard") -> 'AsyncSSEStreamer':
        """
        Initialize real-time SSE stream for ward monitoring.
        
        Args:
            ward: Ward name to monitor
            depth: Analysis depth level
            
        Returns:
            Configured AsyncSSEStreamer instance
        """
        # Import here to avoid circular imports
        from ..streaming.async_sse import AsyncSSEStreamer
        
        streamer = AsyncSSEStreamer(ward, depth)
        
        # Inject coordinator reference for service access
        streamer.coordinator = self
        
        return streamer
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics for the coordinator."""
        if not self.start_time:
            return {"error": "Coordinator not initialized"}
        
        uptime = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        
        return {
            "uptime_seconds": uptime,
            "active_services": len([s for s in self.services.values() if s is not None]),
            "session_active": self.session is not None and not self.session.closed,
            "max_connections": self.max_connections,
            "timeout_settings": self.timeout
        }


@asynccontextmanager
async def async_service_coordination(timeout: int = 120, max_connections: int = 10):
    """
    Context manager for async service coordination.
    
    Usage:
        async with async_service_coordination() as coordinator:
            strategist = await coordinator.get_strategist("ward_name")
            result = await strategist.analyze_situation()
    """
    coordinator = AsyncServiceCoordinator(timeout, max_connections)
    async with coordinator as coord:
        yield coord


# Convenience function for backward compatibility
async def get_async_coordinator() -> AsyncServiceCoordinator:
    """Get a new async service coordinator instance."""
    return AsyncServiceCoordinator()