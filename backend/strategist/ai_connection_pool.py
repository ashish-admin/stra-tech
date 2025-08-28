"""
AI Service Connection Pool Manager

Implements connection pooling and rate limiting for AI services:
- Gemini API connection pool
- Perplexity API connection pool
- Request queuing and retry logic
- Rate limiting and backoff strategies
"""

import os
import time
import asyncio
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from collections import deque
from threading import Lock
import aiohttp
from asyncio import Semaphore

logger = logging.getLogger(__name__)


@dataclass
class ConnectionStats:
    """Statistics for a connection pool."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_latency_ms: float = 0
    last_request_time: Optional[datetime] = None
    last_error_time: Optional[datetime] = None
    last_error_message: Optional[str] = None
    
    @property
    def average_latency_ms(self) -> float:
        """Calculate average latency."""
        if self.successful_requests == 0:
            return 0
        return self.total_latency_ms / self.successful_requests
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_requests == 0:
            return 0
        return self.successful_requests / self.total_requests


class RateLimiter:
    """Token bucket rate limiter for API requests."""
    
    def __init__(self, rate: int = 10, per_seconds: int = 60):
        """
        Initialize rate limiter.
        
        Args:
            rate: Number of requests allowed
            per_seconds: Time window in seconds
        """
        self.rate = rate
        self.per_seconds = per_seconds
        self.tokens = rate
        self.last_refill = time.time()
        self.lock = Lock()
    
    def acquire(self, tokens: int = 1) -> bool:
        """
        Try to acquire tokens for making requests.
        
        Returns:
            True if tokens acquired, False otherwise
        """
        with self.lock:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
    
    def _refill(self):
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * (self.rate / self.per_seconds)
        self.tokens = min(self.rate, self.tokens + tokens_to_add)
        self.last_refill = now
    
    def wait_time(self) -> float:
        """Get wait time until next token is available."""
        if self.tokens >= 1:
            return 0
        
        tokens_needed = 1 - self.tokens
        seconds_per_token = self.per_seconds / self.rate
        return tokens_needed * seconds_per_token


class AIConnectionPool:
    """Base class for AI service connection pools."""
    
    def __init__(self, service_name: str, api_key: str, 
                 max_connections: int = 5,
                 rate_limit: int = 60,
                 timeout: int = 30):
        """
        Initialize connection pool.
        
        Args:
            service_name: Name of the AI service
            api_key: API key for authentication
            max_connections: Maximum concurrent connections
            rate_limit: Requests per minute
            timeout: Request timeout in seconds
        """
        self.service_name = service_name
        self.api_key = api_key
        self.max_connections = max_connections
        self.timeout = timeout
        self.rate_limiter = RateLimiter(rate=rate_limit, per_seconds=60)
        self.semaphore = Semaphore(max_connections)
        self.stats = ConnectionStats()
        self.session: Optional[aiohttp.ClientSession] = None
        self.retry_delays = [1, 2, 5, 10]  # Exponential backoff delays
        
    async def __aenter__(self):
        """Context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.close()
    
    async def initialize(self):
        """Initialize the connection pool."""
        if not self.session:
            connector = aiohttp.TCPConnector(
                limit=self.max_connections,
                limit_per_host=self.max_connections,
                ttl_dns_cache=300
            )
            timeout_config = aiohttp.ClientTimeout(total=self.timeout)
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout_config
            )
            logger.info(f"Initialized {self.service_name} connection pool with {self.max_connections} connections")
    
    async def close(self):
        """Close the connection pool."""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info(f"Closed {self.service_name} connection pool")
    
    async def execute_request(self, method: str, url: str, 
                             headers: Optional[Dict] = None,
                             json_data: Optional[Dict] = None,
                             retry: bool = True) -> Optional[Dict[str, Any]]:
        """
        Execute HTTP request with pooling and rate limiting.
        
        Returns:
            Response data or None if failed
        """
        if not self.session:
            await self.initialize()
        
        # Wait for rate limit
        wait_time = self.rate_limiter.wait_time()
        if wait_time > 0:
            logger.debug(f"Rate limit wait: {wait_time:.2f}s for {self.service_name}")
            await asyncio.sleep(wait_time)
        
        # Acquire rate limit token
        if not self.rate_limiter.acquire():
            logger.warning(f"Rate limit exceeded for {self.service_name}")
            return None
        
        # Track request
        self.stats.total_requests += 1
        start_time = time.time()
        
        # Retry logic
        retry_count = 0
        max_retries = len(self.retry_delays) if retry else 0
        
        while retry_count <= max_retries:
            try:
                async with self.semaphore:
                    async with self.session.request(
                        method=method,
                        url=url,
                        headers=headers,
                        json=json_data
                    ) as response:
                        # Update stats
                        latency_ms = (time.time() - start_time) * 1000
                        self.stats.total_latency_ms += latency_ms
                        self.stats.last_request_time = datetime.now(timezone.utc)
                        
                        if response.status == 200:
                            self.stats.successful_requests += 1
                            return await response.json()
                        elif response.status == 429:  # Rate limited
                            if retry_count < max_retries:
                                delay = self.retry_delays[retry_count]
                                logger.warning(f"{self.service_name} rate limited, retrying in {delay}s")
                                await asyncio.sleep(delay)
                                retry_count += 1
                                continue
                        else:
                            error_text = await response.text()
                            logger.error(f"{self.service_name} request failed: {response.status} - {error_text}")
                            self.stats.failed_requests += 1
                            self.stats.last_error_time = datetime.now(timezone.utc)
                            self.stats.last_error_message = f"HTTP {response.status}: {error_text[:200]}"
                            return None
                            
            except asyncio.TimeoutError:
                logger.error(f"{self.service_name} request timeout after {self.timeout}s")
                self.stats.failed_requests += 1
                self.stats.last_error_message = "Request timeout"
                if retry_count < max_retries:
                    await asyncio.sleep(self.retry_delays[retry_count])
                    retry_count += 1
                    continue
                return None
                
            except Exception as e:
                logger.error(f"{self.service_name} request error: {e}")
                self.stats.failed_requests += 1
                self.stats.last_error_time = datetime.now(timezone.utc)
                self.stats.last_error_message = str(e)[:200]
                if retry_count < max_retries:
                    await asyncio.sleep(self.retry_delays[retry_count])
                    retry_count += 1
                    continue
                return None
        
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        return {
            'service': self.service_name,
            'total_requests': self.stats.total_requests,
            'successful_requests': self.stats.successful_requests,
            'failed_requests': self.stats.failed_requests,
            'success_rate': f"{self.stats.success_rate * 100:.2f}%",
            'average_latency_ms': f"{self.stats.average_latency_ms:.2f}",
            'last_request': self.stats.last_request_time.isoformat() if self.stats.last_request_time else None,
            'last_error': self.stats.last_error_message,
            'last_error_time': self.stats.last_error_time.isoformat() if self.stats.last_error_time else None,
            'max_connections': self.max_connections,
            'rate_limit': f"{self.rate_limiter.rate} req/min"
        }


