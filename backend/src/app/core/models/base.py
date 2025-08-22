"""
SQLAlchemy models for the LokDarpan backend.

This module defines the ORM models used by the application.  In addition to
the basic user and content models (User, Author, Post, Alert), it introduces
several tables to support ward-level electoral intelligence.  These new
structures enable fine-grained aggregation of polling station results and the
storage of demographic and derived analytic features for each ward.  When
adding or modifying tables here remember to run a database migration so that
changes are applied consistently across environments.

The additional models defined in this file are:

* PollingStation – master record for each polling station with geospatial
  location and associated ward/assembly/lok sabha information.
* Election – catalog of elections (GHMC, Assembly, Lok Sabha) and cycles.
* ResultPS – results at polling station level for a given election.
* ResultWardAgg – ward-level aggregation of polling station results.
* WardProfile – snapshot of electors, votes cast and last winner by ward.
* WardDemographics – normalized socio-economic indices per ward.
* WardFeatures – derived analytics such as vote differentials and turnout
  volatility per ward.

These tables are designed to be orthogonal to the existing posts/alerts
schema to avoid regressions in current functionality.  See the project
documentation for more details about the meaning of each field.
"""

from datetime import datetime, timezone, timedelta
from flask_login import UserMixin
from sqlalchemy.sql import func
from werkzeug.security import check_password_hash, generate_password_hash
from .extensions import db

