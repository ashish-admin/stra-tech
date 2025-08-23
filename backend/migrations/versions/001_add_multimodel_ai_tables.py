"""Add multi-model AI system tables

Revision ID: 001_multimodel_ai
Revises: 
Create Date: 2025-01-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_multimodel_ai'
down_revision = None  # Update this to the latest revision ID
branch_labels = None
depends_on = None


def upgrade():
    # Create extension for pgvector (requires superuser privileges)
    # This should be run manually: CREATE EXTENSION IF NOT EXISTS vector;
    
    # EmbeddingStore table
    op.create_table('embedding_store',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(length=32), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('source_title', sa.String(length=512), nullable=True),
        sa.Column('content_chunk', sa.Text(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(), nullable=False),
        sa.Column('ward_context', sa.String(length=120), nullable=True),
        sa.Column('region_context', sa.String(length=64), nullable=True),
        sa.Column('embedding_vector', sa.Text(), nullable=True),
        sa.Column('embedding_model', sa.String(length=64), nullable=True),
        sa.Column('embedding_dimensions', sa.Integer(), nullable=True),
        sa.Column('content_type', sa.String(length=32), nullable=True),
        sa.Column('language', sa.String(length=8), nullable=True),
        sa.Column('political_relevance_score', sa.Float(), nullable=True),
        sa.Column('credibility_score', sa.Float(), nullable=True),
        sa.Column('fact_check_status', sa.String(length=32), nullable=True),
        sa.Column('processing_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_embedding_store_source_type'), 'embedding_store', ['source_type'], unique=False)
    op.create_index(op.f('ix_embedding_store_published_at'), 'embedding_store', ['published_at'], unique=False)
    op.create_index(op.f('ix_embedding_store_ward_context'), 'embedding_store', ['ward_context'], unique=False)
    op.create_index(op.f('ix_embedding_store_created_at'), 'embedding_store', ['created_at'], unique=False)

    # AIModelExecution table
    op.create_table('ai_model_execution',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('operation_type', sa.String(length=32), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=32), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('prompt_caching_enabled', sa.Boolean(), nullable=True),
        sa.Column('cached_tokens', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('queue_time_ms', sa.Integer(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('cost_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('cost_breakdown', sa.JSON(), nullable=True),
        sa.Column('budget_category', sa.String(length=32), nullable=True),
        sa.Column('success_status', sa.String(length=16), nullable=False),
        sa.Column('error_code', sa.String(length=32), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('user_feedback_score', sa.Float(), nullable=True),
        sa.Column('request_metadata', sa.JSON(), nullable=True),
        sa.Column('response_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_model_execution_request_id'), 'ai_model_execution', ['request_id'], unique=False)
    op.create_index(op.f('ix_ai_model_execution_user_id'), 'ai_model_execution', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_model_execution_created_at'), 'ai_model_execution', ['created_at'], unique=False)

    # GeopoliticalReport table
    op.create_table('geopolitical_report',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_uuid', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('ward_context', sa.String(length=120), nullable=True),
        sa.Column('region_context', sa.String(length=64), nullable=True),
        sa.Column('analysis_depth', sa.String(length=16), nullable=True),
        sa.Column('strategic_context', sa.String(length=16), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('processing_stage', sa.String(length=32), nullable=True),
        sa.Column('priority_level', sa.String(length=16), nullable=True),
        sa.Column('report_title', sa.String(length=512), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('key_findings', sa.JSON(), nullable=True),
        sa.Column('timeline_analysis', sa.JSON(), nullable=True),
        sa.Column('strategic_implications', sa.JSON(), nullable=True),
        sa.Column('scenario_analysis', sa.JSON(), nullable=True),
        sa.Column('recommendations', sa.JSON(), nullable=True),
        sa.Column('full_report_markdown', sa.Text(), nullable=True),
        sa.Column('source_urls', sa.JSON(), nullable=True),
        sa.Column('citation_count', sa.Integer(), nullable=True),
        sa.Column('evidence_quality_score', sa.Float(), nullable=True),
        sa.Column('fact_check_results', sa.JSON(), nullable=True),
        sa.Column('models_used', sa.JSON(), nullable=True),
        sa.Column('total_cost_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('cost_breakdown', sa.JSON(), nullable=True),
        sa.Column('processing_time_seconds', sa.Integer(), nullable=True),
        sa.Column('cache_hit_ratio', sa.Float(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('quality_indicators', sa.JSON(), nullable=True),
        sa.Column('validation_checks', sa.JSON(), nullable=True),
        sa.Column('human_review_status', sa.String(length=16), nullable=True),
        sa.Column('user_feedback', sa.JSON(), nullable=True),
        sa.Column('requested_at', sa.DateTime(), nullable=False),
        sa.Column('started_processing_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=True),
        sa.Column('download_count', sa.Integer(), nullable=True),
        sa.Column('shared_count', sa.Integer(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('archive_reason', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_uuid')
    )
    op.create_index(op.f('ix_geopolitical_report_report_uuid'), 'geopolitical_report', ['report_uuid'], unique=True)
    op.create_index(op.f('ix_geopolitical_report_user_id'), 'geopolitical_report', ['user_id'], unique=False)
    op.create_index(op.f('ix_geopolitical_report_ward_context'), 'geopolitical_report', ['ward_context'], unique=False)
    op.create_index(op.f('ix_geopolitical_report_requested_at'), 'geopolitical_report', ['requested_at'], unique=False)
    op.create_index(op.f('ix_geopolitical_report_completed_at'), 'geopolitical_report', ['completed_at'], unique=False)

    # BudgetTracker table
    op.create_table('budget_tracker',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_type', sa.String(length=16), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('total_budget_usd', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('allocated_by_service', sa.JSON(), nullable=True),
        sa.Column('current_spend_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('spend_by_service', sa.JSON(), nullable=True),
        sa.Column('spend_by_operation', sa.JSON(), nullable=True),
        sa.Column('request_count', sa.Integer(), nullable=True),
        sa.Column('successful_requests', sa.Integer(), nullable=True),
        sa.Column('failed_requests', sa.Integer(), nullable=True),
        sa.Column('total_tokens_processed', sa.BigInteger(), nullable=True),
        sa.Column('budget_status', sa.String(length=16), nullable=True),
        sa.Column('alert_thresholds', sa.JSON(), nullable=True),
        sa.Column('last_alert_sent', sa.DateTime(), nullable=True),
        sa.Column('circuit_breaker_active', sa.Boolean(), nullable=True),
        sa.Column('cost_per_request', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('cost_per_token', sa.Numeric(precision=10, scale=8), nullable=True),
        sa.Column('cache_savings_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('efficiency_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_budget_tracker_period_start'), 'budget_tracker', ['period_start'], unique=False)
    op.create_index(op.f('ix_budget_tracker_period_end'), 'budget_tracker', ['period_end'], unique=False)


def downgrade():
    # Drop all new tables
    op.drop_table('budget_tracker')
    op.drop_table('geopolitical_report')
    op.drop_table('ai_model_execution')
    op.drop_table('embedding_store')