class GeminiConnectionPool(AIConnectionPool):
    """Connection pool for Google Gemini API."""
    
    def __init__(self, api_key: Optional[str] = None):
        api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("Gemini API key not configured")
        
        super().__init__(
            service_name="Gemini",
            api_key=api_key,
            max_connections=3,  # Conservative for free tier
            rate_limit=60,  # 60 requests per minute
            timeout=30
        )
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
    
    async def generate_content(self, prompt: str, model: str = "gemini-pro") -> Optional[str]:
        """
        Generate content using Gemini API.
        
        Args:
            prompt: Text prompt
            model: Model to use
            
        Returns:
            Generated text or None
        """
        url = f"{self.base_url}/models/{model}:generateContent"
        headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': self.api_key
        }
        data = {
            'contents': [{
                'parts': [{'text': prompt}]
            }],
            'generationConfig': {
                'temperature': 0.7,
                'topK': 40,
                'topP': 0.95,
                'maxOutputTokens': 2048,
            }
        }
        
        result = await self.execute_request('POST', url, headers=headers, json_data=data)
        
        if result and 'candidates' in result:
            candidates = result['candidates']
            if candidates and 'content' in candidates[0]:
                parts = candidates[0]['content'].get('parts', [])
                if parts and 'text' in parts[0]:
                    return parts[0]['text']
        
        return None


