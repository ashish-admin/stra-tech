"""
Async Helper for Flask Integration

Provides utilities to safely run async code in Flask context without
conflicts with the request context or event loop issues.
"""

import asyncio
import concurrent.futures
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Thread pool executor for running async code
executor = concurrent.futures.ThreadPoolExecutor(max_workers=3)

def run_async(coro):
    """
    Run an async coroutine in a separate thread with its own event loop.
    
    This avoids conflicts with Flask's request context and prevents
    'RuntimeError: There is no current event loop in thread' errors.
    
    Args:
        coro: The coroutine to run
        
    Returns:
        The result of the coroutine
    """
    def run_in_new_loop():
        """Create new event loop and run coroutine"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    # Submit to thread pool and wait for result
    future = executor.submit(run_in_new_loop)
    return future.result(timeout=30)  # 30 second timeout

def async_route(f):
    """
    Decorator to make async route handlers work in Flask.
    
    Usage:
        @app.route('/path')
        @async_route
        async def handler():
            result = await some_async_function()
            return jsonify(result)
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        coro = f(*args, **kwargs)
        return run_async(coro)
    return wrapper

class AsyncAdapter:
    """
    Adapter for running async methods in Flask context.
    
    Usage:
        adapter = AsyncAdapter(async_service)
        result = adapter.run('method_name', arg1, arg2, kwarg1=value1)
    """
    
    def __init__(self, async_service):
        self.service = async_service
    
    def run(self, method_name, *args, **kwargs):
        """
        Run an async method of the service.
        
        Args:
            method_name: Name of the async method to call
            *args: Positional arguments for the method
            **kwargs: Keyword arguments for the method
            
        Returns:
            The result of the async method
        """
        method = getattr(self.service, method_name)
        coro = method(*args, **kwargs)
        return run_async(coro)
    
    def __getattr__(self, name):
        """
        Allow direct method calls that automatically handle async.
        
        Usage:
            adapter = AsyncAdapter(async_service)
            result = adapter.async_method(arg1, arg2)
        """
        def method_wrapper(*args, **kwargs):
            return self.run(name, *args, **kwargs)
        return method_wrapper

# Cleanup function for app shutdown
def cleanup_executor():
    """Cleanup thread pool executor on app shutdown"""
    executor.shutdown(wait=True)