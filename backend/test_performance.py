#!/usr/bin/env python
"""
Simple performance test for LokDarpan database queries
Tests current performance before applying optimizations
"""
import os
import time
import statistics
import psycopg2
from datetime import datetime, timezone, timedelta

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:amuktha@localhost/lokdarpan_db')

def test_ward_query_performance():
    """Test ward-based query performance"""
    print("🔍 Testing ward-based query performance...")
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    test_wards = ['Jubilee Hills', 'Begumpet', 'Khairatabad', 'Himayath Nagar', 'Gandhinagar']
    
    results = {}
    
    for ward in test_wards:
        times = []
        
        for _ in range(10):  # Run each query 10 times
            start_time = time.time()
            
            cursor.execute("""
                SELECT COUNT(*) as total_posts,
                       COUNT(DISTINCT author_id) as unique_authors,
                       COUNT(*) FILTER (WHERE emotion = 'positive') as positive_posts,
                       COUNT(*) FILTER (WHERE emotion = 'negative') as negative_posts,
                       COUNT(*) FILTER (WHERE party IS NOT NULL) as party_mentions
                FROM post 
                WHERE city = %s 
                  AND created_at >= NOW() - INTERVAL '30 days'
            """, (ward,))
            
            result = cursor.fetchone()
            elapsed_ms = (time.time() - start_time) * 1000
            times.append(elapsed_ms)
        
        avg_time = statistics.mean(times)
        p95_time = sorted(times)[int(len(times) * 0.95)]
        
        results[ward] = {
            'avg_ms': round(avg_time, 2),
            'p95_ms': round(p95_time, 2),
            'max_ms': round(max(times), 2),
            'min_ms': round(min(times), 2)
        }
        
        print(f"  {ward}: avg={avg_time:.1f}ms, p95={p95_time:.1f}ms, max={max(times):.1f}ms")
    
    conn.close()
    return results

def test_aggregation_queries():
    """Test aggregation query performance"""
    print("📊 Testing aggregation queries...")
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    queries = [
        {
            'name': 'daily_posts_last_30d',
            'sql': """
                SELECT DATE(created_at) as date, COUNT(*) as posts
                FROM post 
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """
        },
        {
            'name': 'party_mentions_by_ward',
            'sql': """
                SELECT city, party, COUNT(*) as mentions
                FROM post 
                WHERE party IS NOT NULL 
                  AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY city, party
                ORDER BY mentions DESC
                LIMIT 20
            """
        },
        {
            'name': 'emotion_analysis_all_wards',
            'sql': """
                SELECT 
                    city,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE emotion = 'positive') as positive,
                    COUNT(*) FILTER (WHERE emotion = 'negative') as negative,
                    COUNT(*) FILTER (WHERE emotion = 'neutral') as neutral
                FROM post 
                WHERE city IS NOT NULL 
                  AND emotion IS NOT NULL
                  AND created_at >= NOW() - INTERVAL '7 days'
                GROUP BY city
                ORDER BY total DESC
            """
        }
    ]
    
    results = {}
    
    for query in queries:
        times = []
        
        for _ in range(5):  # Run each query 5 times
            start_time = time.time()
            cursor.execute(query['sql'])
            rows = cursor.fetchall()
            elapsed_ms = (time.time() - start_time) * 1000
            times.append(elapsed_ms)
        
        avg_time = statistics.mean(times)
        results[query['name']] = {
            'avg_ms': round(avg_time, 2),
            'max_ms': round(max(times), 2),
            'rows_returned': len(rows) if 'rows' in locals() else 0
        }
        
        print(f"  {query['name']}: avg={avg_time:.1f}ms, max={max(times):.1f}ms, rows={len(rows) if 'rows' in locals() else 0}")
    
    conn.close()
    return results

def test_index_usage():
    """Check if indexes are being used efficiently"""
    print("📋 Testing index usage...")
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Test queries with EXPLAIN
    test_queries = [
        {
            'name': 'ward_filter',
            'sql': "EXPLAIN (FORMAT JSON) SELECT COUNT(*) FROM post WHERE city = 'Jubilee Hills'"
        },
        {
            'name': 'date_range',
            'sql': "EXPLAIN (FORMAT JSON) SELECT COUNT(*) FROM post WHERE created_at >= NOW() - INTERVAL '7 days'"
        },
        {
            'name': 'ward_and_date',
            'sql': "EXPLAIN (FORMAT JSON) SELECT COUNT(*) FROM post WHERE city = 'Begumpet' AND created_at >= NOW() - INTERVAL '7 days'"
        }
    ]
    
    results = {}
    
    for query in test_queries:
        cursor.execute(query['sql'])
        plan = cursor.fetchone()[0]
        
        # Simple analysis of query plan
        plan_str = str(plan).lower()
        uses_index = 'index' in plan_str and 'seq scan' not in plan_str
        
        results[query['name']] = {
            'uses_index': uses_index,
            'plan_summary': 'Index Scan' if uses_index else 'Sequential Scan'
        }
        
        print(f"  {query['name']}: {results[query['name']]['plan_summary']}")
    
    conn.close()
    return results

