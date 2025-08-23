#!/usr/bin/env python3
"""
Redis Cache Optimizer for Sprint 1 Features

Optimizes Redis caching for multi-model AI results, SSE connection state,
and component health monitoring to meet Sprint 1 performance requirements.

CRITICAL PERFORMANCE TARGETS:
- SSE data retrieval: <50ms for real-time streaming
- AI result caching: <25ms for confidence scoring storage
- Component health cache: <10ms for dashboard updates
- Intelligence briefing cache: <5ms for instant delivery

OPTIMIZATION STRATEGIES:
1. Intelligent key partitioning for multi-model AI results
2. Connection pooling optimization for SSE workload
3. Cache warming for frequently accessed ward intelligence
4. Memory optimization for sustained high-throughput operations
5. TTL optimization based on data freshness requirements

Usage:
    python redis_cache_optimizer.py --optimize-all
    python redis_cache_optimizer.py --warm-cache --wards "Jubilee Hills,Begumpet"
    python redis_cache_optimizer.py --monitor --duration 300
    python redis_cache_optimizer.py --benchmark --iterations 1000
"""

import os
import sys
import time
import json
import redis
import argparse
import threading
import statistics
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app import create_app
    from app.extensions import db
    from sqlalchemy import text
    import asyncio
except ImportError as e:
    print(f"Missing dependencies: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RedisCacheOptimizer:
    """Advanced Redis cache optimization for Sprint 1 AI and SSE features"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.app = create_app()
        
        # Initialize Redis connections with optimized settings
        self.redis_pool = redis.ConnectionPool.from_url(
            self.redis_url,
            max_connections=50,  # High concurrency for SSE
            retry_on_timeout=True,
            health_check_interval=30
        )
        self.redis_client = redis.Redis(connection_pool=self.redis_pool)
        
        # Cache configuration for different data types
        self.cache_configs = {
            'ai_results': {
                'prefix': 'ai:result:',
                'ttl': 3600,  # 1 hour for AI analysis results
                'compression': True,
                'target_latency_ms': 25
            },
            'sse_state': {
                'prefix': 'sse:conn:',
                'ttl': 300,   # 5 minutes for connection state
                'compression': False,  # Speed over space for real-time data
                'target_latency_ms': 50
            },
            'component_health': {
                'prefix': 'comp:health:',
                'ttl': 60,    # 1 minute for component health
                'compression': False,
                'target_latency_ms': 10
            },
            'intelligence_brief': {
                'prefix': 'intel:brief:',
                'ttl': 1800,  # 30 minutes for intelligence briefings
                'compression': True,
                'target_latency_ms': 5
            },
            'ward_summary': {
                'prefix': 'ward:summary:',
                'ttl': 600,   # 10 minutes for ward summaries
                'compression': True,
                'target_latency_ms': 100
            }
        }
        
        # Performance metrics tracking
        self.performance_metrics = {
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_latency_ms': 0,
            'operations_count': 0,
            'error_count': 0
        }
        
    def optimize_redis_configuration(self) -> Dict[str, Any]:
        """Optimize Redis configuration for Sprint 1 workload"""
        logger.info("🔧 Optimizing Redis configuration for Sprint 1 workload...")
        
        try:
            # Get current Redis configuration
            current_config = self.redis_client.config_get()
            
            # Optimized configuration for high-throughput AI workload
            optimizations = {
                # Memory optimization
                'maxmemory-policy': 'allkeys-lru',
                'maxmemory': '512mb',
                
                # Performance optimization
                'tcp-keepalive': '60',
                'timeout': '300',
                'tcp-nodelay': 'yes',
                
                # Persistence optimization (balanced for performance)
                'save': '900 1 300 10 60 10000',
                'stop-writes-on-bgsave-error': 'no',
                
                # Client optimization
                'client-output-buffer-limit': 'normal 0 0 0 slave 268435456 67108864 60 pubsub 33554432 8388608 60',
                
                # Hash optimization for AI result storage
                'hash-max-ziplist-entries': '512',
                'hash-max-ziplist-value': '64',
                
                # List optimization for SSE message queues
                'list-max-ziplist-size': '-2',
                'list-compress-depth': '0',
                
                # Set optimization for component tracking
                'set-max-intset-entries': '512'
            }
            
            applied_optimizations = {}
            for key, value in optimizations.items():
                try:
                    self.redis_client.config_set(key, value)
                    applied_optimizations[key] = value
                    logger.info(f"✅ Applied {key} = {value}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not apply {key}: {e}")
            
            # Verify critical optimizations
            verification_results = self._verify_optimizations()
            
            return {
                'applied_optimizations': applied_optimizations,
                'verification_results': verification_results,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Redis optimization failed: {e}")
            return {'error': str(e)}
    
    def _verify_optimizations(self) -> Dict[str, Any]:
        """Verify that optimizations are working correctly"""
        try:
            # Test basic operations
            test_key = "optimization_test"
            test_data = {"test": "data", "timestamp": time.time()}
            
            # Write test
            start_time = time.time()
            self.redis_client.setex(test_key, 60, json.dumps(test_data))
            write_latency = (time.time() - start_time) * 1000
            
            # Read test
            start_time = time.time()
            retrieved_data = self.redis_client.get(test_key)
            read_latency = (time.time() - start_time) * 1000
            
            # Cleanup
            self.redis_client.delete(test_key)
            
            # Memory usage check
            memory_info = self.redis_client.info('memory')
            
            return {
                'write_latency_ms': write_latency,
                'read_latency_ms': read_latency,
                'memory_usage_mb': memory_info.get('used_memory', 0) / 1024 / 1024,
                'connected_clients': self.redis_client.info().get('connected_clients', 0),
                'operations_per_second': self.redis_client.info().get('instantaneous_ops_per_sec', 0)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def warm_cache_for_wards(self, ward_names: List[str]) -> Dict[str, Any]:
        """Pre-warm cache with ward intelligence data"""
        logger.info(f"🔥 Warming cache for {len(ward_names)} wards...")
        
        results = {
            'wards_processed': 0,
            'cache_entries_created': 0,
            'errors': [],
            'processing_time_ms': 0
        }
        
        start_time = time.time()
        
        with self.app.app_context():
            for ward in ward_names:
                try:
                    # Generate ward intelligence summary
                    ward_data = self._generate_ward_intelligence(ward)
                    
                    if ward_data:
                        # Cache with optimized settings
                        cache_key = f"{self.cache_configs['ward_summary']['prefix']}{ward}"
                        self._cache_data(cache_key, ward_data, 'ward_summary')
                        
                        # Cache intelligence briefing
                        brief_key = f"{self.cache_configs['intelligence_brief']['prefix']}{ward}"
                        brief_data = self._generate_intelligence_brief(ward)
                        if brief_data:
                            self._cache_data(brief_key, brief_data, 'intelligence_brief')
                        
                        results['cache_entries_created'] += 2
                    
                    results['wards_processed'] += 1
                    
                except Exception as e:
                    error_msg = f"Error warming cache for {ward}: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
        
        results['processing_time_ms'] = (time.time() - start_time) * 1000
        logger.info(f"✅ Cache warming completed: {results['cache_entries_created']} entries created")
        
        return results
    
    def _generate_ward_intelligence(self, ward: str) -> Optional[Dict[str, Any]]:
        """Generate ward intelligence summary from database"""
        try:
            result = db.session.execute(text("""
                SELECT 
                    COUNT(*) as total_posts,
                    COUNT(DISTINCT author_id) as unique_authors,
                    COUNT(DISTINCT party) as parties_mentioned,
                    AVG(CASE WHEN emotion = 'positive' THEN 1 WHEN emotion = 'negative' THEN -1 ELSE 0 END) as sentiment_score,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as posts_24h,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as posts_7d,
                    MAX(created_at) as latest_post
                FROM post 
                WHERE city = :ward 
                  AND created_at >= NOW() - INTERVAL '30 days'
            """), {'ward': ward}).fetchone()
            
            if result:
                return {
                    'ward': ward,
                    'total_posts': result.total_posts,
                    'unique_authors': result.unique_authors,
                    'parties_mentioned': result.parties_mentioned,
                    'sentiment_score': float(result.sentiment_score or 0),
                    'posts_24h': result.posts_24h,
                    'posts_7d': result.posts_7d,
                    'latest_post': result.latest_post.isoformat() if result.latest_post else None,
                    'generated_at': datetime.now(timezone.utc).isoformat()
                }
            
        except Exception as e:
            logger.error(f"Error generating ward intelligence for {ward}: {e}")
        
        return None
    
    def _generate_intelligence_brief(self, ward: str) -> Optional[Dict[str, Any]]:
        """Generate intelligence brief for ward"""
        try:
            # Get recent AI analysis results
            result = db.session.execute(text("""
                SELECT 
                    analysis_results,
                    ensemble_confidence,
                    quality_score,
                    completed_at
                FROM ai_analysis_results
                WHERE ward_context = :ward
                  AND status = 'completed'
                  AND completed_at >= NOW() - INTERVAL '24 hours'
                ORDER BY completed_at DESC
                LIMIT 5
            """), {'ward': ward}).fetchall()
            
            if result:
                analyses = []
                for row in result:
                    analyses.append({
                        'analysis': row.analysis_results,
                        'confidence': float(row.ensemble_confidence or 0),
                        'quality': float(row.quality_score or 0),
                        'timestamp': row.completed_at.isoformat()
                    })
                
                return {
                    'ward': ward,
                    'recent_analyses': analyses,
                    'analysis_count': len(analyses),
                    'avg_confidence': statistics.mean([a['confidence'] for a in analyses]) if analyses else 0,
                    'generated_at': datetime.now(timezone.utc).isoformat()
                }
            
        except Exception as e:
            logger.error(f"Error generating intelligence brief for {ward}: {e}")
        
        return None
    
    def _cache_data(self, key: str, data: Dict[str, Any], cache_type: str) -> bool:
        """Cache data with optimized settings based on type"""
        try:
            config = self.cache_configs[cache_type]
            
            # Serialize data
            if config['compression']:
                # For compressed storage, use JSON with minimal whitespace
                serialized_data = json.dumps(data, separators=(',', ':'))
            else:
                # For speed-optimized storage, use standard JSON
                serialized_data = json.dumps(data)
            
            # Store with TTL
            success = self.redis_client.setex(key, config['ttl'], serialized_data)
            
            if success:
                # Add cache metadata
                meta_key = f"{key}:meta"
                metadata = {
                    'cached_at': time.time(),
                    'ttl': config['ttl'],
                    'size_bytes': len(serialized_data),
                    'type': cache_type
                }
                self.redis_client.setex(meta_key, config['ttl'], json.dumps(metadata))
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching data for key {key}: {e}")
            return False
    
    def benchmark_cache_performance(self, iterations: int = 1000) -> Dict[str, Any]:
        """Benchmark cache performance for all cache types"""
        logger.info(f"🚀 Running cache performance benchmark with {iterations} iterations...")
        
        results = {}
        
        for cache_type, config in self.cache_configs.items():
            logger.info(f"Testing {cache_type} cache performance...")
            
            # Generate test data
            test_data = {
                'benchmark': True,
                'cache_type': cache_type,
                'data': 'x' * 1024,  # 1KB test payload
                'timestamp': time.time()
            }
            
            write_times = []
            read_times = []
            errors = 0
            
            # Write benchmark
            for i in range(iterations):
                try:
                    key = f"benchmark:{cache_type}:{i}"
                    
                    start_time = time.time()
                    self._cache_data(key, test_data, cache_type)
                    write_time = (time.time() - start_time) * 1000
                    write_times.append(write_time)
                    
                except Exception as e:
                    errors += 1
            
            # Read benchmark
            for i in range(iterations):
                try:
                    key = f"benchmark:{cache_type}:{i}"
                    
                    start_time = time.time()
                    data = self.redis_client.get(key)
                    if data:
                        json.loads(data)
                    read_time = (time.time() - start_time) * 1000
                    read_times.append(read_time)
                    
                except Exception as e:
                    errors += 1
            
            # Cleanup benchmark data
            self._cleanup_benchmark_data(cache_type, iterations)
            
            # Calculate statistics
            results[cache_type] = {
                'write_performance': {
                    'avg_ms': statistics.mean(write_times) if write_times else 0,
                    'p95_ms': self._percentile(write_times, 95) if write_times else 0,
                    'p99_ms': self._percentile(write_times, 99) if write_times else 0,
                    'max_ms': max(write_times) if write_times else 0
                },
                'read_performance': {
                    'avg_ms': statistics.mean(read_times) if read_times else 0,
                    'p95_ms': self._percentile(read_times, 95) if read_times else 0,
                    'p99_ms': self._percentile(read_times, 99) if read_times else 0,
                    'max_ms': max(read_times) if read_times else 0
                },
                'target_latency_ms': config['target_latency_ms'],
                'meets_target': {
                    'write': self._percentile(write_times, 95) < config['target_latency_ms'] if write_times else False,
                    'read': self._percentile(read_times, 95) < config['target_latency_ms'] if read_times else False
                },
                'error_rate': errors / (iterations * 2) * 100,
                'total_operations': len(write_times) + len(read_times)
            }
            
            # Log results
            read_p95 = results[cache_type]['read_performance']['p95_ms']
            target = config['target_latency_ms']
            status = "✅" if read_p95 < target else "❌"
            logger.info(f"{status} {cache_type}: {read_p95:.1f}ms (target: <{target}ms)")
        
        return results
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _cleanup_benchmark_data(self, cache_type: str, iterations: int):
        """Clean up benchmark test data"""
        try:
            keys_to_delete = []
            for i in range(iterations):
                keys_to_delete.append(f"benchmark:{cache_type}:{i}")
                keys_to_delete.append(f"benchmark:{cache_type}:{i}:meta")
            
            if keys_to_delete:
                self.redis_client.delete(*keys_to_delete)
        except Exception as e:
            logger.error(f"Error cleaning up benchmark data: {e}")
    
    def monitor_performance(self, duration_seconds: int = 300) -> Dict[str, Any]:
        """Monitor cache performance in real-time"""
        logger.info(f"📊 Monitoring cache performance for {duration_seconds} seconds...")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        samples = []
        
        while time.time() < end_time:
            try:
                # Get Redis stats
                info = self.redis_client.info()
                memory_info = self.redis_client.info('memory')
                
                sample = {
                    'timestamp': time.time(),
                    'connected_clients': info.get('connected_clients', 0),
                    'used_memory_mb': memory_info.get('used_memory', 0) / 1024 / 1024,
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0),
                    'ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                    'input_kbps': info.get('instantaneous_input_kbps', 0),
                    'output_kbps': info.get('instantaneous_output_kbps', 0)
                }
                
                samples.append(sample)
                time.sleep(1)  # Sample every second
                
            except Exception as e:
                logger.error(f"Error during monitoring: {e}")
                break
        
        # Calculate monitoring results
        if samples:
            hit_rates = []
            for sample in samples:
                total_ops = sample['keyspace_hits'] + sample['keyspace_misses']
                hit_rate = sample['keyspace_hits'] / max(total_ops, 1) * 100
                hit_rates.append(hit_rate)
            
            return {
                'duration_seconds': time.time() - start_time,
                'samples_collected': len(samples),
                'average_hit_rate_percent': statistics.mean(hit_rates),
                'average_ops_per_second': statistics.mean([s['ops_per_sec'] for s in samples]),
                'peak_memory_mb': max([s['used_memory_mb'] for s in samples]),
                'max_clients': max([s['connected_clients'] for s in samples]),
                'performance_stable': statistics.stdev(hit_rates) < 5 if len(hit_rates) > 1 else True,
                'samples': samples[-10:]  # Include last 10 samples for debugging
            }
        
        return {'error': 'No samples collected'}
    
    def get_cache_analysis(self) -> Dict[str, Any]:
        """Get comprehensive cache analysis and recommendations"""
        logger.info("📋 Analyzing current cache performance...")
        
        try:
            # Get Redis info
            info = self.redis_client.info()
            memory_info = self.redis_client.info('memory')
            
            # Analyze key patterns
            key_analysis = self._analyze_key_patterns()
            
            # Calculate hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total_ops = hits + misses
            hit_rate = (hits / max(total_ops, 1)) * 100
            
            # Memory analysis
            used_memory_mb = memory_info.get('used_memory', 0) / 1024 / 1024
            max_memory = memory_info.get('maxmemory', 0)
            memory_usage_percent = (memory_info.get('used_memory', 0) / max(max_memory, 1)) * 100 if max_memory > 0 else 0
            
            analysis = {
                'cache_health': {
                    'hit_rate_percent': hit_rate,
                    'total_operations': total_ops,
                    'connected_clients': info.get('connected_clients', 0),
                    'ops_per_second': info.get('instantaneous_ops_per_sec', 0)
                },
                'memory_analysis': {
                    'used_memory_mb': used_memory_mb,
                    'memory_usage_percent': memory_usage_percent,
                    'fragmentation_ratio': memory_info.get('mem_fragmentation_ratio', 0),
                    'max_memory_mb': max_memory / 1024 / 1024 if max_memory > 0 else 'unlimited'
                },
                'key_analysis': key_analysis,
                'recommendations': self._generate_recommendations(hit_rate, used_memory_mb, key_analysis),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing cache: {e}")
            return {'error': str(e)}
    
    def _analyze_key_patterns(self) -> Dict[str, Any]:
        """Analyze Redis key patterns"""
        try:
            key_patterns = {}
            
            for cache_type, config in self.cache_configs.items():
                pattern = f"{config['prefix']}*"
                keys = self.redis_client.keys(pattern)
                
                if keys:
                    # Sample some keys for analysis
                    sample_keys = keys[:min(10, len(keys))]
                    sample_sizes = []
                    sample_ttls = []
                    
                    for key in sample_keys:
                        try:
                            size = self.redis_client.memory_usage(key) or 0
                            ttl = self.redis_client.ttl(key)
                            sample_sizes.append(size)
                            if ttl > 0:
                                sample_ttls.append(ttl)
                        except:
                            pass
                    
                    key_patterns[cache_type] = {
                        'total_keys': len(keys),
                        'avg_size_bytes': statistics.mean(sample_sizes) if sample_sizes else 0,
                        'avg_ttl_seconds': statistics.mean(sample_ttls) if sample_ttls else 0,
                        'sample_count': len(sample_keys)
                    }
                else:
                    key_patterns[cache_type] = {
                        'total_keys': 0,
                        'avg_size_bytes': 0,
                        'avg_ttl_seconds': 0,
                        'sample_count': 0
                    }
            
            return key_patterns
            
        except Exception as e:
            logger.error(f"Error analyzing key patterns: {e}")
            return {}
    
    def _generate_recommendations(self, hit_rate: float, memory_mb: float, key_analysis: Dict) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        # Hit rate recommendations
        if hit_rate < 80:
            recommendations.append("Consider increasing cache TTL for frequently accessed data")
            recommendations.append("Implement cache warming for critical ward intelligence data")
        
        # Memory recommendations
        if memory_mb > 400:
            recommendations.append("Monitor memory usage - approaching recommended limits")
            recommendations.append("Consider implementing more aggressive cache eviction policies")
        
        # Key pattern recommendations
        for cache_type, stats in key_analysis.items():
            if stats['total_keys'] == 0:
                recommendations.append(f"No {cache_type} cache entries found - consider cache warming")
            elif stats['avg_size_bytes'] > 10000:  # 10KB
                recommendations.append(f"{cache_type} cache entries are large - consider compression")
        
        # Performance recommendations
        recommendations.append("Run periodic cache benchmarks to monitor performance")
        recommendations.append("Implement cache invalidation strategies for stale data")
        
        return recommendations


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='Redis Cache Optimizer for Sprint 1')
    
    parser.add_argument('--optimize-all', action='store_true',
                       help='Run complete optimization suite')
    parser.add_argument('--warm-cache', action='store_true',
                       help='Warm cache with ward intelligence data')
    parser.add_argument('--wards', type=str,
                       help='Comma-separated list of wards for cache warming')
    parser.add_argument('--benchmark', action='store_true',
                       help='Run cache performance benchmark')
    parser.add_argument('--iterations', type=int, default=1000,
                       help='Number of benchmark iterations')
    parser.add_argument('--monitor', action='store_true',
                       help='Monitor cache performance')
    parser.add_argument('--duration', type=int, default=300,
                       help='Monitoring duration in seconds')
    parser.add_argument('--analyze', action='store_true',
                       help='Analyze current cache state')
    parser.add_argument('--output', type=str,
                       help='Output results to JSON file')
    
    args = parser.parse_args()
    
    try:
        optimizer = RedisCacheOptimizer()
        results = {}
        
        if args.optimize_all:
            logger.info("🚀 Running complete optimization suite...")
            results['redis_optimization'] = optimizer.optimize_redis_configuration()
            
            # Default wards for cache warming
            default_wards = ['Jubilee Hills', 'Begumpet', 'Khairatabad', 'Himayath Nagar', 'Gandhinagar']
            results['cache_warming'] = optimizer.warm_cache_for_wards(default_wards)
            results['benchmark'] = optimizer.benchmark_cache_performance(args.iterations)
            results['analysis'] = optimizer.get_cache_analysis()
            
        elif args.warm_cache:
            wards = args.wards.split(',') if args.wards else ['Jubilee Hills', 'Begumpet']
            results = optimizer.warm_cache_for_wards([w.strip() for w in wards])
            
        elif args.benchmark:
            results = optimizer.benchmark_cache_performance(args.iterations)
            
        elif args.monitor:
            results = optimizer.monitor_performance(args.duration)
            
        elif args.analyze:
            results = optimizer.get_cache_analysis()
            
        else:
            # Default: quick analysis
            results = optimizer.get_cache_analysis()
        
        # Output results
        output = json.dumps(results, indent=2, default=str)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Results saved to {args.output}")
        else:
            print(output)
        
        # Performance summary
        if 'benchmark' in results:
            logger.info("📊 Performance Summary:")
            for cache_type, perf in results['benchmark'].items():
                read_p95 = perf['read_performance']['p95_ms']
                target = optimizer.cache_configs[cache_type]['target_latency_ms']
                status = "✅" if read_p95 < target else "❌"
                logger.info(f"  {status} {cache_type}: {read_p95:.1f}ms (target: <{target}ms)")
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()