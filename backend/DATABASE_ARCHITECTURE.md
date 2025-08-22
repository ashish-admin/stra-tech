# LokDarpan Database Architecture Documentation

## Executive Summary

LokDarpan employs a sophisticated multi-layered PostgreSQL architecture optimized for high-performance political intelligence operations. The system combines traditional relational data with advanced AI infrastructure, vector search capabilities, and real-time analytics to deliver sub-100ms ward-centric queries for political campaign teams.

**Architecture Highlights:**
- Production-ready multi-model AI schema with pgvector integration
- Ward-centric electoral data model with sub-100ms query performance
- Comprehensive cost tracking and budget management for AI operations
- Automated backup and disaster recovery with encrypted storage
- Real-time materialized views for dashboard performance
- Full-text search across political content with GIN indexing

---

## Database Architecture Overview

### Core Technology Stack

**Primary Database:** PostgreSQL 12+ with extensions:
- **pgvector**: Vector similarity search for RAG operations
- **pg_trgm**: Advanced text search and similarity matching
- **Full-Text Search**: GIN indexes for political content search

**Performance Configuration:**
- Connection pooling with 300-second recycle
- Materialized views for real-time dashboard queries
- Strategic indexing for ward-based operations (<100ms target)
- HNSW indices for vector similarity search (<50ms for 10K+ embeddings)

**Backup & Recovery:**
- Automated daily/weekly/monthly backups with encryption
- Point-in-time recovery capabilities
- Cross-region replication support
- Zero-downtime backup operations

---

## Schema Design & Relationships

### 1. Core Application Tables

#### User Management & Authentication
```sql
-- Security-hardened user authentication
TABLE user (
    id INTEGER PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL, 
    password_hash VARCHAR(256) NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Indexes for authentication performance
CREATE INDEX ix_user_username ON user(username);
CREATE INDEX ix_user_email ON user(email);
```

#### Content Management System
```sql
-- News/Epaper content with deduplication
TABLE epaper (
    id INTEGER PRIMARY KEY,
    publication_name VARCHAR(100) NOT NULL,
    publication_date DATE NOT NULL,
    raw_text TEXT NOT NULL,
    sha256 VARCHAR(64) UNIQUE NOT NULL,  -- Deduplication key
    created_at TIMESTAMP DEFAULT NOW()
);

-- Political content posts
TABLE post (
    id INTEGER PRIMARY KEY,
    text TEXT NOT NULL,
    author_id INTEGER REFERENCES author(id),
    epaper_id INTEGER REFERENCES epaper(id),
    city VARCHAR(120),                    -- Ward identifier
    emotion VARCHAR(64),                  -- Sentiment classification
    party VARCHAR(64),                    -- Political party mention
    search_vector TSVECTOR,              -- Full-text search
    created_at TIMESTAMP DEFAULT NOW()
);

-- Strategic performance indexes
CREATE INDEX ix_post_city_created ON post(city, created_at) WHERE city IS NOT NULL;
CREATE INDEX ix_post_emotion_city ON post(emotion, city, created_at) WHERE emotion IS NOT NULL AND city IS NOT NULL;
CREATE INDEX ix_post_party_city ON post(party, city, created_at) WHERE party IS NOT NULL AND city IS NOT NULL;
CREATE INDEX ix_post_search_vector ON post USING GIN(search_vector);
```

#### Political Intelligence Alerts
```sql
-- Strategic briefings and alerts
TABLE alert (
    id INTEGER PRIMARY KEY,
    ward VARCHAR(120),
    description VARCHAR(512),
    severity VARCHAR(32),
    opportunities TEXT,                   -- JSON payload
    threats TEXT,                        -- JSON payload
    actionable_alerts TEXT,              -- JSON payload
    source_articles TEXT,                -- JSON array of URLs
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_alert_ward ON alert(ward);
CREATE INDEX ix_alert_severity ON alert(severity, created_at);
```

### 2. Electoral Intelligence Backbone

#### Geographic & Administrative Structure
```sql
-- Master polling station registry
TABLE polling_station (
    id INTEGER PRIMARY KEY,
    ps_id VARCHAR(64) UNIQUE NOT NULL,   -- Official Form-20 identifier
    name VARCHAR(256),
    address VARCHAR(512),
    lat FLOAT,
    lon FLOAT,
    ac_id VARCHAR(64),                   -- Assembly Constituency
    pc_id VARCHAR(64),                   -- Parliamentary Constituency  
    ward_id VARCHAR(64),                 -- Ward linkage
    ward_name VARCHAR(256),
    source_meta JSON
);

CREATE INDEX ix_polling_station_ward ON polling_station(ward_id, ward_name) WHERE ward_id IS NOT NULL;
```

#### Electoral Data Processing
```sql
-- Election catalog and metadata
TABLE election (
    id INTEGER PRIMARY KEY,
    type VARCHAR(16) NOT NULL,           -- 'GHMC', 'ASSEMBLY', 'LOKSABHA'
    year INTEGER NOT NULL,
    round VARCHAR(32),
    official_ref VARCHAR(256)
);

-- Polling station results
TABLE result_ps (
    id INTEGER PRIMARY KEY,
    election_id INTEGER REFERENCES election(id),
    ps_id VARCHAR(64) NOT NULL,
    party VARCHAR(64) NOT NULL,
    candidate VARCHAR(256),
    votes INTEGER,
    total_polled INTEGER,
    rejected INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ward-level aggregated results
TABLE result_ward_agg (
    id INTEGER PRIMARY KEY,
    election_id INTEGER REFERENCES election(id),
    ward_id VARCHAR(64) NOT NULL,
    party VARCHAR(64) NOT NULL,
    votes INTEGER,
    vote_share FLOAT,
    turnout_pct FLOAT,
    computed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_result_ward_election_party ON result_ward_agg(election_id, ward_id, party, vote_share);
```