class PerplexityConnectionPool(AIConnectionPool):
    """Connection pool for Perplexity API."""
    
    def __init__(self, api_key: Optional[str] = None):
        api_key = api_key or os.getenv('PERPLEXITY_API_KEY')
        if not api_key:
            raise ValueError("Perplexity API key not configured")
        
        super().__init__(
            service_name="Perplexity",
            api_key=api_key,
            max_connections=2,  # Conservative limit
            rate_limit=20,  # Lower rate limit for Perplexity
            timeout=45  # Longer timeout for search operations
        )
        self.base_url = "https://api.perplexity.ai"
    
    async def search(self, query: str, model: str = "pplx-70b-online") -> Optional[Dict[str, Any]]:
        """
        Search using Perplexity API.
        
        Args:
            query: Search query
            model: Model to use
            
        Returns:
            Search results or None
        """
        url = f"{self.base_url}/chat/completions"
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        data = {
            'model': model,
            'messages': [
                {'role': 'system', 'content': 'You are a helpful political intelligence assistant.'},
                {'role': 'user', 'content': query}
            ],
            'temperature': 0.5,
            'max_tokens': 1000
        }
        
        result = await self.execute_request('POST', url, headers=headers, json_data=data)
        
        if result and 'choices' in result:
            choices = result['choices']
            if choices and 'message' in choices[0]:
                return choices[0]['message'].get('content')
        
        return None


class AIServicePoolManager:
    """Manages connection pools for all AI services."""
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize pool manager."""
        if self._initialized:
            return
        
        self.pools: Dict[str, AIConnectionPool] = {}
        self._initialized = True
        
        # Initialize pools if API keys are available
        try:
            if os.getenv('GEMINI_API_KEY'):
                self.pools['gemini'] = GeminiConnectionPool()
                logger.info("Initialized Gemini connection pool")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini pool: {e}")
        
        try:
            if os.getenv('PERPLEXITY_API_KEY'):
                self.pools['perplexity'] = PerplexityConnectionPool()
                logger.info("Initialized Perplexity connection pool")
        except Exception as e:
            logger.warning(f"Failed to initialize Perplexity pool: {e}")
    
    def get_pool(self, service: str) -> Optional[AIConnectionPool]:
        """Get connection pool for a service."""
        return self.pools.get(service.lower())
    
    async def close_all(self):
        """Close all connection pools."""
        for pool in self.pools.values():
            await pool.close()
        self.pools.clear()
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all connection pools."""
        return {
            service: pool.get_stats()
            for service, pool in self.pools.items()
        }
    
    def is_service_available(self, service: str) -> bool:
        """Check if a service is available."""
        return service.lower() in self.pools


# Global pool manager instance
pool_manager = AIServicePoolManager()


def get_pool_manager() -> AIServicePoolManager:
    """Get the global pool manager instance."""
    return pool_manager


async def test_connection_pools():
    """Test function for connection pools."""
    manager = get_pool_manager()
    
    # Test Gemini if available
    gemini_pool = manager.get_pool('gemini')
    if gemini_pool:
        logger.info("Testing Gemini connection pool...")
        result = await gemini_pool.generate_content("What is the capital of India?")
        if result:
            logger.info(f"Gemini test successful: {result[:100]}...")
        else:
            logger.error("Gemini test failed")
    
    # Test Perplexity if available
    perplexity_pool = manager.get_pool('perplexity')
    if perplexity_pool:
        logger.info("Testing Perplexity connection pool...")
        result = await perplexity_pool.search("Latest political news in Hyderabad")
        if result:
            logger.info(f"Perplexity test successful: {result[:100]}...")
        else:
            logger.error("Perplexity test failed")
    
    # Print statistics
    stats = manager.get_all_stats()
    logger.info(f"Connection pool statistics: {stats}")


if __name__ == "__main__":
    # Test the connection pools
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_connection_pools())