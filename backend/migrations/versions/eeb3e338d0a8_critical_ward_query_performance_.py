"""critical_ward_query_performance_optimization

Revision ID: eeb3e338d0a8
Revises: d9364e544543
Create Date: 2025-08-28 19:09:23.148301

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'eeb3e338d0a8'
down_revision = 'd9364e544543'
branch_labels = None
depends_on = None


def upgrade():
    """
    CRITICAL WARD QUERY PERFORMANCE OPTIMIZATION
    
    This migration addresses the critical sequential scan performance issue
    identified in ward-based queries. The analysis showed:
    - post.city queries doing sequential scans (35ms+ for simple counts)
    - Missing indexes causing poor performance for 51-ward dashboard
    - Political Strategist queries need optimization for real-time responses
    """
    
    # =======================================================================
    # 1. CRITICAL: POST.CITY INDEX - HIGHEST PRIORITY
    # =======================================================================
    # This is the most critical index - post.city queries are sequential scanning
    
    # Simple city index for equality queries (fastest)
    op.create_index(
        'idx_post_city_btree',
        'post',
        ['city'],
        postgresql_where=sa.text("city IS NOT NULL")
    )
    
    # Composite index for ward + time queries (trends API)
    op.create_index(
        'idx_post_city_created_at_composite',
        'post',
        ['city', 'created_at'],
        postgresql_where=sa.text("city IS NOT NULL AND created_at IS NOT NULL")
    )
    
    # =======================================================================
    # 2. ALERT SYSTEM OPTIMIZATION
    # =======================================================================
    
    # Alert ward + date composite for dashboard alerts
    op.create_index(
        'idx_alert_ward_created_at_composite',
        'alert',
        ['ward', 'created_at'],
        postgresql_where=sa.text("ward IS NOT NULL")
    )
    
    # =======================================================================
    # 3. AI/RAG EMBEDDING OPTIMIZATION
    # =======================================================================
    
    # Embedding store ward context for Political Strategist
    op.create_index(
        'idx_embedding_ward_date_composite',
        'embedding_store',
        ['ward_context', 'created_at', 'political_relevance_score'],
        postgresql_where=sa.text("ward_context IS NOT NULL")
    )
    
    # Source credibility filtering
    op.create_index(
        'idx_embedding_source_credibility',
        'embedding_store',
        ['source_type', 'credibility_score', 'ward_context'],
        postgresql_where=sa.text("credibility_score IS NOT NULL")
    )
    
    # =======================================================================
    # 4. ELECTORAL DATA OPTIMIZATION  
    # =======================================================================
    
    # Ward demographics fast lookup
    op.create_index(
        'idx_ward_demographics_updated',
        'ward_demographics',
        ['ward_id', 'updated_at'],
        postgresql_where=sa.text("updated_at IS NOT NULL")
    )
    
    # Ward features lookup
    op.create_index(
        'idx_ward_features_updated',
        'ward_features',
        ['ward_id', 'updated_at'],
        postgresql_where=sa.text("updated_at IS NOT NULL")
    )
    
    # Ward profile lookup
    op.create_index(
        'idx_ward_profile_updated',
        'ward_profile',
        ['ward_id', 'updated_at'],
        postgresql_where=sa.text("updated_at IS NOT NULL")
    )
    
    # =======================================================================
    # 5. CONTENT ANALYSIS OPTIMIZATION
    # =======================================================================
    
    # Post + epaper joins for content analysis
    op.create_index(
        'idx_post_epaper_city_date',
        'post',
        ['epaper_id', 'city', 'created_at'],
        postgresql_where=sa.text("epaper_id IS NOT NULL AND city IS NOT NULL")
    )
    
    # Author + party optimization for trends
    op.create_index(
        'idx_author_party_name',
        'author',
        ['party', 'name'],
        postgresql_where=sa.text("party IS NOT NULL")
    )
    
    # Post + author + city for comprehensive queries
    op.create_index(
        'idx_post_author_city_date',
        'post',
        ['author_id', 'city', 'created_at'],
        postgresql_where=sa.text("author_id IS NOT NULL AND city IS NOT NULL")
    )
    
    # =======================================================================
    # 6. GEOPOLITICAL REPORTS OPTIMIZATION
    # =======================================================================
    
    # Strategic analysis caching
    op.create_index(
        'idx_geopolitical_ward_status',
        'geopolitical_report',
        ['ward_context', 'completed_at', 'status'],
        postgresql_where=sa.text("completed_at IS NOT NULL")
    )
    
    # =======================================================================
    # 7. PGVECTOR OPTIMIZATION (IF AVAILABLE)
    # =======================================================================
    
    # Try to enable pgvector extension (safe - only if not exists)
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        
        # Create HNSW index for vector similarity search (concurrently to avoid locks)
        op.execute("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embedding_vector_hnsw 
            ON embedding_store 
            USING hnsw ((embedding_vector::vector(1536))
            WITH (m = 16, ef_construction = 64)
            WHERE embedding_vector IS NOT NULL 
            AND embedding_dimensions = 1536
            AND LENGTH(embedding_vector) > 100
        """)
        
    except Exception as e:
        # pgvector not available - continue without vector optimization
        pass
        
    # =======================================================================
    # 8. ANALYZE TABLES FOR IMMEDIATE QUERY PLAN UPDATES
    # =======================================================================
    
    # Update table statistics immediately so new indexes are used
    op.execute("ANALYZE post")
    op.execute("ANALYZE alert")
    op.execute("ANALYZE embedding_store")
    op.execute("ANALYZE ward_demographics")
    op.execute("ANALYZE ward_features")
    op.execute("ANALYZE ward_profile")


def downgrade():
    """
    Remove performance optimization indexes.
    
    WARNING: This will significantly degrade ward query performance.
    Only use this for emergency rollback scenarios.
    """
    
    # Drop critical post.city indexes
    op.drop_index('idx_post_city_btree', table_name='post')
    op.drop_index('idx_post_city_created_at_composite', table_name='post')
    
    # Drop alert optimization indexes
    op.drop_index('idx_alert_ward_created_at_composite', table_name='alert')
    
    # Drop embedding store indexes
    op.drop_index('idx_embedding_ward_date_composite', table_name='embedding_store')
    op.drop_index('idx_embedding_source_credibility', table_name='embedding_store')
    
    # Drop ward table indexes
    op.drop_index('idx_ward_demographics_updated', table_name='ward_demographics')
    op.drop_index('idx_ward_features_updated', table_name='ward_features')
    op.drop_index('idx_ward_profile_updated', table_name='ward_profile')
    
    # Drop content analysis indexes
    op.drop_index('idx_post_epaper_city_date', table_name='post')
    op.drop_index('idx_author_party_name', table_name='author')
    op.drop_index('idx_post_author_city_date', table_name='post')
    
    # Drop geopolitical reports index
    op.drop_index('idx_geopolitical_ward_status', table_name='geopolitical_report')
    
    # Drop vector index if it exists
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_embedding_vector_hnsw")
