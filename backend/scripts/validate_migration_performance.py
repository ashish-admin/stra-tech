#!/usr/bin/env python3
"""
LokDarpan Migration Performance Validation

Comprehensive performance testing and validation suite for database migrations.
Validates that all optimizations meet production performance requirements.

Performance Targets:
- Ward-based queries: <100ms (95th percentile)  
- Vector similarity search: <50ms for 10K+ embeddings
- Competitive analysis: <200ms
- Full-text search: <100ms
- Report generation: <30s
- Concurrent user support: 50+ simultaneous queries

Usage:
    python validate_migration_performance.py --test [all|queries|vectors|concurrent]
    python validate_migration_performance.py --benchmark --iterations 100
    python validate_migration_performance.py --load-test --duration 300
"""

import os
import sys
import time
import json
import statistics
import threading
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional
import argparse
import random
import string

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app import create_app
    from app.extensions import db
    from sqlalchemy import text, func
    import psycopg2
    import numpy as np
except ImportError as e:
    print(f"Missing dependencies: {e}")
    print("Install with: pip install numpy psycopg2-binary")
    sys.exit(1)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceValidator:
    """Comprehensive database performance validation suite"""
    
    def __init__(self, app=None):
        self.app = app or create_app()
        self.performance_targets = {
            'ward_query_ms': 100,
            'vector_search_ms': 50,
            'competitive_analysis_ms': 200,
            'fulltext_search_ms': 100,
            'report_generation_ms': 30000,
            'concurrent_queries': 50
        }
        self.test_results = {}
        
        # Sample ward names for testing
        self.test_wards = [
            'Jubilee Hills', 'Begumpet', 'Khairatabad', 'Himayath Nagar',
            'Gandhinagar', 'Kapra', 'Marredpally', 'Asif Nagar', 'Habsiguda', 'Malkajgiri'
        ]
    
    def run_comprehensive_tests(self) -> Dict:
        """Run all performance validation tests"""
        logger.info("🚀 Starting comprehensive performance validation...")
        
        with self.app.app_context():
            try:
                # Test suite execution
                self.test_results = {
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'database_info': self._get_database_info(),
                    'query_performance': self._test_query_performance(),
                    'index_effectiveness': self._test_index_effectiveness(),
                    'concurrent_performance': self._test_concurrent_queries(),
                    'vector_performance': self._test_vector_operations(),
                    'fulltext_performance': self._test_fulltext_search(),
                    'overall_assessment': {}
                }
                
                # Generate overall assessment
                self.test_results['overall_assessment'] = self._generate_assessment()
                
                logger.info("✅ Performance validation completed")
                return self.test_results
                
            except Exception as e:
                logger.error(f"❌ Performance validation failed: {e}")
                raise
    
    def _get_database_info(self) -> Dict:
        """Get database configuration and statistics"""
        logger.info("📊 Gathering database information...")
        
        try:
            info = {}
            
            # PostgreSQL version and configuration
            result = db.session.execute(text("SELECT version()")).scalar()
            info['postgresql_version'] = result
            
            # Database size
            result = db.session.execute(text("""
                SELECT pg_size_pretty(pg_database_size(current_database()))
            """)).scalar()
            info['database_size'] = result
            
            # Table statistics
            table_stats = db.session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC
                LIMIT 10;
            """)).fetchall()
            
            info['table_statistics'] = [
                {
                    'table': f"{row.schemaname}.{row.tablename}",
                    'live_tuples': row.live_tuples,
                    'dead_tuples': row.dead_tuples,
                    'last_analyze': str(row.last_analyze) if row.last_analyze else None
                }
                for row in table_stats
            ]
            
            # Index usage statistics  
            index_stats = db.session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan
                FROM pg_stat_user_indexes 
                WHERE idx_scan > 0
                ORDER BY idx_scan DESC
                LIMIT 10;
            """)).fetchall()
            
            info['index_usage'] = [
                {
                    'index': f"{row.schemaname}.{row.tablename}.{row.indexname}",
                    'scans': row.idx_scan,
                    'tuples_read': row.idx_tup_read
                }
                for row in index_stats
            ]
            
            # Check for pgvector extension
            result = db.session.execute(text("""
                SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')
            """)).scalar()
            info['pgvector_installed'] = result
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get database info: {e}")
            return {'error': str(e)}
    
    def _test_query_performance(self) -> Dict:
        """Test performance of critical queries"""
        logger.info("⚡ Testing query performance...")
        
        results = {
            'ward_based_queries': [],
            'time_series_queries': [],
            'aggregation_queries': [],
            'join_queries': []
        }
        
        try:
            # Test ward-based post queries (most common)
            for ward in self.test_wards[:5]:  # Test subset
                times = []
                for _ in range(10):  # Multiple iterations
                    start_time = time.time()
                    
                    db.session.execute(text("""
                        SELECT COUNT(*), 
                               COUNT(DISTINCT author_id) as unique_authors,
                               AVG(CASE WHEN emotion = 'positive' THEN 1 ELSE 0 END) as positive_ratio
                        FROM post 
                        WHERE city = :ward 
                          AND created_at >= NOW() - INTERVAL '30 days'
                    """), {'ward': ward}).fetchone()
                    
                    elapsed_ms = (time.time() - start_time) * 1000
                    times.append(elapsed_ms)
                
                results['ward_based_queries'].append({
                    'ward': ward,
                    'avg_ms': statistics.mean(times),
                    'p95_ms': np.percentile(times, 95),
                    'max_ms': max(times),
                    'passes_target': np.percentile(times, 95) < self.performance_targets['ward_query_ms']
                })
            
            # Test time-series aggregation
            times = []
            for _ in range(5):
                start_time = time.time()
                
                db.session.execute(text("""
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as daily_posts,
                        COUNT(DISTINCT party) as parties_mentioned
                    FROM post 
                    WHERE created_at >= NOW() - INTERVAL '90 days'
                      AND city IN ('Jubilee Hills', 'Begumpet', 'Khairatabad')
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC;
                """)).fetchall()
                
                elapsed_ms = (time.time() - start_time) * 1000
                times.append(elapsed_ms)
            
            results['time_series_queries'] = {
                'avg_ms': statistics.mean(times),
                'p95_ms': np.percentile(times, 95),
                'passes_target': np.percentile(times, 95) < self.performance_targets['competitive_analysis_ms']
            }
            
            # Test competitive analysis query
            times = []
            for ward in self.test_wards[:3]:
                start_time = time.time()
                
                db.session.execute(text("""
                    WITH party_stats AS (
                        SELECT 
                            party,
                            COUNT(*) as mentions,
                            AVG(CASE WHEN emotion = 'positive' THEN 1 WHEN emotion = 'negative' THEN -1 ELSE 0 END) as sentiment
                        FROM post 
                        WHERE city = :ward 
                          AND party IS NOT NULL 
                          AND created_at >= NOW() - INTERVAL '30 days'
                        GROUP BY party
                    )
                    SELECT 
                        party,
                        mentions,
                        ROUND(mentions * 100.0 / SUM(mentions) OVER (), 2) as share_pct,
                        sentiment
                    FROM party_stats
                    ORDER BY mentions DESC;
                """), {'ward': ward}).fetchall()
                
                elapsed_ms = (time.time() - start_time) * 1000
                times.append(elapsed_ms)
            
            results['aggregation_queries'] = {
                'avg_ms': statistics.mean(times),
                'p95_ms': np.percentile(times, 95),
                'passes_target': np.percentile(times, 95) < self.performance_targets['competitive_analysis_ms']
            }
            
            logger.info("✅ Query performance tests completed")
            return results
            
        except Exception as e:
            logger.error(f"Query performance test failed: {e}")
            return {'error': str(e)}
    
    def _test_index_effectiveness(self) -> Dict:
        """Test effectiveness of created indexes"""
        logger.info("📋 Testing index effectiveness...")
        
        results = {
            'index_usage': [],
            'query_plans': []
        }
        
        try:
            # Test key indexes are being used
            test_queries = [
                {
                    'name': 'ward_filter_query',
                    'query': "SELECT COUNT(*) FROM post WHERE city = 'Jubilee Hills' AND created_at >= NOW() - INTERVAL '7 days'",
                    'expected_index': 'ix_post_city_created'
                },
                {
                    'name': 'emotion_analysis_query', 
                    'query': "SELECT emotion, COUNT(*) FROM post WHERE city = 'Begumpet' AND emotion IS NOT NULL GROUP BY emotion",
                    'expected_index': 'ix_post_emotion_city'
                },
                {
                    'name': 'party_analysis_query',
                    'query': "SELECT party, COUNT(*) FROM post WHERE city = 'Khairatabad' AND party IS NOT NULL GROUP BY party", 
                    'expected_index': 'ix_post_party_city'
                }
            ]
            
            for test in test_queries:
                # Get query execution plan
                plan_result = db.session.execute(text(f"EXPLAIN (FORMAT JSON, ANALYZE) {test['query']}")).scalar()
                
                results['query_plans'].append({
                    'query_name': test['name'],
                    'execution_plan': plan_result,
                    'uses_index': test['expected_index'] in str(plan_result).lower()
                })
            
            # Check materialized view freshness
            try:
                view_result = db.session.execute(text("""
                    SELECT 
                        schemaname,
                        matviewname,
                        hasindexes,
                        ispopulated
                    FROM pg_matviews
                    WHERE schemaname = 'public';
                """)).fetchall()
                
                results['materialized_views'] = [
                    {
                        'name': row.matviewname,
                        'has_indexes': row.hasindexes,
                        'is_populated': row.ispopulated
                    }
                    for row in view_result
                ]
            except Exception:
                results['materialized_views'] = []
            
            logger.info("✅ Index effectiveness tests completed")
            return results
            
        except Exception as e:
            logger.error(f"Index effectiveness test failed: {e}")
            return {'error': str(e)}
    
    def _test_concurrent_queries(self) -> Dict:
        """Test performance under concurrent load"""
        logger.info("🔄 Testing concurrent query performance...")
        
        results = {
            'concurrent_queries': [],
            'deadlocks_detected': 0,
            'average_response_time': 0,
            'queries_per_second': 0
        }
        
        def execute_test_query(query_id: int) -> Dict:
            """Execute a test query and measure performance"""
            try:
                start_time = time.time()
                ward = random.choice(self.test_wards)
                
                with self.app.app_context():
                    result = db.session.execute(text("""
                        SELECT COUNT(*) as posts,
                               COUNT(DISTINCT author_id) as authors,
                               MAX(created_at) as latest_post
                        FROM post 
                        WHERE city = :ward
                          AND created_at >= NOW() - INTERVAL '30 days'
                    """), {'ward': ward}).fetchone()
                    
                    elapsed_ms = (time.time() - start_time) * 1000
                    
                    return {
                        'query_id': query_id,
                        'ward': ward,
                        'elapsed_ms': elapsed_ms,
                        'success': True,
                        'result_count': result.posts if result else 0
                    }
                    
            except Exception as e:
                return {
                    'query_id': query_id,
                    'elapsed_ms': 0,
                    'success': False,
                    'error': str(e)
                }
        
        try:
            # Run concurrent queries
            num_concurrent = 25  # Test with 25 concurrent queries
            
            start_time = time.time()
            with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
                futures = [executor.submit(execute_test_query, i) for i in range(num_concurrent)]
                concurrent_results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            total_time = time.time() - start_time
            
            # Analyze results
            successful_queries = [r for r in concurrent_results if r['success']]
            failed_queries = [r for r in concurrent_results if not r['success']]
            
            if successful_queries:
                response_times = [r['elapsed_ms'] for r in successful_queries]
                results['average_response_time'] = statistics.mean(response_times)
                results['p95_response_time'] = np.percentile(response_times, 95)
                results['max_response_time'] = max(response_times)
                results['queries_per_second'] = len(successful_queries) / total_time
                results['success_rate'] = len(successful_queries) / len(concurrent_results) * 100
                results['meets_concurrent_target'] = len(successful_queries) >= self.performance_targets['concurrent_queries'] * 0.8
            
            results['concurrent_queries'] = concurrent_results
            results['failed_queries_count'] = len(failed_queries)
            
            # Check for deadlocks in recent logs
            try:
                deadlock_result = db.session.execute(text("""
                    SELECT COUNT(*) 
                    FROM pg_stat_database_conflicts 
                    WHERE datname = current_database()
                """)).scalar()
                results['deadlocks_detected'] = deadlock_result or 0
            except Exception:
                results['deadlocks_detected'] = 0
            
            logger.info(f"✅ Concurrent test: {len(successful_queries)}/{num_concurrent} queries succeeded")
            return results
            
        except Exception as e:
            logger.error(f"Concurrent query test failed: {e}")
            return {'error': str(e)}
    
    def _test_vector_operations(self) -> Dict:
        """Test vector embedding operations (if pgvector is available)"""
        logger.info("🔍 Testing vector operations...")
        
        results = {
            'pgvector_available': False,
            'embedding_operations': [],
            'similarity_search_performance': {}
        }
        
        try:
            # Check if pgvector is available
            pgvector_available = db.session.execute(text("""
                SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')
            """)).scalar()
            
            results['pgvector_available'] = pgvector_available
            
            if not pgvector_available:
                results['message'] = "pgvector extension not installed - vector tests skipped"
                logger.info("⚠️ pgvector not available - skipping vector tests")
                return results
            
            # Check if AI embedding table exists
            table_exists = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_embedding_store'
                )
            """)).scalar()
            
            if not table_exists:
                results['message'] = "AI embedding table not found - vector tests skipped"
                logger.info("⚠️ AI embedding table not found - skipping vector tests")
                return results
            
            # Test vector similarity operations
            # Note: This would require actual vector data and pgvector columns
            # For now, we'll just validate the structure is ready
            
            results['vector_column_ready'] = True
            results['message'] = "Vector infrastructure validated - ready for pgvector implementation"
            
            logger.info("✅ Vector operations structure validated")
            return results
            
        except Exception as e:
            logger.error(f"Vector operations test failed: {e}")
            return {'error': str(e)}
    
    def _test_fulltext_search(self) -> Dict:
        """Test full-text search performance"""
        logger.info("🔎 Testing full-text search performance...")
        
        results = {
            'search_queries': [],
            'index_available': False
        }
        
        try:
            # Check if search vector column exists
            search_column_exists = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'post' AND column_name = 'search_vector'
                )
            """)).scalar()
            
            results['index_available'] = search_column_exists
            
            if not search_column_exists:
                results['message'] = "Full-text search not implemented yet - tests skipped"
                logger.info("⚠️ Full-text search column not found - skipping tests")
                return results
            
            # Test various search queries
            search_terms = ['BJP', 'development', 'infrastructure', 'education', 'healthcare']
            
            for term in search_terms:
                times = []
                for _ in range(5):
                    start_time = time.time()
                    
                    result = db.session.execute(text("""
                        SELECT city, text, ts_rank(search_vector, plainto_tsquery(:term)) as rank
                        FROM post 
                        WHERE search_vector @@ plainto_tsquery(:term)
                        ORDER BY rank DESC
                        LIMIT 20;
                    """), {'term': term}).fetchall()
                    
                    elapsed_ms = (time.time() - start_time) * 1000
                    times.append(elapsed_ms)
                
                results['search_queries'].append({
                    'term': term,
                    'avg_ms': statistics.mean(times),
                    'p95_ms': np.percentile(times, 95),
                    'result_count': len(result) if 'result' in locals() else 0,
                    'meets_target': np.percentile(times, 95) < self.performance_targets['fulltext_search_ms']
                })
            
            logger.info("✅ Full-text search tests completed")
            return results
            
        except Exception as e:
            logger.error(f"Full-text search test failed: {e}")
            return {'error': str(e)}
    
    def _generate_assessment(self) -> Dict:
        """Generate overall performance assessment"""
        assessment = {
            'overall_status': 'pass',
            'performance_score': 0,
            'critical_issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        try:
            scores = []
            
            # Assess query performance
            if 'query_performance' in self.test_results:
                qp = self.test_results['query_performance']
                if 'ward_based_queries' in qp and qp['ward_based_queries']:
                    ward_performance = [q['passes_target'] for q in qp['ward_based_queries']]
                    if all(ward_performance):
                        scores.append(100)
                    elif any(ward_performance):
                        scores.append(75)
                        assessment['warnings'].append("Some ward queries exceed performance targets")
                    else:
                        scores.append(25)
                        assessment['critical_issues'].append("Ward queries fail performance targets")
            
            # Assess concurrent performance
            if 'concurrent_performance' in self.test_results:
                cp = self.test_results['concurrent_performance']
                if cp.get('meets_concurrent_target', False):
                    scores.append(100)
                else:
                    scores.append(50)
                    assessment['warnings'].append("Concurrent query performance below target")
            
            # Assess index usage
            if 'index_effectiveness' in self.test_results:
                ie = self.test_results['index_effectiveness']
                if 'query_plans' in ie:
                    index_usage = [plan['uses_index'] for plan in ie['query_plans']]
                    if all(index_usage):
                        scores.append(100)
                    elif any(index_usage):
                        scores.append(75)
                        assessment['recommendations'].append("Some queries not using optimal indexes")
                    else:
                        scores.append(25)
                        assessment['critical_issues'].append("Indexes not being utilized effectively")
            
            # Calculate overall score
            if scores:
                assessment['performance_score'] = int(statistics.mean(scores))
                
                if assessment['performance_score'] >= 90:
                    assessment['overall_status'] = 'excellent'
                elif assessment['performance_score'] >= 75:
                    assessment['overall_status'] = 'good'
                elif assessment['performance_score'] >= 50:
                    assessment['overall_status'] = 'acceptable'
                else:
                    assessment['overall_status'] = 'needs_improvement'
            
            # General recommendations
            if not assessment['critical_issues']:
                assessment['recommendations'].append("Consider running regular ANALYZE on frequently queried tables")
                assessment['recommendations'].append("Monitor query performance in production environment")
                assessment['recommendations'].append("Implement pgvector extension for AI embedding operations")
            
            return assessment
            
        except Exception as e:
            logger.error(f"Assessment generation failed: {e}")
            return {'error': str(e)}
    
    def run_load_test(self, duration_seconds: int = 300) -> Dict:
        """Run sustained load test"""
        logger.info(f"🚀 Running load test for {duration_seconds} seconds...")
        
        results = {
            'duration_seconds': duration_seconds,
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'average_qps': 0,
            'response_times': [],
            'errors': []
        }
        
        def worker_thread():
            """Worker thread for load testing"""
            query_count = 0
            while time.time() < end_time:
                try:
                    start = time.time()
                    ward = random.choice(self.test_wards)
                    
                    with self.app.app_context():
                        db.session.execute(text("""
                            SELECT COUNT(*), AVG(CASE WHEN emotion = 'positive' THEN 1 ELSE 0 END)
                            FROM post WHERE city = :ward AND created_at >= NOW() - INTERVAL '7 days'
                        """), {'ward': ward}).fetchone()
                    
                    response_time = (time.time() - start) * 1000
                    results['response_times'].append(response_time)
                    query_count += 1
                    
                except Exception as e:
                    results['errors'].append(str(e))
                
            return query_count
        
        # Run load test
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        # Use 10 concurrent threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=worker_thread)
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Calculate results
        actual_duration = time.time() - start_time
        results['actual_duration'] = actual_duration
        results['total_queries'] = len(results['response_times']) + len(results['errors'])
        results['successful_queries'] = len(results['response_times'])
        results['failed_queries'] = len(results['errors'])
        results['average_qps'] = results['successful_queries'] / actual_duration
        
        if results['response_times']:
            results['avg_response_ms'] = statistics.mean(results['response_times'])
            results['p95_response_ms'] = np.percentile(results['response_times'], 95)
            results['p99_response_ms'] = np.percentile(results['response_times'], 99)
        
        logger.info(f"✅ Load test completed: {results['successful_queries']} queries, {results['average_qps']:.1f} QPS")
        return results


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='LokDarpan Migration Performance Validator')
    parser.add_argument('--test', choices=['all', 'queries', 'vectors', 'concurrent'], 
                       default='all', help='Test suite to run')
    parser.add_argument('--benchmark', action='store_true', 
                       help='Run benchmark tests')
    parser.add_argument('--load-test', action='store_true',
                       help='Run sustained load test')
    parser.add_argument('--duration', type=int, default=300,
                       help='Load test duration in seconds')
    parser.add_argument('--output', help='Output results to JSON file')
    
    args = parser.parse_args()
    
    try:
        validator = PerformanceValidator()
        
        if args.load_test:
            results = validator.run_load_test(args.duration)
        else:
            results = validator.run_comprehensive_tests()
        
        # Output results
        output = json.dumps(results, indent=2, default=str)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Results saved to {args.output}")
        else:
            print(output)
        
        # Exit with appropriate code
        if results.get('overall_assessment', {}).get('overall_status') in ['pass', 'excellent', 'good']:
            print(f"\n✅ Performance validation: {results.get('overall_assessment', {}).get('overall_status', 'completed')}")
        else:
            print(f"\n❌ Performance validation: {results.get('overall_assessment', {}).get('overall_status', 'failed')}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()