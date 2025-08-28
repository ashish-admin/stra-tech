-- Ward Query Performance Optimization Script
-- Applies database optimizations for Political Strategist system
-- Run this script to improve ward-based query performance

-- ================================================================================
-- COMPOSITE INDEXES FOR WARD + DATE QUERIES
-- ================================================================================

-- Post table: Optimize ward-based filtering with date ranges (trends_api.py)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_city_created_at_composite 
ON post (city, created_at) 
WHERE city IS NOT NULL AND created_at IS NOT NULL;

-- Alert table: Optimize ward alerts with date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_ward_created_at_composite 
ON alert (ward, created_at) 
WHERE ward IS NOT NULL;

-- Posts table: Alternative table optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_ward_created_at_composite 
ON posts (ward, created_at) 
WHERE ward IS NOT NULL;

-- Embedding store: Ward context + date for AI retrieval
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embedding_ward_date_composite 
ON embedding_store (ward_context, created_at, political_relevance_score) 
WHERE ward_context IS NOT NULL AND political_relevance_score > 0.5;

-- ================================================================================
-- POLITICAL STRATEGIST CACHE LOOKUP OPTIMIZATION
-- ================================================================================

-- Geopolitical report: Strategic analysis caching patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geopolitical_ward_status_composite 
ON geopolitical_report (ward_context, completed_at, expires_at) 
WHERE completed_at IS NOT NULL;

-- Alert table: Priority-based strategist queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_ward_updated_priority 
ON alert (ward, updated_at) 
WHERE ward IS NOT NULL AND updated_at >= (NOW() - INTERVAL '30 days');

-- ================================================================================
-- POST/EPAPER JOIN QUERY OPTIMIZATION
-- ================================================================================

-- Post table: Optimize epaper_id joins for content analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_epaper_city_date 
ON post (epaper_id, city, created_at) 
WHERE epaper_id IS NOT NULL AND city IS NOT NULL;

-- Author table: Optimize post-author joins in trends analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_author_party_name 
ON author (party, name) 
WHERE party IS NOT NULL;

-- ================================================================================
-- VECTOR SEARCH INFRASTRUCTURE PREPARATION
-- ================================================================================

-- Add pgvector extension (safely - only if not exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- Source type + credibility for quality filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embedding_source_credibility 
ON embedding_store (source_type, credibility_score, ward_context) 
WHERE credibility_score IS NOT NULL AND credibility_score > 0.6;

-- ================================================================================
-- WARD-SPECIFIC TABLE OPTIMIZATIONS
-- ================================================================================

-- Ward demographics: Fast lookups for political analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ward_demographics_updated 
ON ward_demographics (ward_id, updated_at) 
WHERE updated_at IS NOT NULL;

-- Ward features: Political intelligence lookup patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ward_features_updated 
ON ward_features (ward_id, updated_at) 
WHERE updated_at IS NOT NULL;

-- Ward profile: Complete ward analysis optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ward_profile_updated 
ON ward_profile (ward_id, updated_at) 
WHERE updated_at IS NOT NULL;

-- ================================================================================
-- ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- ================================================================================

-- AI model execution: Track strategist performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_model_execution_status 
ON ai_model_execution ((metadata->>'ward'), status, created_at) 
WHERE metadata->>'ward' IS NOT NULL;

-- Polling station: Electoral analysis optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_polling_station_ward_name 
ON polling_station (ward_id, ward_name) 
WHERE ward_id IS NOT NULL;

-- Result ward aggregation: Electoral trend analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_result_ward_agg_computed 
ON result_ward_agg (ward_id, computed_at) 
WHERE computed_at IS NOT NULL;

-- ================================================================================
-- VECTOR INDEX (CONDITIONAL - ONLY IF EMBEDDINGS EXIST)
-- ================================================================================

-- This index will only be created if there are actual vector embeddings
-- Check if we have embeddings with proper dimensions first
DO $$
BEGIN
    -- Only create HNSW index if we have embeddings
    IF EXISTS (
        SELECT 1 FROM embedding_store 
        WHERE embedding_vector IS NOT NULL 
        AND embedding_dimensions = 1536 
        LIMIT 1
    ) THEN
        -- Create HNSW index for vector similarity (OpenAI embeddings)
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embedding_vector_hnsw 
                 ON embedding_store 
                 USING hnsw (CAST(embedding_vector AS vector(1536))) 
                 WHERE embedding_vector IS NOT NULL AND embedding_dimensions = 1536';
        
        RAISE NOTICE 'HNSW vector index created for 1536-dimensional embeddings';
    ELSE
        RAISE NOTICE 'No vector embeddings found - HNSW index skipped';
    END IF;
END
$$;

-- ================================================================================
-- PERFORMANCE ANALYSIS QUERIES
-- ================================================================================

-- Query to check index usage after optimization
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%ward%' OR indexname LIKE 'idx_%composite%'
ORDER BY idx_scan DESC;

-- Query to check table sizes and optimization impact
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(table_name::regclass)) as total_size,
    pg_size_pretty(pg_relation_size(table_name::regclass)) as table_size,
    pg_size_pretty(pg_total_relation_size(table_name::regclass) - pg_relation_size(table_name::regclass)) as index_size
FROM (
    VALUES ('post'), ('alert'), ('embedding_store'), ('geopolitical_report'), 
           ('ward_demographics'), ('ward_features'), ('ward_profile')
) AS t(table_name);

ANALYZE;

-- Final success message
SELECT 'Ward query performance optimization completed successfully!' as status;