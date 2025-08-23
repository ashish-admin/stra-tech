#!/usr/bin/env python3
"""
Performance Optimization Script for LokDarpan Political Intelligence Platform

This script implements database performance optimizations to achieve:
- Ward intelligence access: <3 seconds
- Real-time alerts: <15 second latency
- Crisis response coordination: <15 minutes
- Mobile-first architecture with offline capabilities

Usage:
    python scripts/performance_optimization.py [--apply] [--validate]
"""

import os
import sys
import time
import psutil
import argparse
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine


class PerformanceOptimizer:
    """Comprehensive database performance optimization for political intelligence workloads."""
    
    def __init__(self, app):
        self.app = app
        self.db = db
        self.engine: Engine = db.engine
        
    def analyze_current_performance(self) -> Dict:
        """Analyze current database performance metrics."""
        print("🔍 Analyzing current database performance...")
        
        metrics = {
            'timestamp': datetime.now(timezone.utc),
            'connection_stats': self._get_connection_stats(),
            'query_performance': self._analyze_query_performance(),
            'index_usage': self._analyze_index_usage(),
            'table_sizes': self._get_table_sizes(),
            'cache_hit_ratio': self._get_cache_hit_ratio()
        }
        
        return metrics
    
    def optimize_ward_queries(self) -> None:
        """Optimize ward-based queries for <3 second response times."""
        print("⚡ Optimizing ward-based queries...")
        
        # Strategic indexes for ward-centric operations
        ward_indexes = [
            # Sentiment time series optimization
            ("ward_sentiment_timeseries", ["ward_id", "timestamp DESC"]),
            ("ward_sentiment_timeseries", ["ward_id", "dominant_emotion", "timestamp DESC"]),
            
            # Alert system optimization
            ("alert", ["ward", "severity", "created_at DESC"]),
            ("alert", ["ward", "status", "priority_score DESC"]),
            
            # Issue tracking optimization
            ("issue_tracker", ["ward_id", "severity_level", "last_activity DESC"]),
            ("issue_tracker", ["issue_category", "resolution_status", "last_activity DESC"]),
            
            # Crisis response optimization
            ("crisis_event", ["geographic_scope"], {"using": "gin"}),  # GIN index for JSON queries
            ("response_workflow", ["crisis_id", "status", "priority_level"]),
            
            # Demographic intelligence optimization
            ("voter_segment", ["ward_id", "segment_type", "engagement_level"]),
            ("engagement_pattern", ["ward_id", "time_period", "period_start DESC"]),
            ("service_gap_analysis", ["ward_id", "gap_severity", "citizen_demand_level"]),
            
            # Performance-critical composite indexes
            ("geopolitical_report", ["ward_context", "status", "requested_at DESC"]),
            ("embedding_store", ["ward_context", "source_type", "created_at DESC"]),
        ]
        
        for table, columns, *options in ward_indexes:
            self._create_performance_index(table, columns, options[0] if options else {})
    
    def optimize_time_series_queries(self) -> None:
        """Optimize time-series data access patterns."""
        print("📊 Optimizing time-series data access...")
        
        # Partition time-series tables by month for performance
        partitioning_sql = """
        -- Create partitioned sentiment time series
        CREATE TABLE IF NOT EXISTS ward_sentiment_timeseries_partitioned (
            LIKE ward_sentiment_timeseries INCLUDING ALL
        ) PARTITION BY RANGE (timestamp);
        
        -- Create monthly partitions for current and next 12 months
        DO $$
        DECLARE
            start_date DATE;
            end_date DATE;
            partition_name TEXT;
        BEGIN
            FOR i IN 0..12 LOOP
                start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
                end_date := start_date + '1 month'::INTERVAL;
                partition_name := 'ward_sentiment_' || to_char(start_date, 'YYYY_MM');
                
                EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I 
                    PARTITION OF ward_sentiment_timeseries_partitioned
                    FOR VALUES FROM (%L) TO (%L)',
                    partition_name, start_date, end_date);
            END LOOP;
        END $$;
        """
        
        try:
            self.db.session.execute(text(partitioning_sql))
            self.db.session.commit()
            print("✅ Time-series partitioning configured")
        except Exception as e:
            print(f"⚠️ Partitioning setup: {e}")
            self.db.session.rollback()
    
    def optimize_json_queries(self) -> None:
        """Optimize JSON field queries for political intelligence data."""
        print("🔧 Optimizing JSON field performance...")
        
        json_indexes = [
            # Demographic data optimization
            ("ward_demographics", "gin", "(data_sources)"),
            ("ward_features", "gin", "(as23_party_shares)"),
            ("ward_features", "gin", "(ls24_party_shares)"),
            
            # Crisis response optimization
            ("crisis_event", "gin", "(geographic_scope)"),
            ("crisis_event", "gin", "(stakeholders_involved)"),
            
            # AI system optimization
            ("geopolitical_report", "gin", "(key_findings)"),
            ("geopolitical_report", "gin", "(source_urls)"),
            
            # Knowledge base optimization
            ("knowledge_base", "gin", "(tags)"),
            ("knowledge_base", "gin", "(ward_relevance)"),
            
            # Talking points optimization
            ("talking_points_generation", "gin", "(generated_content)"),
            ("campaign_position", "gin", "(key_messages)"),
        ]
        
        for table, index_type, expression in json_indexes:
            self._create_json_index(table, index_type, expression)
    
    def configure_connection_pooling(self) -> None:
        """Configure optimal connection pooling for high-traffic periods."""
        print("🔗 Configuring connection pooling...")
        
        # Calculate optimal pool size based on system resources
        cpu_count = psutil.cpu_count()
        memory_gb = psutil.virtual_memory().total / (1024**3)
        
        # Conservative pool sizing for political intelligence workloads
        pool_size = min(max(cpu_count * 2, 10), 20)
        max_overflow = min(pool_size * 2, 40)
        
        pool_config = f"""
        # Recommended PostgreSQL connection pool configuration
        # Add to your DATABASE_URL or connection string:
        
        pool_size={pool_size}
        max_overflow={max_overflow}
        pool_timeout=30
        pool_recycle=3600
        pool_pre_ping=True
        
        # PostgreSQL configuration recommendations:
        # max_connections = {pool_size + max_overflow + 10}
        # shared_buffers = {int(memory_gb * 0.25)}GB
        # effective_cache_size = {int(memory_gb * 0.75)}GB
        # work_mem = {max(int((memory_gb * 1024) / pool_size), 4)}MB
        """
        
        print(pool_config)
        
        # Save configuration to file
        with open('config/database_optimization.conf', 'w') as f:
            f.write(pool_config)
    
    def optimize_analytics_queries(self) -> None:
        """Create materialized views for expensive analytics queries."""
        print("📈 Creating materialized views for analytics...")
        
        materialized_views = [
            # Ward intelligence summary
            ("ward_intelligence_summary", """
                SELECT 
                    wp.ward_id,
                    wp.electors,
                    wp.turnout_pct,
                    wp.last_winner_party,
                    wd.literacy_idx,
                    wd.muslim_idx,
                    wd.scst_idx,
                    wf.turnout_volatility,
                    COUNT(DISTINCT a.id) as active_alerts,
                    COUNT(DISTINCT ce.id) as active_crises,
                    AVG(wmi.political_temperature) as political_temperature,
                    MAX(wst.timestamp) as last_sentiment_update
                FROM ward_profile wp
                LEFT JOIN ward_demographics wd ON wp.ward_id = wd.ward_id
                LEFT JOIN ward_features wf ON wp.ward_id = wf.ward_id
                LEFT JOIN alert a ON a.ward = wp.ward_id AND a.status = 'active'
                LEFT JOIN crisis_event ce ON ce.geographic_scope::jsonb ? wp.ward_id AND ce.current_status = 'active'
                LEFT JOIN ward_momentum_indicators wmi ON wp.ward_id = wmi.ward_id
                LEFT JOIN ward_sentiment_timeseries wst ON wp.ward_id = wst.ward_id
                GROUP BY wp.ward_id, wp.electors, wp.turnout_pct, wp.last_winner_party,
                         wd.literacy_idx, wd.muslim_idx, wd.scst_idx, wf.turnout_volatility
            """),
            
            # Crisis response performance summary
            ("crisis_response_summary", """
                SELECT 
                    DATE_TRUNC('day', ce.detected_at) as crisis_date,
                    ce.crisis_type,
                    ce.severity_level,
                    COUNT(*) as crisis_count,
                    AVG(EXTRACT(EPOCH FROM (ce.first_response_at - ce.detected_at))/60) as avg_response_time_minutes,
                    COUNT(CASE WHEN ce.current_status = 'resolved' THEN 1 END) as resolved_count,
                    AVG(CASE WHEN ce.resolved_at IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ce.resolved_at - ce.detected_at))/3600 END) as avg_resolution_time_hours
                FROM crisis_event ce
                WHERE ce.detected_at >= CURRENT_DATE - INTERVAL '90 days'
                GROUP BY DATE_TRUNC('day', ce.detected_at), ce.crisis_type, ce.severity_level
            """),
            
            # Sentiment trend analysis
            ("sentiment_trend_summary", """
                SELECT 
                    wst.ward_id,
                    DATE_TRUNC('hour', wst.timestamp) as hour_bucket,
                    wst.dominant_emotion,
                    AVG(wst.confidence_score) as avg_confidence,
                    SUM(wst.sample_size) as total_samples,
                    AVG((wst.sentiment_scores->>'joy')::float) as avg_joy,
                    AVG((wst.sentiment_scores->>'anger')::float) as avg_anger,
                    AVG((wst.sentiment_scores->>'fear')::float) as avg_fear,
                    AVG((wst.sentiment_scores->>'trust')::float) as avg_trust
                FROM ward_sentiment_timeseries wst
                WHERE wst.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                GROUP BY wst.ward_id, DATE_TRUNC('hour', wst.timestamp), wst.dominant_emotion
            """)
        ]
        
        for view_name, query in materialized_views:
            self._create_materialized_view(view_name, query)
    
    def validate_performance_targets(self) -> Dict:
        """Validate that performance targets are being met."""
        print("🎯 Validating performance targets...")
        
        results = {}
        
        # Test ward intelligence query performance (<3 seconds)
        start_time = time.time()
        self.db.session.execute(text("""
            SELECT ward_id, political_temperature, last_sentiment_update
            FROM ward_intelligence_summary 
            WHERE ward_id IN ('Jubilee Hills', 'Banjara Hills', 'Madhapur')
        """))
        ward_query_time = time.time() - start_time
        results['ward_query_time'] = ward_query_time
        results['ward_query_target_met'] = ward_query_time < 3.0
        
        # Test crisis response query performance (<15 seconds)
        start_time = time.time()
        self.db.session.execute(text("""
            SELECT ce.*, rw.workflow_name, rw.status as workflow_status
            FROM crisis_event ce
            LEFT JOIN response_workflow rw ON ce.crisis_id = rw.crisis_id
            WHERE ce.current_status = 'active'
            ORDER BY ce.severity_level DESC, ce.detected_at DESC
            LIMIT 10
        """))
        crisis_query_time = time.time() - start_time
        results['crisis_query_time'] = crisis_query_time
        results['crisis_query_target_met'] = crisis_query_time < 15.0
        
        # Test alert system performance
        start_time = time.time()
        self.db.session.execute(text("""
            SELECT ward, COUNT(*) as alert_count, MAX(priority_score) as max_priority
            FROM alert 
            WHERE status = 'active' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            GROUP BY ward
            ORDER BY max_priority DESC
        """))
        alert_query_time = time.time() - start_time
        results['alert_query_time'] = alert_query_time
        results['alert_query_target_met'] = alert_query_time < 1.0
        
        return results
    
    def _create_performance_index(self, table: str, columns: List[str], options: Dict = None) -> None:
        """Create a performance-optimized index."""
        options = options or {}
        
        # Generate index name
        column_str = "_".join(columns).replace(" DESC", "_desc").replace(" ASC", "_asc")
        index_name = f"ix_perf_{table}_{column_str}"
        
        # Build index SQL
        using_clause = f"USING {options['using']}" if 'using' in options else ""
        where_clause = f"WHERE {options['where']}" if 'where' in options else ""
        
        sql = f"""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name}
        ON {table} {using_clause} ({', '.join(columns)})
        {where_clause}
        """
        
        try:
            self.db.session.execute(text(sql))
            self.db.session.commit()
            print(f"✅ Created index: {index_name}")
        except Exception as e:
            print(f"⚠️ Index {index_name}: {e}")
            self.db.session.rollback()
    
    def _create_json_index(self, table: str, index_type: str, expression: str) -> None:
        """Create a JSON-optimized index."""
        index_name = f"ix_json_{table}_{expression.replace('(', '').replace(')', '').replace(',', '_')}"
        
        sql = f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} ON {table} USING {index_type} {expression}"
        
        try:
            self.db.session.execute(text(sql))
            self.db.session.commit()
            print(f"✅ Created JSON index: {index_name}")
        except Exception as e:
            print(f"⚠️ JSON index {index_name}: {e}")
            self.db.session.rollback()
    
    def _create_materialized_view(self, view_name: str, query: str) -> None:
        """Create a materialized view for analytics."""
        sql = f"""
        DROP MATERIALIZED VIEW IF EXISTS {view_name};
        CREATE MATERIALIZED VIEW {view_name} AS {query};
        CREATE INDEX ON {view_name} (ward_id) WHERE ward_id IS NOT NULL;
        """
        
        try:
            self.db.session.execute(text(sql))
            self.db.session.commit()
            print(f"✅ Created materialized view: {view_name}")
        except Exception as e:
            print(f"⚠️ Materialized view {view_name}: {e}")
            self.db.session.rollback()
    
    def _get_connection_stats(self) -> Dict:
        """Get database connection statistics."""
        result = self.db.session.execute(text("""
            SELECT 
                sum(numbackends) as total_connections,
                sum(xact_commit) as committed_transactions,
                sum(xact_rollback) as rolled_back_transactions,
                sum(blks_read) as blocks_read,
                sum(blks_hit) as blocks_hit
            FROM pg_stat_database
        """)).fetchone()
        
        return dict(result._mapping) if result else {}
    
    def _analyze_query_performance(self) -> Dict:
        """Analyze slow query performance."""
        result = self.db.session.execute(text("""
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                rows
            FROM pg_stat_statements 
            WHERE mean_time > 1000
            ORDER BY mean_time DESC
            LIMIT 10
        """)).fetchall()
        
        return [dict(row._mapping) for row in result] if result else []
    
    def _analyze_index_usage(self) -> Dict:
        """Analyze index usage patterns."""
        result = self.db.session.execute(text("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            ORDER BY tablename
        """)).fetchall()
        
        return [dict(row._mapping) for row in result] if result else []
    
    def _get_table_sizes(self) -> Dict:
        """Get table size information."""
        result = self.db.session.execute(text("""
            SELECT 
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        """)).fetchall()
        
        return [dict(row._mapping) for row in result] if result else []
    
    def _get_cache_hit_ratio(self) -> float:
        """Get database cache hit ratio."""
        result = self.db.session.execute(text("""
            SELECT 
                sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) as cache_hit_ratio
            FROM pg_stat_database
        """)).fetchone()
        
        return float(result[0]) if result and result[0] else 0.0


def main():
    parser = argparse.ArgumentParser(description='LokDarpan Performance Optimization')
    parser.add_argument('--apply', action='store_true', help='Apply optimizations')
    parser.add_argument('--validate', action='store_true', help='Validate performance targets')
    parser.add_argument('--analyze-only', action='store_true', help='Only analyze current performance')
    
    args = parser.parse_args()
    
    app = create_app()
    
    with app.app_context():
        optimizer = PerformanceOptimizer(app)
        
        # Always analyze current performance
        metrics = optimizer.analyze_current_performance()
        print(f"\n📊 Current Performance Metrics:")
        print(f"Cache Hit Ratio: {metrics['cache_hit_ratio']:.2f}%")
        print(f"Active Connections: {metrics['connection_stats'].get('total_connections', 'N/A')}")
        print(f"Slow Queries: {len(metrics['query_performance'])}")
        print(f"Unused Indexes: {len(metrics['index_usage'])}")
        
        if args.analyze_only:
            return
        
        if args.apply:
            print("\n🚀 Applying performance optimizations...")
            optimizer.optimize_ward_queries()
            optimizer.optimize_time_series_queries()
            optimizer.optimize_json_queries()
            optimizer.configure_connection_pooling()
            optimizer.optimize_analytics_queries()
            print("✅ Optimizations applied")
        
        if args.validate:
            print("\n🎯 Validating performance targets...")
            results = optimizer.validate_performance_targets()
            
            print(f"Ward Query Time: {results['ward_query_time']:.3f}s (Target: <3s) {'✅' if results['ward_query_target_met'] else '❌'}")
            print(f"Crisis Query Time: {results['crisis_query_time']:.3f}s (Target: <15s) {'✅' if results['crisis_query_target_met'] else '❌'}")
            print(f"Alert Query Time: {results['alert_query_time']:.3f}s (Target: <1s) {'✅' if results['alert_query_target_met'] else '❌'}")


if __name__ == '__main__':
    main()