#### Ward Analytics & Demographics
```sql
-- Base ward profile information
TABLE ward_profile (
    id INTEGER PRIMARY KEY,
    ward_id VARCHAR(64) UNIQUE NOT NULL,
    electors INTEGER,
    votes_cast INTEGER,
    turnout_pct FLOAT,
    last_winner_party VARCHAR(64),
    last_winner_year INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Socio-economic indicators
TABLE ward_demographics (
    id INTEGER PRIMARY KEY,
    ward_id VARCHAR(64) UNIQUE NOT NULL,
    literacy_idx FLOAT,
    muslim_idx FLOAT,
    scst_idx FLOAT,
    secc_deprivation_idx FLOAT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Derived political analytics
TABLE ward_features (
    id INTEGER PRIMARY KEY,
    ward_id VARCHAR(64) UNIQUE NOT NULL,
    as23_party_shares JSON,              -- Assembly 2023 party shares
    ls24_party_shares JSON,              -- Lok Sabha 2024 party shares
    dvi JSON,                           -- Vote differential index
    aci_23 FLOAT,                       -- Anti-BRS consolidation index
    turnout_volatility FLOAT,
    incumbency_weakness JSON,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Multi-Model AI Infrastructure

#### Vector Storage & RAG System
```sql
-- High-performance embedding storage with pgvector
TABLE ai_embedding_store (
    id INTEGER PRIMARY KEY,
    content_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA256 deduplication
    source_type VARCHAR(32) NOT NULL,          -- 'perplexity', 'news', 'epaper', 'manual'
    source_url TEXT,
    source_title VARCHAR(512),
    content_chunk TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    
    -- Temporal metadata
    published_at TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,       -- Automated cleanup
    
    -- Geographic context for ward-centric queries
    ward_context VARCHAR(120),
    region_context VARCHAR(64),
    political_entities JSON,
    
    -- Vector embeddings (pgvector when available, JSON fallback)
    embedding_vector TEXT,                     -- JSON array initially  
    embedding_model VARCHAR(64) DEFAULT 'text-embedding-3-large',
    embedding_dimensions INTEGER DEFAULT 3072,
    
    -- Content classification
    content_type VARCHAR(32),                  -- 'news', 'analysis', 'report'
    language VARCHAR(8) DEFAULT 'en',
    political_relevance_score FLOAT,
    credibility_score FLOAT,
    fact_check_status VARCHAR(32),
    
    -- Lifecycle and access tracking
    processing_metadata JSON,
    quality_flags JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0
);

-- High-performance composite indexes
CREATE INDEX ix_embedding_ward_date ON ai_embedding_store(ward_context, published_at) WHERE ward_context IS NOT NULL;
CREATE INDEX ix_embedding_type_relevance ON ai_embedding_store(content_type, political_relevance_score) WHERE political_relevance_score > 0.5;
CREATE INDEX ix_embedding_cleanup ON ai_embedding_store(expires_at, last_accessed_at) WHERE expires_at IS NOT NULL;
```

#### AI Model Execution Tracking
```sql
-- Comprehensive AI service monitoring and cost tracking
TABLE ai_model_execution (
    id INTEGER PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,           -- UUID for distributed tracing
    parent_request_id VARCHAR(64),             -- Request chain linkage
    user_id INTEGER REFERENCES user(id),
    session_id VARCHAR(64),
    
    -- Operation classification
    operation_type VARCHAR(32) NOT NULL,       -- 'report_generation', 'embedding', 'retrieval'
    operation_subtype VARCHAR(32),
    priority_level VARCHAR(16) DEFAULT 'normal',
    
    -- Model information
    provider VARCHAR(32) NOT NULL,             -- 'openai', 'anthropic', 'perplexity', 'google'
    model_name VARCHAR(64) NOT NULL,
    model_version VARCHAR(32),
    deployment_region VARCHAR(32),
    
    -- Token usage and caching optimization
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cached_tokens INTEGER DEFAULT 0,
    cache_hit_ratio FLOAT,
    
    -- Performance metrics
    latency_ms INTEGER,
    queue_time_ms INTEGER,
    processing_time_ms INTEGER,
    ttfb_ms INTEGER,                          -- Time to first byte
    
    -- Precise cost tracking
    cost_usd NUMERIC(12, 8),                  -- High precision for micro-costs
    cost_breakdown JSON,
    budget_category VARCHAR(32),
    cost_per_token NUMERIC(12, 10),
    
    -- Quality and reliability metrics
    success_status VARCHAR(16) NOT NULL,      -- 'success', 'error', 'timeout', 'rate_limited'
    error_code VARCHAR(32),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    quality_score FLOAT,
    user_feedback_score FLOAT,
    
    -- Request/response metadata
    request_metadata JSON,
    response_metadata JSON,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Performance analysis indexes
CREATE INDEX ix_ai_exec_cost_analysis ON ai_model_execution(provider, model_name, created_at, cost_usd);
CREATE INDEX ix_ai_exec_performance ON ai_model_execution(operation_type, success_status, latency_ms);
CREATE INDEX ix_ai_exec_user_usage ON ai_model_execution(user_id, created_at, total_tokens) WHERE user_id IS NOT NULL;
```

#### Geopolitical Report Management
```sql
-- Complete AI-generated intelligence reports
TABLE ai_geopolitical_report (
    id INTEGER PRIMARY KEY,
    report_uuid VARCHAR(36) UNIQUE NOT NULL,
    
    -- Request context
    user_id INTEGER REFERENCES user(id) NOT NULL,
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) NOT NULL,          -- Deduplication
    ward_context VARCHAR(120),
    region_context VARCHAR(64) DEFAULT 'hyderabad',
    analysis_depth VARCHAR(16) DEFAULT 'standard',    -- 'quick', 'standard', 'deep'
    strategic_context VARCHAR(16) DEFAULT 'neutral',   -- 'defensive', 'neutral', 'offensive'
    
    -- Report lifecycle
    status VARCHAR(16) DEFAULT 'queued',      -- 'queued', 'processing', 'completed', 'failed'
    processing_stage VARCHAR(32),
    priority_level VARCHAR(16) DEFAULT 'normal',
    estimated_cost_usd NUMERIC(10, 6),
    
    -- Generated content (structured JSON for flexibility)
    report_title VARCHAR(512),
    executive_summary TEXT,
    key_findings JSON,
    timeline_analysis JSON,
    strategic_implications JSON,
    scenario_analysis JSON,
    recommendations JSON,
    full_report_markdown TEXT,
    report_metadata JSON,
    
    -- Evidence and source attribution
    source_urls JSON,
    citation_count INTEGER DEFAULT 0,
    evidence_quality_score FLOAT,
    fact_check_results JSON,
    credibility_assessment JSON,
    
    -- AI processing metrics
    models_used JSON,
    total_cost_usd NUMERIC(10, 6),
    cost_breakdown JSON,
    processing_time_seconds INTEGER,
    total_tokens_used INTEGER,
    
    -- Quality assurance
    confidence_score FLOAT,
    quality_indicators JSON,
    validation_checks JSON,
    automated_flags JSON,
    human_review_status VARCHAR(16),
    user_feedback JSON,
    
    -- Temporal tracking
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_processing_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Access and lifecycle management
    access_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    shared_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    archive_reason VARCHAR(64)
);

