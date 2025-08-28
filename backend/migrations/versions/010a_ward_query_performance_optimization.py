"""Ward Query Performance Optimization

Revision ID: 010a_ward_query_performance_optimization
Revises: 010_demographic_intelligence
Create Date: 2025-08-28 07:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010a_ward_query_performance_optimization'
down_revision = '010_demographic_intelligence'
branch_labels = None
depends_on = None


def upgrade():
    """
    Optimize ward-based database queries for Political Strategist performance.
    
    This migration implements:
    1. Composite indexes for ward + date queries 
    2. Optimized indexes for Political Strategist cache lookup patterns
    3. Post/epaper join query optimizations
    4. Vector search infrastructure preparation
    """
    
    # =======================================================================
    # 1. COMPOSITE INDEXES FOR WARD + DATE QUERIES
    # =======================================================================
    
    # Post table: Optimize ward-based filtering with date ranges (trends_api.py)
    op.create_index(
        'idx_post_city_created_at_composite',
        'post',
        ['city', 'created_at'],
        postgresql_where=sa.text("city IS NOT NULL AND created_at IS NOT NULL")
    )
    
    # Alert table: Optimize ward alerts with date filtering
    op.create_index(
        'idx_alert_ward_created_at_composite',
        'alert', 
        ['ward', 'created_at'],
        postgresql_where=sa.text("ward IS NOT NULL")
    )
    
    # Posts table: Alternative table optimization
    op.create_index(
        'idx_posts_ward_created_at_composite',
        'posts',
        ['ward', 'created_at'],
        postgresql_where=sa.text("ward IS NOT NULL")
    )
    
    # Embedding store: Ward context + date for AI retrieval
    op.create_index(
        'idx_embedding_ward_date_composite',
        'embedding_store',
        ['ward_context', 'created_at', 'political_relevance_score'],
        postgresql_where=sa.text("ward_context IS NOT NULL AND political_relevance_score > 0.5")
    )
    
    # =======================================================================
    # 2. POLITICAL STRATEGIST CACHE LOOKUP OPTIMIZATION
    # =======================================================================
    
    # Geopolitical report: Strategic analysis caching patterns
    op.create_index(
        'idx_geopolitical_ward_status_composite',
        'geopolitical_report',
        ['ward_context', 'completed_at', 'expires_at'],
        postgresql_where=sa.text("completed_at IS NOT NULL")
    )
    
    # Alert table: Priority-based strategist queries
    op.create_index(
        'idx_alert_ward_updated_priority',
        'alert',
        ['ward', 'updated_at'],
        postgresql_where=sa.text("ward IS NOT NULL AND updated_at >= (NOW() - INTERVAL '30 days')")
    )
    
    # =======================================================================
    # 3. POST/EPAPER JOIN QUERY OPTIMIZATION
    # =======================================================================
    
    # Post table: Optimize epaper_id joins for content analysis
    op.create_index(
        'idx_post_epaper_city_date',
        'post',
        ['epaper_id', 'city', 'created_at'],
        postgresql_where=sa.text("epaper_id IS NOT NULL AND city IS NOT NULL")
    )
    
    # Author table: Optimize post-author joins in trends analysis
    op.create_index(
        'idx_author_party_name',
        'author',
        ['party', 'name'],
        postgresql_where=sa.text("party IS NOT NULL")
    )
    
    # =======================================================================
    # 4. VECTOR SEARCH INFRASTRUCTURE PREPARATION
    # =======================================================================
    
    # Add pgvector extension (safely - only if not exists)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Optimize embedding_store for vector similarity search
    # Create HNSW index for vector similarity when vectors are populated
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embedding_vector_hnsw 
        ON embedding_store 
        USING hnsw (CAST(embedding_vector AS vector(1536))) 
        WHERE embedding_vector IS NOT NULL AND embedding_dimensions = 1536
    """)
    
    # Source type + credibility for quality filtering
    op.create_index(
        'idx_embedding_source_credibility',
        'embedding_store',
        ['source_type', 'credibility_score', 'ward_context'],
        postgresql_where=sa.text("credibility_score IS NOT NULL AND credibility_score > 0.6")
    )
    
    # =======================================================================
    # 5. WARD-SPECIFIC TABLE OPTIMIZATIONS
    # =======================================================================
    
    # Ward demographics: Fast lookups for political analysis
    op.create_index(
        'idx_ward_demographics_updated',
        'ward_demographics',
        ['ward_id', 'updated_at'],
        postgresql_where=sa.text("updated_at IS NOT NULL")
    )
    
    # Ward features: Political intelligence lookup patterns
    op.create_index(
        'idx_ward_features_updated',
        'ward_features', 
        ['ward_id', 'updated_at'],
        postgresql_where=sa.text("updated_at IS NOT NULL")
    )
    
    # Ward profile: Complete ward analysis optimization
    op.create_index(
        'idx_ward_profile_updated',
        'ward_profile',
        ['ward_id', 'updated_at'],
        postgresql_where=sa.text("updated_at IS NOT NULL")
    )
    
    # =======================================================================
    # 6. ADDITIONAL PERFORMANCE OPTIMIZATIONS
    # =======================================================================
    
    # AI model execution: Track strategist performance
    op.create_index(
        'idx_ai_model_execution_status',
        'ai_model_execution',
        [sa.text("(metadata->>'ward')"), 'status', 'created_at'],
        postgresql_where=sa.text("metadata->>'ward' IS NOT NULL")
    )
    
    # Polling station: Electoral analysis optimization
    op.create_index(
        'idx_polling_station_ward_name',
        'polling_station',
        ['ward_id', 'ward_name'],
        postgresql_where=sa.text("ward_id IS NOT NULL")
    )
    
    # Result ward aggregation: Electoral trend analysis
    op.create_index(
        'idx_result_ward_agg_computed',
        'result_ward_agg',
        ['ward_id', 'computed_at'],
        postgresql_where=sa.text("computed_at IS NOT NULL")
    )


def downgrade():
    """
    Remove performance optimization indexes.
    """
    
    # Drop composite indexes
    op.drop_index('idx_post_city_created_at_composite', table_name='post')
    op.drop_index('idx_alert_ward_created_at_composite', table_name='alert')  
    op.drop_index('idx_posts_ward_created_at_composite', table_name='posts')
    op.drop_index('idx_embedding_ward_date_composite', table_name='embedding_store')
    
    # Drop strategist cache indexes
    op.drop_index('idx_geopolitical_ward_status_composite', table_name='geopolitical_report')
    op.drop_index('idx_alert_ward_updated_priority', table_name='alert')
    
    # Drop join optimization indexes
    op.drop_index('idx_post_epaper_city_date', table_name='post')
    op.drop_index('idx_author_party_name', table_name='author')
    
    # Drop vector search indexes
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_embedding_vector_hnsw")
    op.drop_index('idx_embedding_source_credibility', table_name='embedding_store')
    
    # Drop ward-specific indexes
    op.drop_index('idx_ward_demographics_updated', table_name='ward_demographics')
    op.drop_index('idx_ward_features_updated', table_name='ward_features')
    op.drop_index('idx_ward_profile_updated', table_name='ward_profile')
    
    # Drop additional optimization indexes
    op.drop_index('idx_ai_model_execution_status', table_name='ai_model_execution')
    op.drop_index('idx_polling_station_ward_name', table_name='polling_station')
    op.drop_index('idx_result_ward_agg_computed', table_name='result_ward_agg')
    
    # Note: We don't drop the pgvector extension as it may be used elsewhere