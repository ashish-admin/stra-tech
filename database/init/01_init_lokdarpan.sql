-- LokDarpan Phase 1 Database Initialization
-- PostgreSQL 15 with pgvector extension setup for political intelligence

-- =============================================================================
-- EXTENSION SETUP
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;                -- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;    -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_trgm;               -- Text search optimization
CREATE EXTENSION IF NOT EXISTS btree_gin;             -- Advanced indexing
CREATE EXTENSION IF NOT EXISTS unaccent;              -- Text normalization

-- =============================================================================
-- USER MANAGEMENT AND SECURITY
-- =============================================================================

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lokdarpan_app') THEN
        CREATE ROLE lokdarpan_app WITH LOGIN PASSWORD 'change_in_production';
    END IF;
END
$$;

-- Grant necessary permissions to application user
GRANT CONNECT ON DATABASE lokdarpan_db TO lokdarpan_app;
GRANT USAGE ON SCHEMA public TO lokdarpan_app;
GRANT CREATE ON SCHEMA public TO lokdarpan_app;

-- Create monitoring user for health checks
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lokdarpan_monitor') THEN
        CREATE ROLE lokdarpan_monitor WITH LOGIN PASSWORD 'monitor_password_change';
    END IF;
END
$$;

-- Grant monitoring privileges
GRANT pg_monitor TO lokdarpan_monitor;
GRANT CONNECT ON DATABASE lokdarpan_db TO lokdarpan_monitor;
GRANT USAGE ON SCHEMA public TO lokdarpan_monitor;

-- =============================================================================
-- SYSTEM MONITORING TABLES
-- =============================================================================

-- Create audit log table for compliance and security
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    operation VARCHAR(16) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    user_name VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    session_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_operation ON audit_log(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_name, timestamp);

-- Create system health monitoring table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(64) NOT NULL,
    metric_value NUMERIC NOT NULL,
    unit VARCHAR(16),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    ward_context VARCHAR(120),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_health_metric_time ON system_health(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_health_ward ON system_health(ward_context, recorded_at) WHERE ward_context IS NOT NULL;

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to log system health metrics
CREATE OR REPLACE FUNCTION log_health_metric(
    p_metric_name VARCHAR(64),
    p_metric_value NUMERIC,
    p_unit VARCHAR(16) DEFAULT NULL,
    p_ward_context VARCHAR(120) DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO system_health (metric_name, metric_value, unit, ward_context, metadata)
    VALUES (p_metric_name, p_metric_value, p_unit, p_ward_context, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- Function to get database performance statistics
CREATE OR REPLACE FUNCTION get_db_performance_stats()
RETURNS TABLE(
    metric VARCHAR(64),
    value NUMERIC,
    unit VARCHAR(16)
) AS $$
BEGIN
    -- Return key performance metrics
    RETURN QUERY
    SELECT 
        'active_connections'::VARCHAR(64),
        COUNT(*)::NUMERIC,
        'connections'::VARCHAR(16)
    FROM pg_stat_activity 
    WHERE state = 'active'
    
    UNION ALL
    
    SELECT 
        'database_size'::VARCHAR(64),
        pg_database_size(current_database())::NUMERIC / (1024*1024*1024),
        'GB'::VARCHAR(16)
    
    UNION ALL
    
    SELECT 
        'cache_hit_ratio'::VARCHAR(64),
        ROUND(
            100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2
        )::NUMERIC,
        'percent'::VARCHAR(16)
    FROM pg_stat_database
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- POLITICAL INTELLIGENCE DATA VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate ward data consistency
CREATE OR REPLACE FUNCTION validate_ward_data_consistency()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: Ward profile consistency
    RETURN QUERY
    SELECT 
        'ward_profile_consistency'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All ward profiles have consistent data'
            ELSE COUNT(*)::TEXT || ' ward profiles have inconsistent turnout calculations'
        END
    FROM ward_profile 
    WHERE turnout_pct != ROUND((votes_cast::NUMERIC / NULLIF(electors, 0)) * 100, 2);
    
    -- Check 2: Post-ward relationship integrity
    RETURN QUERY
    SELECT 
        'post_ward_integrity'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All posts reference valid ward contexts'
            ELSE COUNT(*)::TEXT || ' posts reference invalid ward contexts'
        END
    FROM post p
    LEFT JOIN ward_profile wp ON p.city = wp.ward_id
    WHERE p.city IS NOT NULL AND wp.ward_id IS NULL;
    
    -- Check 3: Embedding store data quality
    RETURN QUERY
    SELECT 
        'embedding_data_quality'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All embedding records have valid vector data'
            ELSE COUNT(*)::TEXT || ' embedding records have invalid vector data'
        END
    FROM embedding_store 
    WHERE embedding_vector IS NULL OR LENGTH(embedding_vector) < 100;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIALIZATION CLEANUP AND OPTIMIZATION
-- =============================================================================

-- Reset query statistics to get clean baseline
SELECT pg_stat_statements_reset();

-- Update initial table statistics
ANALYZE;

-- Log initialization completion
INSERT INTO system_health (metric_name, metric_value, unit, metadata)
VALUES (
    'database_initialization',
    1,
    'completed',
    jsonb_build_object(
        'timestamp', NOW(),
        'version', version(),
        'extensions', ARRAY['vector', 'pg_stat_statements', 'pg_trgm', 'btree_gin'],
        'phase', 'Phase 1 - Political Intelligence Foundation'
    )
);

-- =============================================================================
-- SECURITY HARDENING
-- =============================================================================

-- Revoke unnecessary privileges from public schema
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO lokdarpan_app;
GRANT USAGE ON SCHEMA public TO lokdarpan_monitor;

-- Set secure search path
ALTER DATABASE lokdarpan_db SET search_path = public;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'LokDarpan Phase 1 database initialization completed successfully';
    RAISE NOTICE 'Extensions enabled: vector, pg_stat_statements, pg_trgm, btree_gin';
    RAISE NOTICE 'Users created: lokdarpan_app, lokdarpan_monitor';
    RAISE NOTICE 'Monitoring tables: audit_log, system_health';
    RAISE NOTICE 'Database ready for political intelligence workloads';
END
$$;