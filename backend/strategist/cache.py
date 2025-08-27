"""
Caching Layer for Political Strategist

Implements Redis-based caching with ETag support for strategic intelligence data.
"""

import os
import redis
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Initialize Redis connection
try:
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    r = redis.from_url(redis_url, decode_responses=True)
    # Test connection
    r.ping()
    logger.info("Redis cache connection established")
    redis_client = r  # Export for compatibility
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    r = None
    redis_client = None


def cget(key: str) -> Optional[Dict[str, Any]]:
    """
    Get cached data by key.
    
    Args:
        key: Cache key
        
    Returns:
        Cached data dictionary or None if not found
    """
    if not r:
        return None
        
    try:
        value = r.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.error(f"Cache get error for key {key}: {e}")
        return None


def cset(key: str, data: Dict[str, Any], etag: str, ttl: int) -> bool:
    """
    Set cached data with ETag and TTL.
    
    Args:
        key: Cache key
        data: Data to cache
        etag: ETag for cache validation
        ttl: Time to live in seconds
        
    Returns:
        True if successful, False otherwise
    """
    if not r:
        return False
        
    try:
        cache_value = {
            'data': data,
            'etag': etag,
            'ttl': ttl,
            'cached_at': json.dumps(datetime.now().isoformat())
        }
        r.setex(key, ttl, json.dumps(cache_value))
        logger.info(f"Cached data for key {key} with TTL {ttl}s")
        return True
    except Exception as e:
        logger.error(f"Cache set error for key {key}: {e}")
        return False


def invalidate_pattern(pattern: str) -> int:
    """
    Invalidate cache keys matching pattern.
    
    Args:
        pattern: Redis key pattern (supports wildcards)
        
    Returns:
        Number of keys invalidated
    """
    if not r:
        return 0
        
    try:
        keys = r.keys(pattern)
        if keys:
            count = r.delete(*keys)
            logger.info(f"Invalidated {count} cache entries matching pattern: {pattern}")
            return count
        return 0
    except Exception as e:
        logger.error(f"Cache invalidation error for pattern {pattern}: {e}")
        return 0


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics for monitoring.
    
    Returns:
        Cache statistics dictionary
    """
    if not r:
        return {"status": "unavailable"}
        
    try:
        info = r.info()
        return {
            "status": "available",
            "used_memory": info.get('used_memory_human'),
            "connected_clients": info.get('connected_clients'),
            "total_commands_processed": info.get('total_commands_processed'),
            "keyspace_hits": info.get('keyspace_hits'),
            "keyspace_misses": info.get('keyspace_misses'),
            "hit_rate": info.get('keyspace_hits', 0) / max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {"status": "error", "error": str(e)}


def is_redis_available() -> bool:
    """
    Check if Redis is available and connected.
    
    Returns:
        True if Redis is available, False otherwise
    """
    return r is not None


def get_redis_client():
    """
    Get the Redis client instance.
    
    Returns:
        Redis client or None if not available
    """
    return r


class StrategistCache:
    """
    Strategist cache wrapper for compatibility with existing tests.
    
    This class provides a consistent interface for cache operations
    used by the Political Strategist system.
    """
    
    def __init__(self):
        """Initialize cache with Redis client."""
        self.client = r
    
    @property
    def redis_client(self):
        """Get the underlying Redis client."""
        return self.client
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached data by key."""
        return cget(key)
    
    def set(self, key: str, data: Dict[str, Any], etag: str, ttl: int) -> bool:
        """Set cached data with ETag and TTL."""
        return cset(key, data, etag, ttl)
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache keys matching pattern."""
        return invalidate_pattern(pattern)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return get_cache_stats()
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        return is_redis_available()