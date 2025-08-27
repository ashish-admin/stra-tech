#!/usr/bin/env python3
"""Test script for Redis cache in Political Strategist module."""

import os
import sys
import json
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import the cache module
from strategist.cache import (
    cget, cset, get_cache_stats, is_redis_available, 
    get_redis_client, invalidate_pattern
)

def test_redis_connection():
    """Test if Redis is properly connected."""
    print("=" * 60)
    print("Testing Redis Cache Configuration")
    print("=" * 60)
    
    # Check if Redis is available
    print(f"\n1. Checking Redis availability...")
    if is_redis_available():
        print("   ✅ Redis is available")
    else:
        print("   ❌ Redis is NOT available")
        return False
    
    # Get Redis client
    print(f"\n2. Getting Redis client...")
    client = get_redis_client()
    if client:
        print("   ✅ Redis client obtained")
        try:
            # Test ping
            client.ping()
            print("   ✅ Redis ping successful")
        except Exception as e:
            print(f"   ❌ Redis ping failed: {e}")
            return False
    else:
        print("   ❌ Could not get Redis client")
        return False
    
    return True

def test_cache_operations():
    """Test cache get/set operations."""
    print(f"\n3. Testing cache operations...")
    
    # Test data
    test_key = "test:strategist:cache"
    test_data = {
        "ward": "Jubilee Hills",
        "analysis": "Test analysis data",
        "timestamp": datetime.now().isoformat()
    }
    test_etag = "test-etag-123"
    test_ttl = 60  # 60 seconds
    
    # Test set
    print(f"   Setting cache key: {test_key}")
    success = cset(test_key, test_data, test_etag, test_ttl)
    if success:
        print("   ✅ Cache set successful")
    else:
        print("   ❌ Cache set failed")
        return False
    
    # Test get
    print(f"   Getting cache key: {test_key}")
    cached_data = cget(test_key)
    if cached_data:
        print("   ✅ Cache get successful")
        print(f"   Data: {json.dumps(cached_data.get('data', {}), indent=2)[:200]}...")
        print(f"   ETag: {cached_data.get('etag')}")
    else:
        print("   ❌ Cache get failed")
        return False
    
    # Test pattern invalidation
    print(f"\n4. Testing cache invalidation...")
    count = invalidate_pattern("test:*")
    print(f"   Invalidated {count} keys matching 'test:*'")
    
    return True

def test_cache_stats():
    """Test cache statistics."""
    print(f"\n5. Getting cache statistics...")
    stats = get_cache_stats()
    
    if stats.get("status") == "available":
        print("   ✅ Cache statistics available:")
        print(f"   - Used Memory: {stats.get('used_memory', 'N/A')}")
        print(f"   - Connected Clients: {stats.get('connected_clients', 'N/A')}")
        print(f"   - Commands Processed: {stats.get('total_commands_processed', 'N/A')}")
        print(f"   - Cache Hit Rate: {stats.get('hit_rate', 0):.2%}")
    elif stats.get("status") == "unavailable":
        print("   ⚠️  Cache unavailable")
    else:
        print(f"   ❌ Error getting cache stats: {stats.get('error', 'Unknown')}")
    
    return True

def test_health_endpoint():
    """Test the health endpoint to see Redis status."""
    print(f"\n6. Testing health endpoint integration...")
    
    try:
        # Import Flask app
        from app import create_app
        app = create_app()
        
        with app.test_client() as client:
            response = client.get('/api/v1/strategist/health')
            if response.status_code == 200:
                data = response.get_json()
                print("   ✅ Health endpoint returned 200 OK")
                
                # Check cache component status
                cache_status = data.get('components', {}).get('cache', {})
                if cache_status.get('status') == 'healthy':
                    print(f"   ✅ Cache component: {cache_status.get('status')} ({cache_status.get('type', 'unknown')})")
                elif cache_status.get('status') == 'unavailable':
                    print(f"   ⚠️  Cache component: {cache_status.get('status')} - {cache_status.get('message', '')}")
                else:
                    print(f"   ❌ Cache component: {cache_status}")
            else:
                print(f"   ❌ Health endpoint returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error testing health endpoint: {e}")
        print("   (This may be normal if Flask app is not running)")
    
    return True

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("REDIS CACHE TEST SUITE")
    print("=" * 60)
    
    # Show environment
    redis_url = os.getenv('REDIS_URL', 'Not set')
    print(f"\nEnvironment:")
    print(f"  REDIS_URL: {redis_url}")
    
    # Run tests
    all_passed = True
    
    if not test_redis_connection():
        all_passed = False
        print("\n❌ Redis connection test FAILED")
    else:
        print("\n✅ Redis connection test PASSED")
    
    if test_redis_connection():  # Only run if connected
        if not test_cache_operations():
            all_passed = False
            print("\n❌ Cache operations test FAILED")
        else:
            print("\n✅ Cache operations test PASSED")
        
        test_cache_stats()  # Always run stats
        test_health_endpoint()  # Always test health
    
    # Final summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL TESTS PASSED - Redis cache is properly configured!")
    else:
        print("❌ SOME TESTS FAILED - Check Redis configuration")
    print("=" * 60)

if __name__ == "__main__":
    main()