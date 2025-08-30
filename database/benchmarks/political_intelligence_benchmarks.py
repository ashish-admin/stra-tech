#!/usr/bin/env python3
"""
LokDarpan Political Intelligence Performance Benchmarking Suite

This comprehensive benchmarking tool validates database performance against 
target SLAs for political intelligence queries, ensuring the system can handle
real-time political analysis workloads at scale.

Key Features:
- Statistical performance analysis with 95th percentile measurements
- Political intelligence query patterns (ward-centric, trends, competitive analysis)
- Automated performance regression detection
- Production-ready benchmark scenarios
- Comprehensive reporting with optimization recommendations

Usage:
    python political_intelligence_benchmarks.py --iterations 20 --output report.json
"""

import time
import statistics
import psycopg2
import json
import os
import argparse
import sys
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class BenchmarkResult:
    """Structured benchmark result with statistical analysis"""
    name: str
    query: str
    target_ms: float
    iterations: int
    avg_duration_ms: float
    p95_duration_ms: float
    min_duration_ms: float
    max_duration_ms: float
    std_deviation_ms: float
    performance_ratio: float
    status: str
    timestamp: str

class PoliticalIntelligenceBenchmark:
    """
    Comprehensive performance benchmarking for LokDarpan political intelligence queries.
    
    Validates system performance against established SLAs:
    - Ward Post Queries: <100ms (95th percentile)
    - Trends Aggregation: <200ms (95th percentile)
    - Competitive Analysis: <150ms (95th percentile)
    - AI Vector Search: <200ms (95th percentile)
    - Demographics Joins: <50ms (95th percentile)
    """
    
    def __init__(self, db_url: str, verbose: bool = True):
        self.db_url = db_url
        self.verbose = verbose
        self.connection = None
        
    def connect(self) -> None:
        """Establish database connection with optimized settings"""
        try:
            self.connection = psycopg2.connect(
                self.db_url,
                # Optimize connection for benchmarking
                connect_timeout=30,
                application_name="lokdarpan_benchmark"
            )
            self.connection.set_session(autocommit=True)
            
            if self.verbose:
                print("✅ Database connection established")
                
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            sys.exit(1)
    
    def benchmark_query(self, name: str, query: str, target_ms: float, 
                       iterations: int = 20) -> BenchmarkResult:
        """
        Benchmark a single query with comprehensive statistical analysis.
        
        Args:
            name: Descriptive name for the benchmark
            query: SQL query to benchmark
            target_ms: Target performance threshold in milliseconds
            iterations: Number of test iterations for statistical accuracy
            
        Returns:
            BenchmarkResult with detailed performance statistics
        """
        
        if self.verbose:
            print(f"🏃 Running benchmark: {name} ({iterations} iterations)")
        
        durations = []
        cursor = self.connection.cursor()
        
        try:
            # Warm up phase - prime caches and query plans
            for _ in range(3):
                cursor.execute(query)
                cursor.fetchall()
            
            # Actual benchmark phase
            for i in range(iterations):
                if self.verbose and (i + 1) % 5 == 0:
                    print(f"  Progress: {i + 1}/{iterations}")
                
                start_time = time.perf_counter()
                cursor.execute(query)
                cursor.fetchall()
                end_time = time.perf_counter()
                
                duration_ms = (end_time - start_time) * 1000
                durations.append(duration_ms)
            
            # Statistical analysis
            avg_duration = statistics.mean(durations)
            p95_duration = statistics.quantiles(durations, n=20)[18]  # 95th percentile
            min_duration = min(durations)
            max_duration = max(durations)
            std_deviation = statistics.stdev(durations) if len(durations) > 1 else 0
            
            # Performance assessment
            status = 'PASS' if p95_duration <= target_ms else 'FAIL'
            performance_ratio = p95_duration / target_ms
            
            return BenchmarkResult(
                name=name,
                query=query[:100] + '...' if len(query) > 100 else query,
                target_ms=target_ms,
                iterations=iterations,
                avg_duration_ms=round(avg_duration, 2),
                p95_duration_ms=round(p95_duration, 2),
                min_duration_ms=round(min_duration, 2),
                max_duration_ms=round(max_duration, 2),
                std_deviation_ms=round(std_deviation, 2),
                performance_ratio=round(performance_ratio, 2),
                status=status,
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
        except Exception as e:
            print(f"❌ Benchmark failed for {name}: {e}")
            return BenchmarkResult(
                name=name,
                query=query[:100] + '...' if len(query) > 100 else query,
                target_ms=target_ms,
                iterations=0,
                avg_duration_ms=-1,
                p95_duration_ms=-1,
                min_duration_ms=-1,
                max_duration_ms=-1,
                std_deviation_ms=-1,
                performance_ratio=-1,
                status='ERROR',
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
        finally:
            cursor.close()
    
    def get_benchmark_suite(self) -> List[Dict]:
        """
        Define comprehensive benchmark suite for political intelligence queries.
        
        Returns:
            List of benchmark configurations covering all critical query patterns
        """
        
        return [
            {
                'name': 'Ward Post Count Query',
                'description': 'Core ward-centric post counting for dashboard metrics',
                'query': """
                    SELECT COUNT(*) 
                    FROM post 
                    WHERE city = 'Jubilee Hills' 
                    AND created_at >= NOW() - INTERVAL '30 days'
                """,
                'target_ms': 100.0,
                'category': 'core_metrics'
            },
            {
                'name': 'Trends Time Series Aggregation',
                'description': 'Time-series emotion trends for political sentiment analysis',
                'query': """
                    SELECT 
                        DATE_TRUNC('day', created_at) as date,
                        emotion,
                        COUNT(*) as count,
                        AVG(CASE WHEN emotion IN ('Pride', 'Positive', 'Admiration', 'Hopeful') 
                            THEN 1 ELSE 0 END) as sentiment_score
                    FROM post 
                    WHERE city = 'Jubilee Hills'
                    AND created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY DATE_TRUNC('day', created_at), emotion
                    ORDER BY date DESC
                    LIMIT 50
                """,
                'target_ms': 200.0,
                'category': 'analytics'
            },
            {
                'name': 'Competitive Analysis Query',
                'description': 'Multi-party competitive analysis with sentiment scoring',
                'query': """
                    SELECT 
                        COALESCE(p.party, a.party, 'Independent') as party,
                        COUNT(*) as mentions,
                        AVG(CASE WHEN emotion IN ('Pride', 'Positive', 'Admiration', 'Hopeful') 
                            THEN 1 ELSE 0 END) as positive_ratio,
                        COUNT(DISTINCT p.author_id) as unique_authors,
                        MAX(p.created_at) as latest_mention
                    FROM post p
                    LEFT JOIN author a ON p.author_id = a.id
                    WHERE p.city = 'Jubilee Hills'
                    AND p.created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY COALESCE(p.party, a.party, 'Independent')
                    HAVING COUNT(*) >= 5
                    ORDER BY mentions DESC
                """,
                'target_ms': 150.0,
                'category': 'competitive_intelligence'
            },
            {
                'name': 'Ward Demographics Comprehensive Join',
                'description': 'Complete ward intelligence profile aggregation',
                'query': """
                    SELECT 
                        wp.ward_id,
                        wp.turnout_pct,
                        wp.last_winner_party,
                        wd.literacy_idx,
                        wd.muslim_idx,
                        wd.scst_idx,
                        wf.aci_23,
                        wf.as23_party_shares,
                        wf.ls24_party_shares,
                        wf.dvi
                    FROM ward_profile wp
                    JOIN ward_demographics wd ON wp.ward_id = wd.ward_id
                    JOIN ward_features wf ON wp.ward_id = wf.ward_id
                    WHERE wp.ward_id IN ('Jubilee Hills', 'Kapra', 'Banjara Hills', 'Khairatabad', 'Begumpet')
                    ORDER BY wp.turnout_pct DESC
                """,
                'target_ms': 50.0,
                'category': 'demographic_analysis'
            },
            {
                'name': 'AI Embedding Context Search',
                'description': 'Vector-based political content retrieval for AI analysis',
                'query': """
                    SELECT 
                        content_chunk,
                        ward_context,
                        political_relevance_score,
                        credibility_score,
                        source_type,
                        published_at
                    FROM embedding_store
                    WHERE ward_context = 'Jubilee Hills'
                    AND political_relevance_score > 0.7
                    AND credibility_score > 0.6
                    ORDER BY credibility_score DESC, political_relevance_score DESC
                    LIMIT 10
                """,
                'target_ms': 200.0,
                'category': 'ai_retrieval'
            },
            {
                'name': 'Multi-Ward Comparative Analysis',
                'description': 'Cross-ward comparative intelligence for strategic planning',
                'query': """
                    SELECT 
                        city,
                        COUNT(*) as total_posts,
                        COUNT(DISTINCT COALESCE(party, 'Independent')) as parties_mentioned,
                        AVG(CASE WHEN emotion IN ('Pride', 'Positive', 'Admiration', 'Hopeful') 
                            THEN 1 ELSE 0 END) as sentiment_score,
                        COUNT(DISTINCT author_id) as unique_voices,
                        MIN(created_at) as earliest_post,
                        MAX(created_at) as latest_post
                    FROM post
                    WHERE city IN ('Jubilee Hills', 'Kapra', 'Banjara Hills', 'Khairatabad', 
                                  'Begumpet', 'Gandhinagar', 'Himayath Nagar')
                    AND created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY city
                    HAVING COUNT(*) >= 10
                    ORDER BY total_posts DESC
                """,
                'target_ms': 250.0,
                'category': 'strategic_analysis'
            },
            {
                'name': 'Alert Generation Query',
                'description': 'Real-time alert generation based on political activity patterns',
                'query': """
                    SELECT 
                        ward,
                        COUNT(*) as alert_count,
                        severity,
                        MAX(created_at) as latest_alert,
                        STRING_AGG(DISTINCT description, '; ') as alert_summary
                    FROM alert
                    WHERE ward = 'Jubilee Hills'
                    AND created_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY ward, severity
                    ORDER BY 
                        CASE severity 
                            WHEN 'High' THEN 1 
                            WHEN 'Medium' THEN 2 
                            ELSE 3 
                        END,
                        latest_alert DESC
                """,
                'target_ms': 100.0,
                'category': 'real_time_monitoring'
            },
            {
                'name': 'Complex Political Trend Analysis',
                'description': 'Advanced trend analysis with temporal patterns and correlations',
                'query': """
                    WITH daily_metrics AS (
                        SELECT 
                            DATE_TRUNC('day', created_at) as date,
                            city,
                            COUNT(*) as post_count,
                            AVG(CASE WHEN emotion IN ('Pride', 'Positive', 'Admiration', 'Hopeful') 
                                THEN 1 ELSE 0 END) as sentiment_avg,
                            COUNT(DISTINCT party) as party_diversity
                        FROM post
                        WHERE city IN ('Jubilee Hills', 'Kapra', 'Banjara Hills')
                        AND created_at >= NOW() - INTERVAL '14 days'
                        GROUP BY DATE_TRUNC('day', created_at), city
                    )
                    SELECT 
                        date,
                        city,
                        post_count,
                        sentiment_avg,
                        party_diversity,
                        LAG(sentiment_avg) OVER (PARTITION BY city ORDER BY date) as prev_sentiment,
                        sentiment_avg - LAG(sentiment_avg) OVER (PARTITION BY city ORDER BY date) as sentiment_change
                    FROM daily_metrics
                    WHERE post_count >= 5
                    ORDER BY date DESC, city
                    LIMIT 50
                """,
                'target_ms': 300.0,
                'category': 'advanced_analytics'
            }
        ]
    
    def run_comprehensive_benchmarks(self, iterations: int = 20) -> List[BenchmarkResult]:
        """
        Execute comprehensive benchmark suite for political intelligence queries.
        
        Args:
            iterations: Number of iterations per benchmark for statistical accuracy
            
        Returns:
            List of BenchmarkResult objects with detailed performance metrics
        """
        
        benchmark_suite = self.get_benchmark_suite()
        results = []
        
        self.connect()
        
        if self.verbose:
            print(f"🚀 Starting LokDarpan Political Intelligence Benchmarks")
            print(f"📊 Running {len(benchmark_suite)} benchmarks with {iterations} iterations each")
            print("=" * 80)
        
        try:
            for i, benchmark in enumerate(benchmark_suite, 1):
                if self.verbose:
                    print(f"\n[{i}/{len(benchmark_suite)}] {benchmark['name']}")
                    print(f"Category: {benchmark['category']}")
                    print(f"Target: {benchmark['target_ms']}ms (95th percentile)")
                
                result = self.benchmark_query(
                    benchmark['name'],
                    benchmark['query'],
                    benchmark['target_ms'],
                    iterations
                )
                
                results.append(result)
                
                # Print immediate result
                if result.status == 'PASS':
                    status_indicator = "✅ PASS"
                elif result.status == 'FAIL':
                    status_indicator = "❌ FAIL" 
                else:
                    status_indicator = "⚠️ ERROR"
                
                if self.verbose:
                    print(f"{status_indicator} - {result.p95_duration_ms}ms "
                          f"(ratio: {result.performance_ratio}x)")
                
        finally:
            if self.connection:
                self.connection.close()
        
        return results
    
    def generate_performance_report(self, results: List[BenchmarkResult]) -> Dict:
        """
        Generate comprehensive performance analysis report.
        
        Args:
            results: List of benchmark results to analyze
            
        Returns:
            Dictionary containing detailed performance report with recommendations
        """
        
        passed = [r for r in results if r.status == 'PASS']
        failed = [r for r in results if r.status == 'FAIL']
        errors = [r for r in results if r.status == 'ERROR']
        
        overall_score = len(passed) / len(results) * 100 if results else 0
        overall_status = 'PASS' if len(failed) == 0 and len(errors) == 0 else 'FAIL'
        
        # Performance statistics (excluding errors)
        valid_results = [r for r in results if r.status in ['PASS', 'FAIL']]
        
        if valid_results:
            avg_performance_ratio = statistics.mean([r.performance_ratio for r in valid_results])
            worst_performing = max(valid_results, key=lambda x: x.performance_ratio)
            best_performing = min(valid_results, key=lambda x: x.performance_ratio)
        else:
            avg_performance_ratio = -1
            worst_performing = None
            best_performing = None
        
        # Category analysis
        category_analysis = {}
        for result in valid_results:
            # Find category from benchmark suite
            suite_item = next((b for b in self.get_benchmark_suite() if b['name'] == result.name), None)
            category = suite_item['category'] if suite_item else 'unknown'
            
            if category not in category_analysis:
                category_analysis[category] = {
                    'total': 0,
                    'passed': 0,
                    'avg_performance_ratio': []
                }
            
            category_analysis[category]['total'] += 1
            if result.status == 'PASS':
                category_analysis[category]['passed'] += 1
            category_analysis[category]['avg_performance_ratio'].append(result.performance_ratio)
        
        # Calculate category statistics
        for category in category_analysis:
            ratios = category_analysis[category]['avg_performance_ratio']
            category_analysis[category]['avg_performance_ratio'] = round(statistics.mean(ratios), 2)
            category_analysis[category]['pass_rate'] = round(
                (category_analysis[category]['passed'] / category_analysis[category]['total']) * 100, 1
            )
        
        report = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'overall_status': overall_status,
            'overall_score': round(overall_score, 1),
            'summary': {
                'total_tests': len(results),
                'passed': len(passed),
                'failed': len(failed),
                'errors': len(errors),
                'avg_performance_ratio': round(avg_performance_ratio, 2) if avg_performance_ratio > 0 else None
            },
            'performance_analysis': {
                'best_performing': {
                    'name': best_performing.name if best_performing else None,
                    'ratio': best_performing.performance_ratio if best_performing else None,
                    'duration_ms': best_performing.p95_duration_ms if best_performing else None
                } if best_performing else None,
                'worst_performing': {
                    'name': worst_performing.name if worst_performing else None,
                    'ratio': worst_performing.performance_ratio if worst_performing else None,
                    'duration_ms': worst_performing.p95_duration_ms if worst_performing else None
                } if worst_performing else None
            },
            'category_analysis': category_analysis,
            'detailed_results': [
                {
                    'name': r.name,
                    'target_ms': r.target_ms,
                    'p95_duration_ms': r.p95_duration_ms,
                    'performance_ratio': r.performance_ratio,
                    'status': r.status,
                    'iterations': r.iterations,
                    'avg_duration_ms': r.avg_duration_ms,
                    'std_deviation_ms': r.std_deviation_ms
                }
                for r in results
            ],
            'recommendations': self._generate_recommendations(results)
        }
        
        return report
    
    def _generate_recommendations(self, results: List[BenchmarkResult]) -> List[str]:
        """Generate specific performance optimization recommendations"""
        
        recommendations = []
        
        # Analyze failed benchmarks
        failed = [r for r in results if r.status == 'FAIL']
        if failed:
            recommendations.append(
                f"⚠️ {len(failed)} benchmark(s) failed performance targets. "
                "Priority areas for optimization:"
            )
            
            for result in failed:
                recommendations.append(
                    f"  • {result.name}: {result.p95_duration_ms}ms "
                    f"(target: {result.target_ms}ms, ratio: {result.performance_ratio}x)"
                )
        
        # Analyze high variance results
        high_variance = [r for r in results 
                        if r.status in ['PASS', 'FAIL'] and 
                           r.std_deviation_ms > r.avg_duration_ms * 0.5]
        
        if high_variance:
            recommendations.append(
                f"📊 {len(high_variance)} query(ies) show high performance variance. "
                "Consider connection pooling and query plan stability improvements."
            )
        
        # Category-specific recommendations
        ward_queries = [r for r in results if 'Ward' in r.name and r.performance_ratio > 1.2]
        if ward_queries:
            recommendations.append(
                "🏛️ Ward-based queries underperforming. Verify idx_post_city_btree index usage."
            )
        
        join_queries = [r for r in results if 'Join' in r.name and r.performance_ratio > 1.5]
        if join_queries:
            recommendations.append(
                "🔗 Join query performance issues detected. Review foreign key indexes and join selectivity."
            )
        
        aggregation_queries = [r for r in results if 'Aggregation' in r.name and r.performance_ratio > 1.3]
        if aggregation_queries:
            recommendations.append(
                "📈 Aggregation queries slow. Consider materialized views for frequent aggregations."
            )
        
        ai_queries = [r for r in results if 'AI' in r.name or 'Embedding' in r.name and r.performance_ratio > 1.4]
        if ai_queries:
            recommendations.append(
                "🤖 AI/Vector queries underperforming. Verify pgvector HNSW index configuration."
            )
        
        # Overall system recommendations
        avg_ratio = statistics.mean([r.performance_ratio for r in results if r.status in ['PASS', 'FAIL']])
        if avg_ratio > 0.8:
            recommendations.append(
                "⚡ Overall performance approaching limits. Consider scaling preparation for Phase 2."
            )
        
        if not recommendations:
            recommendations.append("🎉 All performance targets met! System optimized for political intelligence workloads.")
        
        return recommendations

def main():
    """CLI interface for political intelligence benchmarking"""
    
    parser = argparse.ArgumentParser(
        description='LokDarpan Political Intelligence Performance Benchmarking Suite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python political_intelligence_benchmarks.py
  python political_intelligence_benchmarks.py --iterations 50 --output detailed_report.json
  python political_intelligence_benchmarks.py --quiet --output /tmp/perf_report.json
        """
    )
    
    parser.add_argument(
        '--output', '-o', 
        help='Output file for detailed results (JSON format)',
        type=str
    )
    
    parser.add_argument(
        '--iterations', '-i', 
        type=int, 
        default=20, 
        help='Number of iterations per benchmark (default: 20)'
    )
    
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Suppress verbose output'
    )
    
    parser.add_argument(
        '--db-url',
        help='Database URL (overrides DATABASE_URL env var)',
        type=str
    )
    
    args = parser.parse_args()
    
    # Get database URL
    db_url = args.db_url or os.environ.get('DATABASE_URL')
    if not db_url:
        print("❌ ERROR: Database URL not provided")
        print("Set DATABASE_URL environment variable or use --db-url option")
        sys.exit(1)
    
    # Initialize benchmark suite
    benchmark = PoliticalIntelligenceBenchmark(db_url, verbose=not args.quiet)
    
    if not args.quiet:
        print("🚀 LokDarpan Political Intelligence Performance Benchmarking Suite")
        print("=" * 80)
        print(f"Database: {db_url.split('@')[1] if '@' in db_url else 'localhost'}")
        print(f"Iterations per benchmark: {args.iterations}")
        print()
    
    try:
        # Run benchmarks
        results = benchmark.run_comprehensive_benchmarks(args.iterations)
        
        # Generate report
        report = benchmark.generate_performance_report(results)
        
        # Display summary
        if not args.quiet:
            print("\n" + "=" * 80)
            print("📊 BENCHMARK RESULTS SUMMARY")
            print("=" * 80)
            print(f"Overall Status: {report['overall_status']}")
            print(f"Performance Score: {report['overall_score']:.1f}%")
            print(f"Tests Passed: {report['summary']['passed']}/{report['summary']['total_tests']}")
            
            if report['summary']['avg_performance_ratio']:
                print(f"Average Performance Ratio: {report['summary']['avg_performance_ratio']:.2f}x")
            
            print(f"Failed Tests: {report['summary']['failed']}")
            print(f"Error Tests: {report['summary']['errors']}")
            
            print("\n📋 OPTIMIZATION RECOMMENDATIONS:")
            for rec in report['recommendations']:
                print(f"{rec}")
        
        # Save detailed report if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            
            if not args.quiet:
                print(f"\n💾 Detailed report saved to: {args.output}")
        
        # Exit with appropriate code
        sys.exit(0 if report['overall_status'] == 'PASS' else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️ Benchmark interrupted by user")
        sys.exit(130)
        
    except Exception as e:
        print(f"\n❌ Benchmark failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()