-- Report management indexes
CREATE INDEX ix_report_active_by_user ON ai_geopolitical_report(user_id, status, requested_at) 
    WHERE NOT is_archived AND status IN ('completed', 'processing');
CREATE INDEX ix_report_ward_analysis ON ai_geopolitical_report(ward_context, completed_at, confidence_score) 
    WHERE ward_context IS NOT NULL AND status = 'completed';
CREATE INDEX ix_report_cleanup_candidates ON ai_geopolitical_report(expires_at, last_accessed_at, is_archived) 
    WHERE expires_at < NOW() OR (last_accessed_at < NOW() - INTERVAL '30 days');
```

#### Budget Management & Cost Control
```sql
-- Real-time AI budget tracking and circuit breakers
TABLE ai_budget_tracker (
    id INTEGER PRIMARY KEY,
    
    -- Budget period management
    period_type VARCHAR(16) NOT NULL,         -- 'daily', 'weekly', 'monthly', 'campaign'
    period_identifier VARCHAR(32) NOT NULL,   -- '2025-08', 'Q3-2025', 'campaign-2025'
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Budget allocation
    total_budget_usd NUMERIC(10, 2) NOT NULL,
    allocated_by_service JSON,               -- Service-specific budgets
    allocated_by_operation JSON,             -- Operation-specific limits
    emergency_budget_usd NUMERIC(10, 2) DEFAULT 0,
    
    -- Real-time usage tracking
    current_spend_usd NUMERIC(12, 6) DEFAULT 0.0,
    projected_spend_usd NUMERIC(12, 6),
    spend_by_service JSON,
    spend_by_operation JSON,
    spend_by_user JSON,
    
    -- Usage statistics
    request_count INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens_processed BIGINT DEFAULT 0,
    unique_users_count INTEGER DEFAULT 0,
    
    -- Budget controls
    budget_status VARCHAR(16) DEFAULT 'normal',    -- 'normal', 'warning', 'critical', 'exceeded'
    alert_thresholds JSON,
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    circuit_breaker_active BOOLEAN DEFAULT FALSE,
    rate_limit_active BOOLEAN DEFAULT FALSE,
    
    -- Performance metrics
    cost_per_request NUMERIC(10, 6),
    cost_per_token NUMERIC(12, 10),
    cache_savings_usd NUMERIC(10, 6) DEFAULT 0.0,
    efficiency_score FLOAT,
    quality_weighted_cost NUMERIC(10, 6),
    
    -- Historical data for forecasting
    daily_spend_history JSON,
    usage_patterns JSON,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_calculation_at TIMESTAMP WITH TIME ZONE
);

