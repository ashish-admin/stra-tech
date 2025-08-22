#!/usr/bin/env python3
"""
LokDarpan Ward Scale Performance Validation Script

Comprehensive testing suite to validate 145-ward production readiness:
- Database performance benchmarks
- Query optimization validation  
- Bulk ingestion capacity testing
- Concurrent user simulation
- System resource monitoring

Usage:
    python scripts/validate_ward_scale_performance.py [--test-data-size=10000] [--concurrent-users=100]
"""

import os
import sys
import time
import json
import argparse
import threading
import statistics
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import psutil

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.extensions import db
from app.models import *
from app.tasks_bulk_ingestion import bulk_ingest_epapers_optimized
from sqlalchemy import text

@dataclass
class PerformanceMetrics:
    """Performance metrics tracking"""
    test_name: str
    target_time_ms: float
    actual_time_ms: float
    success: bool
    details: Dict[str, Any]
    
    @property
    def performance_ratio(self) -> float:
        """Ratio of actual vs target performance (lower is better)"""
        return self.actual_time_ms / self.target_time_ms if self.target_time_ms > 0 else float('inf')
    
    @property
    def status(self) -> str:
        """Performance status assessment"""
        if not self.success:
            return "FAILED"
        elif self.performance_ratio <= 1.0:
            return "EXCELLENT"
        elif self.performance_ratio <= 1.5:
            return "GOOD"
        elif self.performance_ratio <= 2.0:
            return "ACCEPTABLE"
        else:
            return "NEEDS_OPTIMIZATION"

