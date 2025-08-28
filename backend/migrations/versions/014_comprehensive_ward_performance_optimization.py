"""Comprehensive Ward Performance Optimization

Revision ID: 014_comprehensive_ward_performance_optimization
Revises: 013_comprehensive_political_data_seeding
Create Date: 2025-08-24 12:00:00.000000

This migration implements comprehensive database optimizations for production-ready
political intelligence platform supporting all 150 GHMC wards with <100ms query performance.

Key optimizations:
1. Strategic indexes for ward-centric queries
2. Composite indexes for time-series analysis  
3. Partial indexes for filtered queries
4. Covering indexes for aggregation queries
5. Performance monitoring views
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '014_comprehensive_ward_performance_optimization'
down_revision = 'ac47afe8f5c3'
branch_labels = None
depends_on = None


def upgrade():
    """Apply comprehensive performance optimizations"""
    
    print("🎯 Creating strategic performance indexes...")
    
    # Core ward-centric query optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_city_created_at_desc 
        ON post(city, created_at DESC) 
        WHERE city IS NOT NULL;
    """)
    
    # Time-series analysis optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_created_at_city_emotion 
        ON post(created_at DESC, city, emotion) 
        WHERE created_at >= NOW() - INTERVAL '90 days';
    """)
    
    # Party analysis optimization  
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_party_city_created_at 
        ON post(party, city, created_at DESC) 
        WHERE party IS NOT NULL AND city IS NOT NULL;
    """)
    
    # Emotion aggregation optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_emotion_city_created_at 
        ON post(emotion, city, created_at DESC) 
        WHERE emotion IS NOT NULL AND city IS NOT NULL;
    """)
    
    # Epaper linkage optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_epaper_id_created_at 
        ON post(epaper_id, created_at DESC) 
        WHERE epaper_id IS NOT NULL;
    """)
    
    # Alert system optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_ward_severity_created_at 
        ON alert(ward, severity, created_at DESC) 
        WHERE ward IS NOT NULL;
    """)
    
    # Strategic summary optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_ward_window_created_at 
        ON summary(ward, window, created_at DESC) 
        WHERE ward IS NOT NULL;
    """)
    
    # AI models optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leader_mention_created_at_leader_id 
        ON leader_mention(created_at DESC, leader_id) 
        WHERE created_at >= NOW() - INTERVAL '60 days';
    """)
    
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_cluster_ward_updated_at 
        ON issue_cluster(ward, updated_at DESC) 
        WHERE ward IS NOT NULL;
    """)
    
    # Epaper content optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_epaper_publication_date_name 
        ON epaper(publication_date DESC, publication_name) 
        WHERE publication_date >= CURRENT_DATE - INTERVAL '180 days';
    """)
    
    # Author performance optimization
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_author_name_party 
        ON author(name, party) 
        WHERE party IS NOT NULL;
    """)
    
    print("✅ Strategic indexes created successfully")
    
    # Create performance monitoring view
    print("📊 Creating performance monitoring view...")
    
    op.execute("""
        CREATE OR REPLACE VIEW ward_performance_metrics AS
        SELECT 
            city as ward_name,
            COUNT(*) as total_posts,
            COUNT(DISTINCT emotion) as emotion_variety,
            COUNT(DISTINCT party) as party_mentions,
            COUNT(DISTINCT author_id) as unique_authors,
            COUNT(CASE WHEN epaper_id IS NOT NULL THEN 1 END) as linked_to_epaper,
            MIN(created_at) as earliest_post,
            MAX(created_at) as latest_post,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_posts_30d,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_posts_7d,
            ROUND(
                (COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::float / 
                 NULLIF(COUNT(*), 0)) * 100, 2
            ) as freshness_score_30d
        FROM post 
        WHERE city IS NOT NULL
        GROUP BY city
        ORDER BY total_posts DESC;
    """)
    
    # Create query performance analysis view
    op.execute("""
        CREATE OR REPLACE VIEW query_performance_analysis AS
        SELECT 
            'ward_posts_query' as query_type,
            'SELECT * FROM post WHERE city = ? ORDER BY created_at DESC LIMIT 50' as sample_query,
            'idx_post_city_created_at_desc' as primary_index,
            'Ward-centric post retrieval' as description,
            '<100ms' as target_performance
        UNION ALL
        SELECT 
            'time_series_analysis' as query_type,
            'SELECT city, emotion, COUNT(*) FROM post WHERE created_at >= ? GROUP BY city, emotion' as sample_query,
            'idx_post_created_at_city_emotion' as primary_index,
            'Temporal emotion analysis' as description,
            '<150ms' as target_performance
        UNION ALL
        SELECT 
            'party_competition' as query_type,
            'SELECT party, city, COUNT(*) FROM post WHERE party IS NOT NULL GROUP BY party, city' as sample_query,
            'idx_post_party_city_created_at' as primary_index,
            'Party mention aggregation' as description,
            '<200ms' as target_performance;
    """)
    
    # Add performance analysis function
    op.execute("""
        CREATE OR REPLACE FUNCTION analyze_ward_query_performance(ward_name TEXT)
        RETURNS TABLE(
            metric_name TEXT,
            metric_value NUMERIC,
            status TEXT,
            recommendation TEXT
        ) AS $$
        DECLARE
            post_count INTEGER;
            recent_count INTEGER;
            emotion_variety INTEGER;
            party_variety INTEGER;
        BEGIN
            -- Get basic metrics
            SELECT 
                COUNT(*),
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END),
                COUNT(DISTINCT emotion),
                COUNT(DISTINCT party)
            INTO post_count, recent_count, emotion_variety, party_variety
            FROM post 
            WHERE city = ward_name;
            
            -- Return analysis results
            RETURN QUERY
            SELECT 
                'total_posts'::TEXT,
                post_count::NUMERIC,
                CASE WHEN post_count >= 50 THEN 'GOOD' WHEN post_count >= 25 THEN 'FAIR' ELSE 'NEEDS_DATA' END,
                CASE WHEN post_count < 50 THEN 'Increase post volume for reliable analysis' ELSE 'Sufficient data volume' END
            UNION ALL
            SELECT 
                'recent_posts_30d'::TEXT,
                recent_count::NUMERIC,
                CASE WHEN recent_count >= 10 THEN 'GOOD' WHEN recent_count >= 5 THEN 'FAIR' ELSE 'STALE' END,
                CASE WHEN recent_count < 10 THEN 'Need more recent data for current intelligence' ELSE 'Good data freshness' END
            UNION ALL
            SELECT 
                'emotion_variety'::TEXT,
                emotion_variety::NUMERIC,
                CASE WHEN emotion_variety >= 5 THEN 'GOOD' WHEN emotion_variety >= 3 THEN 'FAIR' ELSE 'LIMITED' END,
                CASE WHEN emotion_variety < 5 THEN 'Expand emotion analysis coverage' ELSE 'Good sentiment diversity' END
            UNION ALL
            SELECT 
                'party_variety'::TEXT,
                party_variety::NUMERIC,
                CASE WHEN party_variety >= 3 THEN 'GOOD' WHEN party_variety >= 2 THEN 'FAIR' ELSE 'LIMITED' END,
                CASE WHEN party_variety < 3 THEN 'Increase multi-party political coverage' ELSE 'Good political diversity' END;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    print("✅ Performance monitoring infrastructure created")
    
    # Create data quality constraints
    print("🛡️ Adding data integrity constraints...")
    
    # Ensure posts have valid emotions when specified
    op.execute("""
        ALTER TABLE post ADD CONSTRAINT check_valid_emotion 
        CHECK (emotion IS NULL OR emotion IN ('Hopeful', 'Frustrated', 'Anger', 'Positive', 'Negative', 'Neutral', 'Sadness'));
    """)
    
    # Ensure posts have valid parties when specified
    op.execute("""
        ALTER TABLE post ADD CONSTRAINT check_valid_party 
        CHECK (party IS NULL OR party IN ('BJP', 'INC', 'BRS', 'AIMIM', 'TDP', 'YSRCP', 'TRS', 'JSP'));
    """)
    
    # Ensure alert severity is valid
    op.execute("""
        ALTER TABLE alert ADD CONSTRAINT check_valid_severity 
        CHECK (severity IN ('low', 'medium', 'high', 'critical'));
    """)
    
    print("✅ Data integrity constraints added")
    
    # Update statistics for query planner
    print("📈 Updating table statistics...")
    op.execute("ANALYZE post;")
    op.execute("ANALYZE epaper;")
    op.execute("ANALYZE alert;")
    op.execute("ANALYZE author;")
    op.execute("ANALYZE summary;")
    
    print("✅ Migration 014 completed successfully!")
    print("🚀 Database optimized for production political intelligence workloads")


def downgrade():
    """Remove performance optimizations (use with caution in production)"""
    
    print("⚠️  Removing performance optimizations...")
    
    # Remove constraints
    op.execute("ALTER TABLE post DROP CONSTRAINT IF EXISTS check_valid_emotion;")
    op.execute("ALTER TABLE post DROP CONSTRAINT IF EXISTS check_valid_party;")
    op.execute("ALTER TABLE alert DROP CONSTRAINT IF EXISTS check_valid_severity;")
    
    # Remove functions and views
    op.execute("DROP FUNCTION IF EXISTS analyze_ward_query_performance(TEXT);")
    op.execute("DROP VIEW IF EXISTS query_performance_analysis;")
    op.execute("DROP VIEW IF EXISTS ward_performance_metrics;")
    
    # Remove indexes (this will be slow on large datasets)
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_post_city_created_at_desc;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_post_created_at_city_emotion;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_post_party_city_created_at;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_post_emotion_city_created_at;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_post_epaper_id_created_at;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_alert_ward_severity_created_at;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_summary_ward_window_created_at;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_leader_mention_created_at_leader_id;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_issue_cluster_ward_updated_at;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_epaper_publication_date_name;")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_author_name_party;")
    
    print("✅ Performance optimizations removed")