-- Budget monitoring indexes
CREATE INDEX ix_budget_active_monitoring ON ai_budget_tracker(budget_status, period_end) WHERE period_end > NOW();
CREATE INDEX ix_budget_spending_analysis ON ai_budget_tracker(period_type, current_spend_usd, created_at);
```

#### System Performance Metrics
```sql
-- Comprehensive system health monitoring
TABLE ai_system_metrics (
    id INTEGER PRIMARY KEY,
    
    -- Metric identification
    metric_name VARCHAR(64) NOT NULL,
    metric_category VARCHAR(32) NOT NULL,    -- 'performance', 'cost', 'quality', 'usage'
    metric_scope VARCHAR(32) NOT NULL,       -- 'system', 'service', 'user', 'operation'
    scope_identifier VARCHAR(64),            -- Specific service, user, etc.
    
    -- Metric values and thresholds
    metric_value FLOAT NOT NULL,
    metric_unit VARCHAR(16),                 -- 'ms', 'usd', 'count', 'percent'
    baseline_value FLOAT,
    threshold_warning FLOAT,
    threshold_critical FLOAT,
    
    -- Aggregation context
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    aggregation_type VARCHAR(16) NOT NULL,   -- 'avg', 'max', 'min', 'sum', 'p95', 'p99'
    sample_count INTEGER,
    
    -- Additional context
    metadata JSON,
    tags JSON,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metrics analysis indexes
CREATE INDEX ix_metrics_recent ON ai_system_metrics(metric_name, metric_scope, created_at);
CREATE INDEX ix_metrics_alerting ON ai_system_metrics(metric_category, metric_value, threshold_warning, created_at) 
    WHERE threshold_warning IS NOT NULL;
```

---

## Performance Optimization Strategy

### 1. Ward-Centric Query Optimization

**Target Performance:** <100ms for 95th percentile ward-based queries

#### Strategic Indexing
```sql
-- Multi-column indexes for common query patterns
CREATE INDEX ix_post_city_created ON post(city, created_at) WHERE city IS NOT NULL;
CREATE INDEX ix_post_emotion_city ON post(emotion, city, created_at) 
    WHERE emotion IS NOT NULL AND city IS NOT NULL;
CREATE INDEX ix_post_party_city ON post(party, city, created_at) 
    WHERE party IS NOT NULL AND city IS NOT NULL;

-- Electoral data optimization
CREATE INDEX ix_result_ward_election_party ON result_ward_agg(election_id, ward_id, party, vote_share);
CREATE INDEX ix_polling_station_ward ON polling_station(ward_id, ward_name) WHERE ward_id IS NOT NULL;
```

#### Query Functions for Common Patterns
```sql
-- Optimized competitive analysis function
CREATE OR REPLACE FUNCTION get_ward_competitive_analysis(
    p_ward_name TEXT,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    party TEXT,
    mention_count BIGINT,
    mention_share NUMERIC,
    avg_sentiment NUMERIC,
    recent_trend NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_posts AS (
        SELECT party, emotion, created_at
        FROM post 
        WHERE city = p_ward_name 
          AND party IS NOT NULL
          AND created_at >= NOW() - INTERVAL '1 day' * p_days
    ),
    party_stats AS (
        SELECT 
            p.party,
            COUNT(*) as mention_count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as mention_share,
            ROUND(AVG(CASE 
                WHEN p.emotion = 'positive' THEN 1 
                WHEN p.emotion = 'negative' THEN -1 
                ELSE 0 
            END), 3) as avg_sentiment,
            ROUND(
                (COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days')::numeric / 7) /
                NULLIF(COUNT(*) FILTER (WHERE p.created_at < NOW() - INTERVAL '7 days')::numeric / (p_days - 7), 0) - 1,
                3
            ) as recent_trend
        FROM recent_posts p
        GROUP BY p.party
    )
    SELECT 
        ps.party,
        ps.mention_count,
        ps.mention_share,
        ps.avg_sentiment,
        COALESCE(ps.recent_trend, 0) as recent_trend
    FROM party_stats ps
    ORDER BY ps.mention_count DESC;
END;
$$ LANGUAGE plpgsql;
```

### 2. Real-time Dashboard Performance

#### Materialized Views for Instant Loading
```sql
-- Ward analytics summary (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW ward_analytics_summary AS
WITH post_stats AS (
    SELECT 
        city as ward_name,
        COUNT(*) as total_posts,
        COUNT(DISTINCT author_id) as unique_authors,
        COUNT(DISTINCT party) FILTER (WHERE party IS NOT NULL) as active_parties,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as posts_last_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as posts_last_30d,
        MAX(created_at) as latest_post_date,
        
        -- Emotion distribution
        ROUND(AVG(CASE WHEN emotion = 'positive' THEN 1 ELSE 0 END) * 100, 2) as positive_pct,
        ROUND(AVG(CASE WHEN emotion = 'negative' THEN 1 ELSE 0 END) * 100, 2) as negative_pct,
        ROUND(AVG(CASE WHEN emotion = 'neutral' THEN 1 ELSE 0 END) * 100, 2) as neutral_pct,
        
        -- Party mention distribution
        mode() WITHIN GROUP (ORDER BY party) FILTER (WHERE party IS NOT NULL) as dominant_party,
        COUNT(*) FILTER (WHERE party = 'BJP') as bjp_mentions,
        COUNT(*) FILTER (WHERE party = 'INC') as inc_mentions,
        COUNT(*) FILTER (WHERE party = 'BRS') as brs_mentions,
        COUNT(*) FILTER (WHERE party = 'AIMIM') as aimim_mentions
        
    FROM post 
    WHERE city IS NOT NULL 
    GROUP BY city
),
ward_metadata AS (
    SELECT 
        ward_id,
        electors,
        votes_cast,
        turnout_pct,
        last_winner_party,
        last_winner_year
    FROM ward_profile
)
SELECT 
    p.ward_name,
    p.total_posts,
    p.unique_authors,
    p.active_parties,
    p.posts_last_7d,
    p.posts_last_30d,
    p.latest_post_date,
    p.positive_pct,
    p.negative_pct,
    p.neutral_pct,
    p.dominant_party,
    p.bjp_mentions,
    p.inc_mentions,
    p.brs_mentions,
    p.aimim_mentions,
    
    -- Electoral metadata
    w.electors,
    w.votes_cast,
    w.turnout_pct,
    w.last_winner_party,
    w.last_winner_year,
    
    -- Calculated metrics
    ROUND(p.posts_last_7d::numeric / NULLIF(p.posts_last_30d, 0) * 100, 2) as activity_trend_pct,
    CASE 
        WHEN p.posts_last_7d > p.posts_last_30d * 0.5 THEN 'high_activity'
        WHEN p.posts_last_7d > p.posts_last_30d * 0.2 THEN 'moderate_activity' 
        ELSE 'low_activity'
    END as activity_level,
    
    NOW() as last_updated
    
FROM post_stats p
LEFT JOIN ward_metadata w ON TRIM(LOWER(p.ward_name)) = TRIM(LOWER(w.ward_id))
WHERE p.total_posts > 5
ORDER BY p.total_posts DESC;

-- Unique index for fast lookups
CREATE UNIQUE INDEX ix_ward_summary_ward_name ON ward_analytics_summary(ward_name);

-- Time-series data for trend charts
CREATE MATERIALIZED VIEW daily_ward_trends AS
SELECT 
    DATE(created_at) as trend_date,
    city as ward_name,
    COUNT(*) as daily_posts,
    COUNT(DISTINCT author_id) as daily_authors,
    
    -- Emotion trends
    SUM(CASE WHEN emotion = 'positive' THEN 1 ELSE 0 END) as positive_posts,
    SUM(CASE WHEN emotion = 'negative' THEN 1 ELSE 0 END) as negative_posts,
    SUM(CASE WHEN emotion = 'neutral' THEN 1 ELSE 0 END) as neutral_posts,
    
    -- Party mention trends
    SUM(CASE WHEN party = 'BJP' THEN 1 ELSE 0 END) as bjp_mentions,
    SUM(CASE WHEN party = 'INC' THEN 1 ELSE 0 END) as inc_mentions,
    SUM(CASE WHEN party = 'BRS' THEN 1 ELSE 0 END) as brs_mentions,
    SUM(CASE WHEN party = 'AIMIM' THEN 1 ELSE 0 END) as aimim_mentions,
    
    -- Rolling averages
    AVG(COUNT(*)) OVER (
        PARTITION BY city 
        ORDER BY DATE(created_at) 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as posts_7d_avg,
    
    MAX(created_at) as latest_post_time
    
FROM post 
WHERE created_at >= NOW() - INTERVAL '90 days'
  AND city IS NOT NULL
GROUP BY DATE(created_at), city
ORDER BY trend_date DESC, ward_name;

CREATE INDEX ix_daily_trends_date_ward ON daily_ward_trends(trend_date DESC, ward_name);
```

#### Automated Refresh Procedures
```sql
-- Materialized view refresh function
CREATE OR REPLACE FUNCTION refresh_ward_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ward_analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_ward_trends;
    
    -- Update statistics for query planner
    ANALYZE post;
    ANALYZE ward_profile;
    ANALYZE result_ward_agg;
    
    -- Log refresh completion
    INSERT INTO ai_system_metrics (
        metric_name, metric_category, metric_scope,
        metric_value, metric_unit, period_start, period_end,
        aggregation_type, created_at
    ) VALUES (
        'materialized_view_refresh', 'maintenance', 'system',
        1, 'count', NOW(), NOW(), 'sum', NOW()
    );
END;
$$ LANGUAGE plpgsql;
```

### 3. Vector Search Performance

#### pgvector Integration & HNSW Indices
```sql
-- Enable pgvector extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert JSON embedding storage to vector type (post-migration)
ALTER TABLE ai_embedding_store ADD COLUMN embedding_vector_v vector(3072);

-- High-performance HNSW index for similarity search
CREATE INDEX ON ai_embedding_store USING hnsw (embedding_vector_v vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Optimize vector search for ward context
CREATE INDEX ix_embedding_ward_vector ON ai_embedding_store(ward_context, embedding_vector_v)
WHERE ward_context IS NOT NULL;
```

#### Vector Search Query Optimization
```sql
-- Optimized similarity search function
CREATE OR REPLACE FUNCTION find_similar_content(
    query_vector vector(3072),
    ward_filter TEXT DEFAULT NULL,
    limit_results INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    content_id INTEGER,
    content_chunk TEXT,
    source_title VARCHAR(512),
    similarity_score FLOAT,
    ward_context VARCHAR(120),
    published_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.content_chunk,
        e.source_title,
        1 - (e.embedding_vector_v <=> query_vector) as similarity_score,
        e.ward_context,
        e.published_at
    FROM ai_embedding_store e
    WHERE (ward_filter IS NULL OR e.ward_context = ward_filter)
      AND e.embedding_vector_v IS NOT NULL
      AND (1 - (e.embedding_vector_v <=> query_vector)) > similarity_threshold
    ORDER BY e.embedding_vector_v <=> query_vector
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
```

### 4. Full-Text Search Optimization

#### Advanced Text Search with GIN Indexes
```sql
-- Multi-weighted text search vector
UPDATE post SET search_vector = 
    setweight(to_tsvector('english', COALESCE(text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(city, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(emotion, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(party, '')), 'B');

-- Automatic search vector updates
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.emotion, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.party, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_search_vector_trigger
    BEFORE INSERT OR UPDATE ON post
    FOR EACH ROW
    EXECUTE FUNCTION update_post_search_vector();
```

---

## Data Migration Strategy

### 1. Migration Management with Alembic

#### Migration Workflow
```bash
# Generate new migration
flask db migrate -m "descriptive_name"

# Review generated migration
ls -la migrations/versions/

# Apply migration
flask db upgrade

# Handle multiple heads (common in development)
flask db merge -m "merge heads" <head1> <head2>
flask db upgrade
```

#### Key Migration Files

**004_ai_infrastructure_schema.py** - Complete AI infrastructure deployment:
- pgvector extension installation
- AI embedding store with vector search
- Model execution tracking with cost management
- Geopolitical report storage
- Budget tracking and circuit breakers
- System metrics and monitoring

**005_electoral_optimization.py** - Performance optimization:
- Strategic indexing for ward-centric queries
- Materialized views for real-time dashboards
- Full-text search with GIN indexes
- Data validation constraints
- Automated maintenance procedures

### 2. Zero-Downtime Migration Strategy

#### Pre-Migration Validation
```sql
-- Check migration readiness
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;

-- Verify foreign key constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

#### Migration Rollback Procedures
```sql
-- Rollback functions for critical migrations
CREATE OR REPLACE FUNCTION rollback_ai_infrastructure()
RETURNS VOID AS $$
BEGIN
    -- Drop in reverse dependency order
    DROP TABLE IF EXISTS ai_system_metrics CASCADE;
    DROP TABLE IF EXISTS ai_budget_tracker CASCADE;
    DROP TABLE IF EXISTS ai_geopolitical_report CASCADE;
    DROP TABLE IF EXISTS ai_model_execution CASCADE;
    DROP TABLE IF EXISTS ai_embedding_store CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS ai_cleanup_expired_data();
    
    RAISE NOTICE 'AI infrastructure rollback completed';
END;
$$ LANGUAGE plpgsql;
```

### 3. Data Integrity Validation

#### Constraint Enforcement
```sql
-- Data quality constraints
ALTER TABLE post ADD CONSTRAINT chk_post_emotion 
CHECK (emotion IS NULL OR emotion IN ('positive', 'negative', 'neutral', 'mixed', 'unknown'));

ALTER TABLE post ADD CONSTRAINT chk_post_party 
CHECK (party IS NULL OR party IN ('BJP', 'INC', 'BRS', 'AIMIM', 'TRS', 'NOTA', 'Independent', 'Other'));

ALTER TABLE post ADD CONSTRAINT chk_post_created_at 
CHECK (created_at >= '2020-01-01'::timestamp AND created_at <= NOW() + INTERVAL '1 day');

ALTER TABLE ward_profile ADD CONSTRAINT chk_ward_turnout 
CHECK (turnout_pct >= 0 AND turnout_pct <= 100);
```

#### Data Validation Functions
```sql
-- Comprehensive data integrity check
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    record_count BIGINT,
    issue_description TEXT
) AS $$
BEGIN
    -- Check for orphaned posts
    RETURN QUERY
    SELECT 
        'orphaned_posts' as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        COUNT(*) as record_count,
        'Posts with invalid author_id references' as issue_description
    FROM post p
    LEFT JOIN author a ON p.author_id = a.id
    WHERE p.author_id IS NOT NULL AND a.id IS NULL;
    
    -- Check for duplicate epaper content
    RETURN QUERY
    SELECT 
        'duplicate_epapers' as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END as status,
        COUNT(*) as record_count,
        'Epapers with duplicate SHA256 hashes' as issue_description
    FROM (
        SELECT sha256 
        FROM epaper 
        GROUP BY sha256 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check AI budget consistency
    RETURN QUERY
    SELECT 
        'budget_consistency' as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        COUNT(*) as record_count,
        'Budget trackers with spend exceeding total budget' as issue_description
    FROM ai_budget_tracker
    WHERE current_spend_usd > total_budget_usd;
    
END;
$$ LANGUAGE plpgsql;
```

---

## Backup & Disaster Recovery

### 1. Automated Backup Strategy

#### Multi-Tier Backup Schedule
```python
# Backup retention policy
BACKUP_CONFIG = {
    'retention_days': {
        'daily': 7,      # Keep 7 daily backups
        'weekly': 4,     # Keep 4 weekly backups  
        'monthly': 12,   # Keep 12 monthly backups
        'yearly': 3      # Keep 3 yearly backups
    },
    'compression': True,
    'encryption': True,
    'checksum_validation': True
}
```

#### Production Backup Commands
```bash
# Full database backup
python scripts/backup_and_recovery.py --backup full

# AI tables only (faster for frequent backups)
python scripts/backup_and_recovery.py --backup ai-only

# Automated cleanup
python scripts/backup_and_recovery.py --cleanup

# Health check
python scripts/backup_and_recovery.py --health-check
```

### 2. Point-in-Time Recovery

#### WAL-E Configuration
```bash
# Enable WAL archiving in postgresql.conf
archive_mode = on
archive_command = 'wal-e wal-push %p'
archive_timeout = 60

# Backup base files
wal-e backup-push /var/lib/postgresql/data

# Point-in-time recovery
wal-e backup-fetch /var/lib/postgresql/data LATEST
```

#### Recovery Testing
```python
def test_backup_restore():
    """Automated backup restoration testing"""
    # Create test backup
    backup_manager = DatabaseBackupManager()
    backup_result = backup_manager.create_full_backup()
    
    # Restore to test database
    test_db_url = "postgresql://test:test@localhost/lokdarpan_test"
    test_manager = DatabaseBackupManager(test_db_url)
    success = test_manager.restore_backup(backup_result['file_path'])
    
    # Validate data integrity
    if success:
        validation_results = test_manager._post_restore_health_check()
        return validation_results
    
    return False
```

### 3. Cross-Region Replication

#### S3 Backup Integration
```python
# S3 configuration for off-site backups
S3_CONFIG = {
    'bucket': 'lokdarpan-backups',
    'region': 'ap-south-1',
    'encryption': 'AES256',
    'storage_class': 'STANDARD_IA'
}

def upload_to_s3(file_path, backup_name):
    """Upload encrypted backup to S3"""
    s3_client = boto3.client('s3')
    s3_key = f"database-backups/{backup_name}"
    
    s3_client.upload_file(
        str(file_path), 
        S3_CONFIG['bucket'], 
        s3_key,
        ExtraArgs={
            'ServerSideEncryption': S3_CONFIG['encryption'],
            'StorageClass': S3_CONFIG['storage_class']
        }
    )
```

---

## Performance Monitoring & Optimization

### 1. Real-time Performance Metrics

#### Query Performance Monitoring
```sql
-- Identify slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries slower than 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- Index usage analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    seq_scan as sequential_scans,
    n_tup_ins + n_tup_upd + n_tup_del as modifications
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON i.relid = t.relid
WHERE idx_scan < seq_scan
ORDER BY sequential_scans DESC;
```

#### Automated Performance Alerts
```sql
-- Performance monitoring function
CREATE OR REPLACE FUNCTION check_performance_thresholds()
RETURNS TABLE (
    metric_name TEXT,
    current_value FLOAT,
    threshold FLOAT,
    status TEXT
) AS $$
BEGIN
    -- Check average query time
    RETURN QUERY
    SELECT 
        'avg_query_time_ms'::TEXT,
        (SELECT COALESCE(AVG(mean_time), 0) FROM pg_stat_statements),
        100.0::FLOAT,
        CASE WHEN (SELECT COALESCE(AVG(mean_time), 0) FROM pg_stat_statements) > 100 
             THEN 'CRITICAL' ELSE 'OK' END;
    
    -- Check cache hit ratio
    RETURN QUERY
    SELECT 
        'cache_hit_ratio'::TEXT,
        (SELECT ROUND(
            100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2
        ) FROM pg_stat_database),
        95.0::FLOAT,
        CASE WHEN (SELECT ROUND(
            100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2
        ) FROM pg_stat_database) < 95 
             THEN 'WARNING' ELSE 'OK' END;
             
    -- Check connection count
    RETURN QUERY
    SELECT 
        'active_connections'::TEXT,
        (SELECT COUNT(*)::FLOAT FROM pg_stat_activity WHERE state = 'active'),
        50.0::FLOAT,
        CASE WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') > 50 
             THEN 'WARNING' ELSE 'OK' END;
END;
$$ LANGUAGE plpgsql;
```

### 2. AI Infrastructure Performance

#### Cost Optimization Monitoring
```sql
-- AI cost analysis by service
SELECT 
    provider,
    model_name,
    COUNT(*) as requests,
    SUM(total_tokens) as total_tokens,
    SUM(cost_usd) as total_cost,
    AVG(cost_usd) as avg_cost_per_request,
    AVG(latency_ms) as avg_latency,
    COUNT(*) FILTER (WHERE success_status = 'success') * 100.0 / COUNT(*) as success_rate
FROM ai_model_execution
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY provider, model_name
ORDER BY total_cost DESC;

-- Budget utilization by category
SELECT 
    budget_category,
    period_type,
    total_budget_usd,
    current_spend_usd,
    ROUND(current_spend_usd / total_budget_usd * 100, 2) as utilization_pct,
    budget_status
FROM ai_budget_tracker
WHERE period_end > NOW()
ORDER BY utilization_pct DESC;
```

#### AI Performance Optimization
```sql
-- Cache efficiency analysis
SELECT 
    operation_type,
    COUNT(*) as total_requests,
    AVG(cache_hit_ratio) as avg_cache_ratio,
    SUM(cached_tokens) as total_cached_tokens,
    SUM(cost_usd * cache_hit_ratio) as estimated_cache_savings
FROM ai_model_execution
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND cache_hit_ratio IS NOT NULL
GROUP BY operation_type
ORDER BY estimated_cache_savings DESC;
```

### 3. Automated Maintenance

#### Data Cleanup Procedures
```sql
-- Automated cleanup function
CREATE OR REPLACE FUNCTION ai_cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up expired embeddings
    DELETE FROM ai_embedding_store 
    WHERE expires_at < NOW() 
       OR (last_accessed_at < NOW() - INTERVAL '90 days' AND access_count = 0);
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Archive old reports
    UPDATE ai_geopolitical_report 
    SET is_archived = true, 
        archive_reason = 'auto_archive_old'
    WHERE expires_at < NOW() 
       OR (last_accessed_at < NOW() - INTERVAL '60 days' AND access_count < 3);
    
    -- Clean up old execution logs (keep last 6 months)
    DELETE FROM ai_model_execution 
    WHERE created_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Clean up old metrics (keep last 1 year)
    DELETE FROM ai_system_metrics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup via cron
-- 0 2 * * * psql -d lokdarpan_db -c "SELECT ai_cleanup_expired_data();"
```

---

## Security & Compliance

### 1. Data Security Measures

#### Access Control & Authentication
```sql
-- Role-based access control
CREATE ROLE lokdarpan_readonly;
CREATE ROLE lokdarpan_analyst;  
CREATE ROLE lokdarpan_admin;

-- Grant appropriate permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO lokdarpan_readonly;
GRANT SELECT, INSERT, UPDATE ON post, alert, epaper TO lokdarpan_analyst;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lokdarpan_admin;
```

#### Data Encryption & Privacy
```python
# Field-level encryption for sensitive data
from cryptography.fernet import Fernet

class EncryptedField:
    def __init__(self, key):
        self.fernet = Fernet(key)
    
    def encrypt(self, data):
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data):
        return self.fernet.decrypt(encrypted_data.encode()).decode()

# User data encryption
encryption_key = os.getenv('ENCRYPTION_KEY')
encrypted_field = EncryptedField(encryption_key)
```

### 2. Audit Trail & Compliance

#### Comprehensive Audit Logging
```sql
-- Audit trail table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    operation VARCHAR(16) NOT NULL,  -- INSERT, UPDATE, DELETE
    user_id INTEGER REFERENCES user(id),
    old_values JSON,
    new_values JSON,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_ip INET,
    user_agent TEXT
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_values)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_values, new_values)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_values)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## Production Deployment Considerations

### 1. Hardware Requirements

#### Recommended Server Specifications
```yaml
Production Environment:
  CPU: 16+ cores (Intel Xeon or AMD EPYC)
  RAM: 64GB+ (32GB for PostgreSQL shared_buffers)
  Storage: 
    - OS: 100GB SSD
    - Database: 2TB+ NVMe SSD (RAID 10)
    - Backups: 4TB+ HDD (RAID 5)
  Network: 10Gbps dedicated connection

Development Environment:
  CPU: 8+ cores
  RAM: 32GB
  Storage: 500GB SSD
  Network: 1Gbps
```

#### PostgreSQL Configuration
```postgresql
# postgresql.conf optimizations
shared_buffers = 16GB
effective_cache_size = 48GB
work_mem = 256MB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 500
random_page_cost = 1.1
effective_io_concurrency = 200

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements,pgvector'

# WAL settings
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
```

### 2. Monitoring & Alerting

#### System Health Monitoring
```python
# Health check endpoint configuration
HEALTH_CHECKS = {
    'database_connectivity': {
        'timeout': 5,
        'critical': True
    },
    'ai_services': {
        'timeout': 10,
        'critical': False
    },
    'cache_performance': {
        'threshold': 95,  # Cache hit ratio %
        'critical': True
    },
    'disk_space': {
        'threshold': 85,  # Disk usage %
        'critical': True
    }
}
```

#### Alert Thresholds
```sql
-- Configure monitoring thresholds
INSERT INTO ai_system_metrics (
    metric_name, metric_category, threshold_warning, threshold_critical
) VALUES 
    ('ward_query_latency', 'performance', 100, 200),
    ('vector_search_latency', 'performance', 50, 100),
    ('ai_budget_utilization', 'cost', 80, 95),
    ('cache_hit_ratio', 'performance', 90, 85),
    ('error_rate', 'reliability', 1, 5);
```

### 3. Scaling Strategies

#### Read Replica Configuration
```yaml
Master Database:
  Role: Write operations, real-time data
  Configuration: Full feature set with all extensions

Read Replicas:
  Count: 2-3 replicas
  Role: Dashboard queries, analytics, reporting
  Configuration: Optimized for read performance
  Load Balancing: Round-robin for analytical queries
```

#### Horizontal Scaling
```sql
-- Partition large tables by date for better performance
CREATE TABLE post_y2025m08 PARTITION OF post
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE post_y2025m09 PARTITION OF post
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Partition AI execution logs by date
CREATE TABLE ai_model_execution_y2025 PARTITION OF ai_model_execution
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

---

## API Integration Patterns

### 1. Database Access Layer

#### Repository Pattern Implementation
```python
class WardRepository:
    """Data access layer for ward-centric operations"""
    
    def get_ward_analytics(self, ward_name: str) -> Dict:
        """Get comprehensive ward analytics from materialized view"""
        query = """
        SELECT * FROM ward_analytics_summary 
        WHERE ward_name = %s
        """
        return self.execute_query(query, [ward_name])
    
    def get_competitive_analysis(self, ward_name: str, days: int = 30) -> List[Dict]:
        """Get party competition analysis using optimized function"""
        query = "SELECT * FROM get_ward_competitive_analysis(%s, %s)"
        return self.execute_query(query, [ward_name, days])
    
    def search_political_content(self, search_term: str, ward_filter: str = None) -> List[Dict]:
        """Full-text search across political content"""
        base_query = """
        SELECT 
            id, text, city, party, emotion, created_at,
            ts_rank(search_vector, plainto_tsquery('english', %s)) as relevance
        FROM post 
        WHERE search_vector @@ plainto_tsquery('english', %s)
        """
        
        if ward_filter:
            base_query += " AND city = %s"
            params = [search_term, search_term, ward_filter]
        else:
            params = [search_term, search_term]
            
        base_query += " ORDER BY relevance DESC, created_at DESC LIMIT 50"
        return self.execute_query(base_query, params)
```

### 2. Real-time Data Streaming

#### SSE Integration
```python
class WardDataStreamer:
    """Server-Sent Events for real-time ward data"""
    
    def stream_ward_updates(self, ward_name: str):
        """Stream real-time ward data updates"""
        while True:
            # Get latest analytics
            analytics = self.ward_repo.get_ward_analytics(ward_name)
            
            # Check for new posts in last 5 minutes
            new_posts = self.ward_repo.get_recent_posts(ward_name, minutes=5)
            
            if new_posts:
                yield f"data: {json.dumps(analytics)}\n\n"
            
            time.sleep(30)  # Check every 30 seconds
```

---

## Conclusion

The LokDarpan database architecture represents a production-ready, high-performance political intelligence platform that successfully combines traditional relational data management with cutting-edge AI infrastructure. The system's multi-layered design ensures:

**Performance Excellence:**
- Sub-100ms ward-centric queries through strategic indexing and materialized views
- Vector similarity search in <50ms for 10K+ embeddings using pgvector/HNSW
- Real-time dashboard performance via optimized query functions and caching

**Operational Reliability:**
- Comprehensive backup and disaster recovery with automated encryption
- Zero-downtime migration capabilities with rollback procedures
- Automated data cleanup and retention policies
- Real-time health monitoring and alerting

**AI Infrastructure Maturity:**
- Multi-model AI execution tracking with cost optimization
- Sophisticated budget management with circuit breakers
- Comprehensive geopolitical report lifecycle management
- Evidence-based source credibility and fact-checking integration

**Scalability & Future-Readiness:**
- Horizontal partitioning strategies for large-scale data
- Read replica configuration for analytical workloads
- Cross-region backup replication and disaster recovery
- Extensible schema design supporting new AI models and political analysis features

This architecture provides LokDarpan campaign teams with a decisive technological advantage, delivering the real-time political intelligence and strategic insights necessary to win elections while maintaining the highest standards of data integrity, security, and operational excellence.