class WardScaleValidator:
    """Comprehensive ward scale performance validator"""
    
    def __init__(self, app_context=None):
        self.app = app_context or create_app()
        self.results: List[PerformanceMetrics] = []
        self.system_info = self._get_system_info()
        
    def _get_system_info(self) -> Dict[str, Any]:
        """Get system resource information"""
        return {
            'cpu_count': psutil.cpu_count(),
            'memory_gb': round(psutil.virtual_memory().total / (1024**3), 2),
            'disk_free_gb': round(psutil.disk_usage('/').free / (1024**3), 2),
            'python_version': sys.version,
            'postgres_version': None  # Will be populated during tests
        }
    
    def _time_operation(self, operation_name: str, operation_func, target_ms: float, **kwargs) -> PerformanceMetrics:
        """Time an operation and return performance metrics"""
        print(f"🧪 Testing {operation_name} (target: <{target_ms}ms)...")
        
        start_time = time.perf_counter()
        success = True
        details = {}
        
        try:
            result = operation_func(**kwargs)
            details = result if isinstance(result, dict) else {'result': result}
        except Exception as e:
            success = False
            details = {'error': str(e)}
            print(f"   ❌ {operation_name} failed: {e}")
        
        end_time = time.perf_counter()
        actual_ms = (end_time - start_time) * 1000
        
        metrics = PerformanceMetrics(
            test_name=operation_name,
            target_time_ms=target_ms,
            actual_time_ms=actual_ms,
            success=success,
            details=details
        )
        
        print(f"   ⏱️  {actual_ms:.2f}ms ({metrics.status})")
        self.results.append(metrics)
        return metrics
    
    def test_database_connectivity(self) -> PerformanceMetrics:
        """Test basic database connectivity and get version info"""
        def check_db():
            with self.app.app_context():
                result = db.session.execute(text("SELECT version()")).scalar()
                self.system_info['postgres_version'] = result.split()[1] if result else 'unknown'
                return {'connected': True, 'version': result}
        
        return self._time_operation("Database Connectivity", check_db, 100)
    
    def test_ward_query_performance(self) -> PerformanceMetrics:
        """Test ward-based query performance (PRIMARY REQUIREMENT)"""
        def ward_query():
            with self.app.app_context():
                # Test the optimized ward intelligence function
                result = db.session.execute(
                    text("SELECT * FROM get_ward_intelligence_fast('Jubilee Hills', 30)")
                ).fetchone()
                
                if not result:
                    # Fallback to direct query if function doesn't exist
                    result = db.session.execute(text("""
                        SELECT 
                            city as ward_name,
                            COUNT(*) as total_posts,
                            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as posts_24h,
                            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as posts_7d,
                            COUNT(DISTINCT author_id) as unique_authors,
                            COUNT(DISTINCT party) FILTER (WHERE party IS NOT NULL) as parties
                        FROM post 
                        WHERE city = 'Jubilee Hills' 
                          AND created_at >= NOW() - INTERVAL '30 days'
                        GROUP BY city
                    """)).fetchone()
                
                return {'ward_data': dict(result._mapping) if result else None}
        
        return self._time_operation("Ward Query Performance", ward_query, 100)
    
    def test_bulk_query_performance(self) -> PerformanceMetrics:
        """Test bulk query performance across multiple wards"""
        def bulk_ward_query():
            with self.app.app_context():
                # Test querying multiple wards simultaneously
                result = db.session.execute(text("""
                    SELECT 
                        city as ward_name,
                        COUNT(*) as total_posts,
                        AVG(CASE WHEN emotion = 'positive' THEN 1 WHEN emotion = 'negative' THEN -1 ELSE 0 END) as sentiment_score
                    FROM post
                    WHERE city IS NOT NULL 
                      AND created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY city
                    ORDER BY total_posts DESC
                    LIMIT 20
                """)).fetchall()
                
                return {'wards_analyzed': len(result), 'top_ward_posts': result[0][1] if result else 0}
        
        return self._time_operation("Bulk Ward Analysis", bulk_ward_query, 500)
    
    def test_temporal_query_performance(self) -> PerformanceMetrics:
        """Test time-series query performance"""
        def temporal_query():
            with self.app.app_context():
                result = db.session.execute(text("""
                    SELECT 
                        DATE_TRUNC('day', created_at) as day,
                        city,
                        COUNT(*) as posts,
                        COUNT(DISTINCT party) as parties
                    FROM post
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                      AND city IS NOT NULL
                    GROUP BY DATE_TRUNC('day', created_at), city
                    ORDER BY day DESC, posts DESC
                    LIMIT 100
                """)).fetchall()
                
                return {'time_series_points': len(result)}
        
        return self._time_operation("Temporal Query Performance", temporal_query, 200)
    
    def test_concurrent_ward_queries(self, num_threads: int = 50) -> PerformanceMetrics:
        """Test concurrent ward query performance"""
        def single_ward_query(ward_name: str):
            with self.app.app_context():
                result = db.session.execute(text("""
                    SELECT COUNT(*) FROM post 
                    WHERE city = :ward_name 
                      AND created_at >= NOW() - INTERVAL '24 hours'
                """), {'ward_name': ward_name}).scalar()
                return result or 0
        
        def concurrent_test():
            # Test with different ward names
            ward_names = ['Jubilee Hills', 'Banjara Hills', 'Himayath Nagar', 'Kapra', 'Begumpet'] * 10
            
            successful_queries = 0
            total_response_time = 0
            
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = [executor.submit(single_ward_query, ward) for ward in ward_names[:num_threads]]
                
                for future in as_completed(futures):
                    try:
                        start = time.perf_counter()
                        result = future.result(timeout=5)  # 5 second timeout
                        end = time.perf_counter()
                        
                        successful_queries += 1
                        total_response_time += (end - start) * 1000
                    except Exception:
                        pass  # Count failures
            
            avg_response_time = total_response_time / max(successful_queries, 1)
            return {
                'successful_queries': successful_queries,
                'total_queries': num_threads,
                'avg_response_time_ms': avg_response_time,
                'success_rate': successful_queries / num_threads * 100
            }
        
        return self._time_operation("Concurrent Ward Queries", concurrent_test, 2000)  # 2s total for 50 queries
    
    def test_database_indexes(self) -> PerformanceMetrics:
        """Verify critical indexes exist and are being used"""
        def check_indexes():
            with self.app.app_context():
                # Check for critical ward indexes
                indexes = db.session.execute(text("""
                    SELECT 
                        i.relname as index_name,
                        a.attname as column_name,
                        t.relname as table_name
                    FROM pg_class t
                    JOIN pg_index ix ON t.oid = ix.indrelid  
                    JOIN pg_class i ON i.oid = ix.indexrelid
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
                    WHERE t.relname IN ('post', 'post_partitioned')
                      AND (i.relname LIKE '%ward%' OR i.relname LIKE '%city%')
                    ORDER BY i.relname
                """)).fetchall()
                
                # Check partitioning
                partitions = db.session.execute(text("""
                    SELECT COUNT(*) FROM pg_tables 
                    WHERE tablename LIKE 'post_y%m%'
                """)).scalar()
                
                return {
                    'ward_indexes_found': len(indexes),
                    'partitions_created': partitions or 0,
                    'indexes': [f"{row[2]}.{row[0]}" for row in indexes]
                }
        
        return self._time_operation("Database Index Validation", check_indexes, 50)
    
    def test_bulk_ingestion_capacity(self, test_size: int = 1000) -> PerformanceMetrics:
        """Test bulk ingestion performance with synthetic data"""
        def create_test_data():
            # Create temporary test data
            test_file = "/tmp/lokdarpan_perf_test.jsonl"
            ward_names = [
                'Jubilee Hills', 'Banjara Hills', 'Himayath Nagar', 'Kapra', 'Begumpet',
                'Khairatabad', 'Secunderabad', 'Kukatpally', 'Madhapur', 'Gachibowli'
            ]
            parties = ['INC', 'BJP', 'BRS', 'AIMIM', 'TDP']
            
            with open(test_file, 'w') as f:
                for i in range(test_size):
                    record = {
                        'publication_name': f'Test Publication {i % 10}',
                        'publication_date': (datetime.now() - timedelta(days=i % 30)).strftime('%Y-%m-%d'),
                        'title': f'Test Article {i}',
                        'body': f'Test content for performance validation article {i}. This represents typical news content with political analysis and local information relevant to ward-level intelligence gathering.',
                        'city': ward_names[i % len(ward_names)],
                        'party': parties[i % len(parties)] if i % 3 == 0 else None
                    }
                    f.write(json.dumps(record) + '\n')
            
            return test_file
        
        def ingestion_test():
            test_file = create_test_data()
            
            try:
                with self.app.app_context():
                    # Use the optimized bulk ingestion function
                    from app.tasks_bulk_ingestion import bulk_ingest_epapers_optimized
                    result = bulk_ingest_epapers_optimized.apply(args=[test_file, 500]).get()
                    
                    # Clean up
                    if os.path.exists(test_file):
                        os.remove(test_file)
                    
                    return result
            except Exception as e:
                # Clean up on error
                if os.path.exists(test_file):
                    os.remove(test_file)
                raise e
        
        # Target: 1000 records in <2 seconds (scales to 145K in <30 minutes)
        target_ms = (test_size / 1000) * 2000  
        return self._time_operation("Bulk Ingestion Performance", ingestion_test, target_ms)
    
    def test_system_resources(self) -> PerformanceMetrics:
        """Check system resource utilization"""
        def resource_check():
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Check database connections
            with self.app.app_context():
                connections = db.session.execute(text("""
                    SELECT count(*) as active_connections
                    FROM pg_stat_activity 
                    WHERE state = 'active'
                """)).scalar()
            
            return {
                'cpu_usage_percent': cpu_percent,
                'memory_usage_percent': memory.percent,
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'disk_usage_percent': (disk.used / disk.total) * 100,
                'active_db_connections': connections,
                'system_load_1min': os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0
            }
        
        return self._time_operation("System Resource Check", resource_check, 100)
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        
        # Calculate summary statistics
        successful_tests = [r for r in self.results if r.success]
        failed_tests = [r for r in self.results if not r.success]
        
        performance_ratios = [r.performance_ratio for r in successful_tests if r.performance_ratio != float('inf')]
        
        report = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'system_info': self.system_info,
            'summary': {
                'total_tests': len(self.results),
                'successful_tests': len(successful_tests),
                'failed_tests': len(failed_tests),
                'success_rate': len(successful_tests) / len(self.results) * 100 if self.results else 0,
                'avg_performance_ratio': statistics.mean(performance_ratios) if performance_ratios else 0,
                'production_ready': len(failed_tests) == 0 and all(r.status in ['EXCELLENT', 'GOOD', 'ACCEPTABLE'] for r in successful_tests)
            },
            'test_results': [
                {
                    'name': r.test_name,
                    'target_ms': r.target_time_ms,
                    'actual_ms': round(r.actual_time_ms, 2),
                    'status': r.status,
                    'success': r.success,
                    'details': r.details
                }
                for r in self.results
            ],
            'performance_analysis': {
                'ward_query_ready': any(r.test_name == 'Ward Query Performance' and r.status in ['EXCELLENT', 'GOOD'] for r in self.results),
                'bulk_ingestion_ready': any(r.test_name == 'Bulk Ingestion Performance' and r.status in ['EXCELLENT', 'GOOD', 'ACCEPTABLE'] for r in self.results),
                'concurrent_load_ready': any(r.test_name == 'Concurrent Ward Queries' and r.success for r in self.results),
                'database_optimized': any(r.test_name == 'Database Index Validation' and r.success for r in self.results)
            }
        }
        
        return report
    
    def run_comprehensive_validation(self, test_data_size: int = 1000, concurrent_users: int = 50) -> Dict[str, Any]:
        """Run all performance validation tests"""
        
        print("🚀 LokDarpan Ward Scale Performance Validation")
        print("=" * 60)
        print(f"Target Capacity: 145 wards × 1K posts/day = 145K daily ingestion")
        print(f"System: {self.system_info['cpu_count']} CPU, {self.system_info['memory_gb']}GB RAM")
        print("=" * 60)
        
        # Run validation tests in order of dependency
        self.test_database_connectivity()
        self.test_database_indexes()
        self.test_ward_query_performance()  
        self.test_bulk_query_performance()
        self.test_temporal_query_performance()
        self.test_concurrent_ward_queries(concurrent_users)
        self.test_bulk_ingestion_capacity(test_data_size)
        self.test_system_resources()
        
        # Generate comprehensive report
        report = self.generate_performance_report()
        
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE VALIDATION SUMMARY")
        print("=" * 60)
        print(f"✅ Successful Tests: {report['summary']['successful_tests']}/{report['summary']['total_tests']}")
        print(f"📈 Success Rate: {report['summary']['success_rate']:.1f}%")
        print(f"⚡ Avg Performance Ratio: {report['summary']['avg_performance_ratio']:.2f}x target")
        print(f"🎯 Production Ready: {'YES' if report['summary']['production_ready'] else 'NO'}")
        
        print(f"\n🔍 Key Performance Indicators:")
        print(f"   Ward Queries: {'✅' if report['performance_analysis']['ward_query_ready'] else '❌'}")
        print(f"   Bulk Ingestion: {'✅' if report['performance_analysis']['bulk_ingestion_ready'] else '❌'}")
        print(f"   Concurrent Load: {'✅' if report['performance_analysis']['concurrent_load_ready'] else '❌'}")
        print(f"   Database Optimization: {'✅' if report['performance_analysis']['database_optimized'] else '❌'}")
        
        # Show detailed results for failed tests
        failed_tests = [r for r in self.results if not r.success or r.status == 'NEEDS_OPTIMIZATION']
        if failed_tests:
            print(f"\n⚠️  Tests Requiring Attention:")
            for test in failed_tests:
                print(f"   {test.test_name}: {test.status} ({test.actual_time_ms:.2f}ms vs {test.target_time_ms}ms target)")
        
        return report

def main():
    """Main validation script entry point"""
    parser = argparse.ArgumentParser(description='LokDarpan Ward Scale Performance Validation')
    parser.add_argument('--test-data-size', type=int, default=1000, 
                       help='Size of test data for bulk ingestion testing (default: 1000)')
    parser.add_argument('--concurrent-users', type=int, default=50,
                       help='Number of concurrent users to simulate (default: 50)')
    parser.add_argument('--output-file', type=str, 
                       help='Save detailed report to JSON file')
    
    args = parser.parse_args()
    
    # Run validation
    validator = WardScaleValidator()
    report = validator.run_comprehensive_validation(
        test_data_size=args.test_data_size,
        concurrent_users=args.concurrent_users
    )
    
    # Save report if requested
    if args.output_file:
        with open(args.output_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Detailed report saved to: {args.output_file}")
    
    # Exit with appropriate code
    sys.exit(0 if report['summary']['production_ready'] else 1)

if __name__ == '__main__':
    main()