class User(UserMixin, db.Model):
    """Basic user account with secure password handling."""

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    failed_login_attempts = db.Column(db.Integer, nullable=False, default=0)
    last_failed_login = db.Column(db.DateTime, nullable=True)

    def set_password(self, password: str) -> None:
        """Set password hash."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def is_account_locked(self) -> bool:
        """Check if account is locked due to failed login attempts."""
        if self.failed_login_attempts >= 5:
            # Lock for 15 minutes after 5 failed attempts
            if self.last_failed_login:
                lockout_time = datetime.now(timezone.utc) - timedelta(minutes=15)
                # Handle timezone-naive datetime from SQLite
                last_failed = self.last_failed_login
                if last_failed.tzinfo is None:
                    last_failed = last_failed.replace(tzinfo=timezone.utc)
                return last_failed > lockout_time
        return False
    
    def record_failed_login(self) -> None:
        """Record a failed login attempt."""
        self.failed_login_attempts += 1
        self.last_failed_login = datetime.now(timezone.utc)
    
    def record_successful_login(self) -> None:
        """Record a successful login and reset failed attempts."""
        self.failed_login_attempts = 0
        self.last_failed_login = None
        self.last_login = datetime.now(timezone.utc)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.username}>"

# at top, alongside other imports
# from flask_login import UserMixin   # already present
# from .extensions import db          # already present

# --- Epaper (raw archive) ---
class Epaper(db.Model):
    __tablename__ = "epaper"

    id = db.Column(db.Integer, primary_key=True)
    publication_name = db.Column(db.String(100), nullable=False)
    publication_date = db.Column(db.Date, nullable=False, index=True)
    raw_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, index=True, default=lambda: datetime.now(timezone.utc))
    sha256 = db.Column(db.String(64), nullable=False, unique=True, index=True)

    # Optional helper to access mirrored posts
    posts = db.relationship("Post", backref="epaper", lazy=True)

    def __repr__(self):
        return f"<Epaper {self.publication_name} {self.publication_date}>"

class Author(db.Model):
    """Content author for posts; optional party affiliation."""

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    party = db.Column(db.String(64), nullable=True)  # optional party field

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Author {self.name}>"


class Post(db.Model):
    __tablename__ = "post"

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('author.id'))
    author = db.relationship('Author', backref='posts')
    city = db.Column(db.String(120))
    emotion = db.Column(db.String(64))
    party = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, nullable=False, index=True,
                           default=lambda: datetime.now(timezone.utc))
    # NEW: FK to Epaper
    epaper_id = db.Column(db.Integer, db.ForeignKey("epaper.id"), index=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Post {self.id} city={self.city}>"


class Alert(db.Model):
    """Table for storing strategic alerts and briefings generated by the system."""

    id = db.Column(db.Integer, primary_key=True)
    # Ward identifier or context for the alert (e.g. "Jubilee Hills").
    ward = db.Column(db.String(120), index=True)
    # High level priority message (used by proactive analysis).
    description = db.Column(db.String(512))
    # Severity level for the alert (e.g. "High", "Medium", "Info").
    severity = db.Column(db.String(32))
    # JSON payload of opportunities extracted from analysis.
    opportunities = db.Column(db.Text)
    # JSON payload of threats extracted from analysis.
    threats = db.Column(db.Text)
    # JSON payload of actionable alert items.
    actionable_alerts = db.Column(db.Text)
    # JSON array of article URLs used as evidence.
    source_articles = db.Column(db.Text)
    # Timestamp of creation.
    created_at = db.Column(db.DateTime, nullable=False, index=True,
                           default=func.now())
    # Timestamp of last update.
    updated_at = db.Column(db.DateTime, nullable=False, index=True,
                           default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Alert {self.ward} severity={self.severity}>"


# ---------------------------------------------------------------------------
# Electoral spine tables
# ---------------------------------------------------------------------------

class PollingStation(db.Model):
    """Master record for each polling station including geolocation and
    administrative mapping to wards, assembly constituencies (AC) and
    parliamentary constituencies (PC).  The ps_id should correspond to the
    official identifier in Form-20 documents.  Lat/lon coordinates are
    optional and can be populated via geocoding during ETL.
    """

    __tablename__ = 'polling_station'

    id = db.Column(db.Integer, primary_key=True)
    ps_id = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(256))
    address = db.Column(db.String(512))
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    ac_id = db.Column(db.String(64))
    pc_id = db.Column(db.String(64))
    ward_id = db.Column(db.String(64), index=True)
    ward_name = db.Column(db.String(256))
    source_meta = db.Column(db.JSON)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PS {self.ps_id} ward={self.ward_id}>"


class Election(db.Model):
    """Catalog of elections (GHMC, ASSEMBLY, LOKSABHA) and cycles."""

    __tablename__ = 'election'

    id = db.Column(db.Integer, primary_key=True)
    # Election type: 'GHMC', 'ASSEMBLY', 'LOKSABHA'
    type = db.Column(db.String(16), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    round = db.Column(db.String(32))
    official_ref = db.Column(db.String(256))  # link or id to official source

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Election {self.type} {self.year}>"


class ResultPS(db.Model):
    """Polling station level election result."""

    __tablename__ = 'result_ps'

    id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('election.id'), nullable=False)
    ps_id = db.Column(db.String(64), nullable=False)
    party = db.Column(db.String(64), nullable=False)
    candidate = db.Column(db.String(256))
    votes = db.Column(db.Integer)
    total_polled = db.Column(db.Integer)
    rejected = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ResultPS ps_id={self.ps_id} party={self.party} votes={self.votes}>"


class ResultWardAgg(db.Model):
    """Aggregated ward-level election result derived from polling station results."""

    __tablename__ = 'result_ward_agg'

    id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('election.id'), nullable=False)
    ward_id = db.Column(db.String(64), nullable=False, index=True)
    party = db.Column(db.String(64), nullable=False)
    votes = db.Column(db.Integer)
    vote_share = db.Column(db.Float)  # percentage share within ward
    turnout_pct = db.Column(db.Float)
    computed_at = db.Column(db.DateTime, nullable=False, default=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ResultWardAgg ward={self.ward_id} party={self.party}>"


class WardProfile(db.Model):
    """Snapshot of base turnout and last winner information for a ward."""

    __tablename__ = 'ward_profile'

    id = db.Column(db.Integer, primary_key=True)
    ward_id = db.Column(db.String(64), unique=True, nullable=False)
    electors = db.Column(db.Integer)
    votes_cast = db.Column(db.Integer)
    turnout_pct = db.Column(db.Float)
    last_winner_party = db.Column(db.String(64))
    last_winner_year = db.Column(db.Integer)
    updated_at = db.Column(db.DateTime, nullable=False, default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WardProfile {self.ward_id}>"


class WardDemographics(db.Model):
    """Normalized socio-economic indices per ward."""

    __tablename__ = 'ward_demographics'

    id = db.Column(db.Integer, primary_key=True)
    ward_id = db.Column(db.String(64), unique=True, nullable=False)
    literacy_idx = db.Column(db.Float)
    muslim_idx = db.Column(db.Float)
    scst_idx = db.Column(db.Float)
    secc_deprivation_idx = db.Column(db.Float)
    updated_at = db.Column(db.DateTime, nullable=False, default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WardDemographics {self.ward_id}>"


class WardFeatures(db.Model):
    """Derived analytics and comparative features for a ward."""

    __tablename__ = 'ward_features'

    id = db.Column(db.Integer, primary_key=True)
    ward_id = db.Column(db.String(64), unique=True, nullable=False)
    # Party share dictionaries keyed by party name (e.g. {"BJP": 0.32, ...}).
    as23_party_shares = db.Column(db.JSON)
    ls24_party_shares = db.Column(db.JSON)
    # Vote differential index per party (LS24 share minus AS23 share).
    dvi = db.Column(db.JSON)
    # Anti-BRS consolidation index (INC + BJP share in AS23).
    aci_23 = db.Column(db.Float)
    # Turnout volatility across cycles (standard deviation).
    turnout_volatility = db.Column(db.Float)
    # Incumbency weakness factors per party.
    incumbency_weakness = db.Column(db.JSON)
    updated_at = db.Column(db.DateTime, nullable=False, default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WardFeatures {self.ward_id}>"


# ---------------------------------------------------------------------------
# Multi-Model AI System Tables
# ---------------------------------------------------------------------------

class EmbeddingStore(db.Model):
    """Vector embeddings store for RAG system with pgvector support.
    
    Stores document chunks with their vector embeddings for similarity search.
    Supports both OpenAI embeddings and local model embeddings with configurable
    dimensions based on the embedding model used.
    """
    
    __tablename__ = 'embedding_store'
    
    id = db.Column(db.Integer, primary_key=True)
    # Content metadata
    source_type = db.Column(db.String(32), nullable=False, index=True)  # 'perplexity', 'news', 'epaper', 'manual'
    source_url = db.Column(db.Text)
    source_title = db.Column(db.String(512))
    content_chunk = db.Column(db.Text, nullable=False)
    chunk_index = db.Column(db.Integer, default=0)  # for multi-chunk documents
    
    # Temporal metadata
    published_at = db.Column(db.DateTime, index=True)
    fetched_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Geographic context
    ward_context = db.Column(db.String(120), index=True)  # associated ward if relevant
    region_context = db.Column(db.String(64))  # 'hyderabad', 'telangana', 'india', 'global'
    
    # Vector embedding - using pgvector extension
    # Default to 3072 dimensions for OpenAI text-embedding-3-large
    # Will be 1536 for text-embedding-3-small or 4096 for local models
    embedding_vector = db.Column(db.Text)  # Store as JSON until pgvector setup
    embedding_model = db.Column(db.String(64), default='text-embedding-3-large')
    embedding_dimensions = db.Column(db.Integer, default=3072)
    
    # Content classification
    content_type = db.Column(db.String(32))  # 'news', 'analysis', 'report', 'social'
    language = db.Column(db.String(8), default='en')
    political_relevance_score = db.Column(db.Float)  # 0.0-1.0 relevance to political content
    
    # Metadata for quality and provenance
    credibility_score = db.Column(db.Float)  # source credibility rating
    fact_check_status = db.Column(db.String(32))  # 'verified', 'disputed', 'unverified'
    processing_metadata = db.Column(db.JSON)  # store processing details, costs, etc.
    
    created_at = db.Column(db.DateTime, nullable=False, index=True, 
                          default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, 
                          default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self) -> str:
        return f"<EmbeddingStore {self.id} {self.source_type} ward={self.ward_context}>"


class AIModelExecution(db.Model):
    """Track AI model usage, costs, and performance across the multi-model system.
    
    This table provides comprehensive tracking of all AI service calls for cost
    monitoring, performance optimization, and quality analysis.
    """
    
    __tablename__ = 'ai_model_execution'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Execution context
    request_id = db.Column(db.String(64), nullable=False, index=True)  # UUID for request tracking
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), index=True)
    operation_type = db.Column(db.String(32), nullable=False)  # 'report_generation', 'embedding', 'retrieval', 'synthesis'
    
    # Model information
    provider = db.Column(db.String(32), nullable=False)  # 'openai', 'anthropic', 'perplexity', 'local_llama'
    model_name = db.Column(db.String(64), nullable=False)  # 'claude-3-sonnet', 'gpt-4', 'sonar', 'llama-4-instruct'
    model_version = db.Column(db.String(32))  # track model versions for reproducibility
    
    # Request details
    input_tokens = db.Column(db.Integer)
    output_tokens = db.Column(db.Integer)
    total_tokens = db.Column(db.Integer)
    prompt_caching_enabled = db.Column(db.Boolean, default=False)
    cached_tokens = db.Column(db.Integer, default=0)
    
    # Performance metrics
    latency_ms = db.Column(db.Integer)  # response time in milliseconds
    queue_time_ms = db.Column(db.Integer)  # time spent in queue
    processing_time_ms = db.Column(db.Integer)  # actual model processing time
    
    # Cost tracking
    cost_usd = db.Column(db.Numeric(10, 6))  # precise cost tracking
    cost_breakdown = db.Column(db.JSON)  # detailed cost components
    budget_category = db.Column(db.String(32))  # 'retrieval', 'synthesis', 'embeddings', 'fallback'
    
    # Quality metrics
    success_status = db.Column(db.String(16), nullable=False)  # 'success', 'error', 'timeout', 'rate_limited'
    error_code = db.Column(db.String(32))
    error_message = db.Column(db.Text)
    quality_score = db.Column(db.Float)  # 0.0-1.0 output quality assessment
    user_feedback_score = db.Column(db.Float)  # user rating if available
    
    # Request metadata
    request_metadata = db.Column(db.JSON)  # store request parameters, context
    response_metadata = db.Column(db.JSON)  # store response headers, additional data
    
    created_at = db.Column(db.DateTime, nullable=False, index=True,
                          default=lambda: datetime.now(timezone.utc))
    
    def __repr__(self) -> str:
        return f"<AIModelExecution {self.request_id} {self.provider}/{self.model_name} cost=${self.cost_usd}>"


class GeopoliticalReport(db.Model):
    """Generated geopolitical intelligence reports with full metadata and provenance.
    
    Stores complete reports generated by the multi-model AI system including
    all source materials, analysis chains, and cost tracking.
    """
    
    __tablename__ = 'geopolitical_report'
    
    id = db.Column(db.Integer, primary_key=True)
    report_uuid = db.Column(db.String(36), unique=True, nullable=False, index=True)
    
    # Request context
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    query_text = db.Column(db.Text, nullable=False)
    ward_context = db.Column(db.String(120), index=True)
    region_context = db.Column(db.String(64), default='hyderabad')
    analysis_depth = db.Column(db.String(16), default='standard')  # 'quick', 'standard', 'deep'
    strategic_context = db.Column(db.String(16), default='neutral')  # 'defensive', 'neutral', 'offensive'
    
    # Report status and lifecycle
    status = db.Column(db.String(16), nullable=False, default='queued')  # 'queued', 'processing', 'completed', 'failed'
    processing_stage = db.Column(db.String(32))  # current processing stage for progress tracking
    priority_level = db.Column(db.String(16), default='normal')  # 'urgent', 'high', 'normal', 'low'
    
    # Generated content
    report_title = db.Column(db.String(512))
    executive_summary = db.Column(db.Text)
    key_findings = db.Column(db.JSON)  # structured key findings
    timeline_analysis = db.Column(db.JSON)  # chronological events
    strategic_implications = db.Column(db.JSON)  # strategic analysis
    scenario_analysis = db.Column(db.JSON)  # best/worst/likely scenarios
    recommendations = db.Column(db.JSON)  # actionable recommendations
    full_report_markdown = db.Column(db.Text)  # complete report in markdown
    
    # Source attribution and evidence
    source_urls = db.Column(db.JSON)  # all source URLs with metadata
    citation_count = db.Column(db.Integer, default=0)
    evidence_quality_score = db.Column(db.Float)  # 0.0-1.0 source quality
    fact_check_results = db.Column(db.JSON)  # fact checking outcomes
    
    # AI processing metadata
    models_used = db.Column(db.JSON)  # track which models contributed
    total_cost_usd = db.Column(db.Numeric(10, 6))
    cost_breakdown = db.Column(db.JSON)  # detailed cost attribution
    processing_time_seconds = db.Column(db.Integer)
    cache_hit_ratio = db.Column(db.Float)  # efficiency metric
    
    # Quality and validation
    confidence_score = db.Column(db.Float)  # overall confidence in report
    quality_indicators = db.Column(db.JSON)  # various quality metrics
    validation_checks = db.Column(db.JSON)  # automated validation results
    human_review_status = db.Column(db.String(16))  # 'pending', 'reviewed', 'approved'
    user_feedback = db.Column(db.JSON)  # user ratings and feedback
    
    # Temporal tracking
    requested_at = db.Column(db.DateTime, nullable=False, index=True,
                           default=lambda: datetime.now(timezone.utc))
    started_processing_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime, index=True)
    last_accessed_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)  # for automatic cleanup
    
    # Report archival and access
    access_count = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    shared_count = db.Column(db.Integer, default=0)
    is_archived = db.Column(db.Boolean, default=False)
    archive_reason = db.Column(db.String(64))
    
    def __repr__(self) -> str:
        return f"<GeopoliticalReport {self.report_uuid} ward={self.ward_context} status={self.status}>"
    
    @property
    def is_processing(self) -> bool:
        return self.status in ['queued', 'processing']
    
    @property
    def is_completed(self) -> bool:
        return self.status == 'completed'
    
    @property
    def processing_duration_seconds(self) -> int:
        if self.started_processing_at and self.completed_at:
            return int((self.completed_at - self.started_processing_at).total_seconds())
        return 0


class BudgetTracker(db.Model):
    """Track AI service budget usage with real-time monitoring and controls.
    
    Provides comprehensive budget management across all AI services with
    automatic alerts and circuit breaker functionality.
    """
    
    __tablename__ = 'budget_tracker'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Budget period
    period_type = db.Column(db.String(16), nullable=False)  # 'daily', 'weekly', 'monthly'
    period_start = db.Column(db.DateTime, nullable=False, index=True)
    period_end = db.Column(db.DateTime, nullable=False, index=True)
    
    # Budget allocation
    total_budget_usd = db.Column(db.Numeric(10, 2), nullable=False)
    allocated_by_service = db.Column(db.JSON)  # budget breakdown by service
    
    # Current usage
    current_spend_usd = db.Column(db.Numeric(10, 6), default=0.0)
    spend_by_service = db.Column(db.JSON)  # actual spend by service
    spend_by_operation = db.Column(db.JSON)  # spend by operation type
    
    # Usage tracking
    request_count = db.Column(db.Integer, default=0)
    successful_requests = db.Column(db.Integer, default=0)
    failed_requests = db.Column(db.Integer, default=0)
    total_tokens_processed = db.Column(db.BigInteger, default=0)
    
    # Budget status and controls
    budget_status = db.Column(db.String(16), default='normal')  # 'normal', 'warning', 'critical', 'exceeded'
    alert_thresholds = db.Column(db.JSON)  # configurable alert thresholds
    last_alert_sent = db.Column(db.DateTime)
    circuit_breaker_active = db.Column(db.Boolean, default=False)
    
    # Optimization metrics
    cost_per_request = db.Column(db.Numeric(10, 6))
    cost_per_token = db.Column(db.Numeric(10, 8))
    cache_savings_usd = db.Column(db.Numeric(10, 6), default=0.0)
    efficiency_score = db.Column(db.Float)  # cost efficiency rating
    
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, 
                          default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self) -> str:
        return f"<BudgetTracker {self.period_type} ${self.current_spend_usd}/${self.total_budget_usd}>"
    
    @property
    def budget_utilization_percent(self) -> float:
        if self.total_budget_usd > 0:
            return float(self.current_spend_usd / self.total_budget_usd * 100)
        return 0.0
    
    @property
    def remaining_budget_usd(self) -> float:
        return float(self.total_budget_usd - self.current_spend_usd)
    
    @property
    def is_over_budget(self) -> bool:
        return self.current_spend_usd > self.total_budget_usd
