"""ward_pattern_search_optimization

Revision ID: 78409aeed0d9
Revises: eeb3e338d0a8
Create Date: 2025-08-28 19:13:43.196246

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '78409aeed0d9'
down_revision = 'eeb3e338d0a8'
branch_labels = None
depends_on = None


def upgrade():
    """
    WARD PATTERN SEARCH OPTIMIZATION
    
    ROOT CAUSE IDENTIFIED: Existing B-tree indexes cannot handle ILIKE pattern matching
    with leading wildcards ('%Jubilee Hills%'). This migration implements specialized
    indexes and query optimization techniques for ward name pattern matching.
    
    Performance Issue Analysis:
    - Current: Sequential scan for ILIKE queries (390ms)
    - Target: Index-based pattern matching (<50ms)
    
    Solution Strategy:
    1. GIN trigram indexes for pattern matching
    2. Functional indexes for normalized ward names  
    3. Full-text search capabilities
    4. Query pattern optimization hints
    """
    
    # =======================================================================
    # 1. ENABLE REQUIRED EXTENSIONS
    # =======================================================================
    
    # Enable pg_trgm extension for trigram-based pattern matching
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    
    # =======================================================================
    # 2. TRIGRAM GIN INDEX FOR PATTERN MATCHING
    # =======================================================================
    
    # This is the CRITICAL index for ILIKE '%pattern%' queries
    # GIN trigram index allows fast pattern matching with leading wildcards
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_post_city_trigram
        ON post 
        USING gin (city gin_trgm_ops)
        WHERE city IS NOT NULL
    """)
    
    # =======================================================================
    # 3. NORMALIZED WARD NAME FUNCTIONAL INDEX
    # =======================================================================
    
    # Create functional index for normalized ward names (case-insensitive, trimmed)
    # This helps with exact matches on cleaned ward names
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_post_city_normalized
        ON post (LOWER(TRIM(city)))
        WHERE city IS NOT NULL AND LENGTH(TRIM(city)) > 0
    """)
    
    # =======================================================================
    # 4. ADDITIONAL B-TREE INDEX FOR DATE FILTERING 
    # =======================================================================
    
    # Since GIN cannot handle both trigram and timestamp, create separate indexes
    # This B-tree index will be used for date filtering after trigram search
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_post_city_date_btree
        ON post (city, created_at)
        WHERE city IS NOT NULL AND created_at IS NOT NULL
    """)
    
    # =======================================================================
    # 5. FULL-TEXT SEARCH OPTIMIZATION
    # =======================================================================
    
    # Add tsvector column for full-text search on post content + city
    op.add_column('post', sa.Column('search_vector', postgresql.TSVECTOR()))
    
    # Create GIN index on search vector for fast text search
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_post_search_vector
        ON post 
        USING gin (search_vector)
        WHERE search_vector IS NOT NULL
    """)
    
    # Create trigger to automatically update search vector
    op.execute("""
        CREATE OR REPLACE FUNCTION update_post_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english', 
                COALESCE(NEW.city, '') || ' ' || 
                COALESCE(NEW.text, '') || ' ' ||
                COALESCE(NEW.party, '') || ' ' ||
                COALESCE(NEW.emotion, '')
            );
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_post_search_vector
        BEFORE INSERT OR UPDATE ON post
        FOR EACH ROW
        EXECUTE FUNCTION update_post_search_vector();
    """)
    
    # Populate existing search vectors
    op.execute("""
        UPDATE post SET search_vector = to_tsvector('english', 
            COALESCE(city, '') || ' ' || 
            COALESCE(text, '') || ' ' ||
            COALESCE(party, '') || ' ' ||
            COALESCE(emotion, '')
        ) WHERE search_vector IS NULL;
    """)
    
    # =======================================================================
    # 6. WARD LOOKUP TABLE OPTIMIZATION
    # =======================================================================
    
    # Create materialized view for fast ward statistics
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS ward_statistics AS
        SELECT 
            city,
            LOWER(TRIM(city)) as normalized_city,
            COUNT(*) as post_count,
            MAX(created_at) as latest_post,
            COUNT(DISTINCT author_id) as author_count,
            COUNT(DISTINCT emotion) as emotion_variety
        FROM post 
        WHERE city IS NOT NULL 
        GROUP BY city
        ORDER BY post_count DESC;
    """)
    
    # Index the materialized view for fast lookups
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ward_stats_city
        ON ward_statistics (city);
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_ward_stats_normalized
        ON ward_statistics (normalized_city);
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_ward_stats_trigram
        ON ward_statistics USING gin (city gin_trgm_ops);
    """)
    
    # =======================================================================
    # 7. UPDATE TABLE STATISTICS
    # =======================================================================
    
    # Analyze tables to update query planner statistics
    op.execute("ANALYZE post;")
    op.execute("REFRESH MATERIALIZED VIEW ward_statistics;")
    op.execute("ANALYZE ward_statistics;")


def downgrade():
    """
    Remove ward pattern search optimizations.
    
    WARNING: This will significantly degrade pattern matching performance
    and revert to sequential scans for ILIKE queries.
    """
    
    # Drop search vector trigger and function
    op.execute("DROP TRIGGER IF EXISTS trigger_update_post_search_vector ON post;")
    op.execute("DROP FUNCTION IF EXISTS update_post_search_vector();")
    
    # Drop search vector column and index
    op.execute("DROP INDEX IF EXISTS idx_post_search_vector;")
    op.drop_column('post', 'search_vector')
    
    # Drop ward statistics materialized view and indexes
    op.execute("DROP INDEX IF EXISTS idx_ward_stats_trigram;")
    op.execute("DROP INDEX IF EXISTS idx_ward_stats_normalized;")
    op.execute("DROP INDEX IF EXISTS idx_ward_stats_city;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS ward_statistics;")
    
    # Drop trigram indexes
    op.execute("DROP INDEX IF EXISTS idx_post_city_date_btree;")
    op.execute("DROP INDEX IF EXISTS idx_post_city_normalized;")
    op.execute("DROP INDEX IF EXISTS idx_post_city_trigram;")
    
    # Note: We don't drop pg_trgm extension as it may be used elsewhere