def check_database_stats():
    """Check database statistics and health"""
    print("📈 Checking database statistics...")
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    stats = {}
    
    # Table sizes
    cursor.execute("""
        SELECT 
            t.tablename,
            pg_size_pretty(pg_total_relation_size(t.tablename::regclass)) as size,
            s.n_live_tup as live_rows
        FROM pg_tables t
        JOIN pg_stat_user_tables s ON t.tablename = s.relname
        WHERE t.schemaname = 'public'
        ORDER BY pg_total_relation_size(t.tablename::regclass) DESC
        LIMIT 10;
    """)
    
    table_stats = cursor.fetchall()
    stats['largest_tables'] = [
        {
            'table': row[0],
            'size': row[1],
            'live_rows': row[2]
        }
        for row in table_stats
    ]
    
    print("  Largest tables:")
    for table in stats['largest_tables']:
        print(f"    {table['table']}: {table['size']} ({table['live_rows']} rows)")
    
    # Index usage
    cursor.execute("""
        SELECT 
            indexrelname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 10;
    """)
    
    index_stats = cursor.fetchall()
    stats['most_used_indexes'] = [
        {
            'index': row[0],
            'scans': row[1],
            'tuples_read': row[2]
        }
        for row in index_stats
    ]
    
    print("  Most used indexes:")
    for idx in stats['most_used_indexes']:
        print(f"    {idx['index']}: {idx['scans']} scans, {idx['tuples_read']} tuples")
    
    conn.close()
    return stats

def main():
    """Run performance tests"""
    print("🚀 LokDarpan Database Performance Analysis")
    print("=" * 50)
    
    try:
        # Test basic query performance
        ward_results = test_ward_query_performance()
        print()
        
        # Test aggregation performance
        agg_results = test_aggregation_queries()
        print()
        
        # Check index usage
        index_results = test_index_usage()
        print()
        
        # Database statistics
        db_stats = check_database_stats()
        print()
        
        # Summary
        print("📊 Performance Summary:")
        print("=" * 30)
        
        # Ward query analysis
        all_ward_times = []
        for ward, metrics in ward_results.items():
            all_ward_times.extend([metrics['avg_ms'], metrics['p95_ms']])
        
        avg_ward_performance = statistics.mean([m['avg_ms'] for m in ward_results.values()])
        p95_ward_performance = statistics.mean([m['p95_ms'] for m in ward_results.values()])
        
        print(f"Ward Queries - Avg: {avg_ward_performance:.1f}ms, P95: {p95_ward_performance:.1f}ms")
        
        # Performance assessment
        if p95_ward_performance < 100:
            print("✅ Ward query performance: EXCELLENT (< 100ms)")
        elif p95_ward_performance < 200:
            print("⚠️ Ward query performance: GOOD (< 200ms)")
        else:
            print("❌ Ward query performance: NEEDS IMPROVEMENT (> 200ms)")
        
        # Aggregation analysis
        avg_agg_performance = statistics.mean([m['avg_ms'] for m in agg_results.values()])
        print(f"Aggregation Queries - Avg: {avg_agg_performance:.1f}ms")
        
        if avg_agg_performance < 500:
            print("✅ Aggregation performance: GOOD (< 500ms)")
        else:
            print("⚠️ Aggregation performance: COULD BE IMPROVED (> 500ms)")
        
        # Index usage
        index_usage_count = sum(1 for r in index_results.values() if r['uses_index'])
        total_queries = len(index_results)
        index_usage_pct = (index_usage_count / total_queries) * 100
        
        print(f"Index Usage: {index_usage_count}/{total_queries} queries ({index_usage_pct:.0f}%)")
        
        if index_usage_pct >= 80:
            print("✅ Index usage: EXCELLENT")
        elif index_usage_pct >= 60:
            print("⚠️ Index usage: GOOD")
        else:
            print("❌ Index usage: NEEDS IMPROVEMENT - Consider adding indexes")
        
        print()
        print("🎯 Optimization Recommendations:")
        print("- Apply database migrations for AI infrastructure")
        print("- Add composite indexes for ward+date queries") 
        print("- Implement materialized views for dashboard queries")
        print("- Add full-text search capabilities")
        print("- Install pgvector extension for vector operations")
        
    except Exception as e:
        print(f"❌ Performance test failed: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())