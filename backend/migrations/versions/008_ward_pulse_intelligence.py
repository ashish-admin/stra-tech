"""Ward Pulse Intelligence Infrastructure

Revision ID: 008_ward_pulse_intelligence
Revises: 007_sprint1_performance_optimization
Create Date: 2025-08-22 10:00:00.000000

This migration adds comprehensive ward-level pulse monitoring capabilities
supporting real-time sentiment tracking, momentum indicators, and temporal
analytics for the LokDarpan political intelligence platform.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_ward_pulse_intelligence'
down_revision = '007_sprint1_performance_optimization'
branch_labels = None
depends_on = None


def upgrade():
    # Enhanced Alert System for Crisis Response
    with op.batch_alter_table('alert', schema=None) as batch_op:
        batch_op.add_column(sa.Column('alert_type', sa.String(32), nullable=True, 
                                    comment='crisis|opportunity|routine|strategic'))
        batch_op.add_column(sa.Column('priority_score', sa.Float(), nullable=True,
                                    comment='0.0-1.0 priority ranking for response'))
        batch_op.add_column(sa.Column('response_deadline', sa.DateTime(), nullable=True,
                                    comment='Expected response deadline'))
        batch_op.add_column(sa.Column('status', sa.String(16), nullable=False, 
                                    server_default='active',
                                    comment='active|resolved|escalated|dismissed'))
        batch_op.add_column(sa.Column('assigned_user_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('response_metadata', sa.JSON(), nullable=True,
                                    comment='Response tracking and coordination data'))
        
        # Add foreign key constraint
        batch_op.create_foreign_key('fk_alert_assigned_user', 'user', ['assigned_user_id'], ['id'])
        
        # Add performance indexes
        batch_op.create_index('ix_alert_type_priority', ['alert_type', 'priority_score'])
        batch_op.create_index('ix_alert_status_deadline', ['status', 'response_deadline'])

    # Ward Sentiment Time Series - Partitioned by month for performance
    op.create_table('ward_sentiment_timeseries',
        sa.Column('id', sa.BigInteger(), primary_key=True),
        sa.Column('ward_id', sa.String(64), nullable=False, index=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('sentiment_scores', sa.JSON(), nullable=False,
                 comment='Multi-dimensional sentiment: {joy, anger, fear, trust, anticipation, etc.}'),
        sa.Column('dominant_emotion', sa.String(32), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('sample_size', sa.Integer(), nullable=False, default=0),
        sa.Column('data_sources', sa.JSON(), nullable=True,
                 comment='Source attribution: {news: count, social: count, etc.}'),
        sa.Column('processing_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, 
                 server_default=sa.func.now())
    )
    
    # Composite index for optimal ward-time queries
    op.create_index('ix_sentiment_ward_time', 'ward_sentiment_timeseries', 
                   ['ward_id', 'timestamp'])
    op.create_index('ix_sentiment_emotion_time', 'ward_sentiment_timeseries',
                   ['dominant_emotion', 'timestamp'])

    # Ward Momentum Indicators for trend analysis
    op.create_table('ward_momentum_indicators',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ward_id', sa.String(64), nullable=False, unique=True),
        sa.Column('sentiment_momentum', sa.Float(), nullable=True,
                 comment='Rate of sentiment change over time'),
        sa.Column('engagement_momentum', sa.Float(), nullable=True,
                 comment='Rate of engagement change'),
        sa.Column('issue_emergence_score', sa.Float(), nullable=True,
                 comment='New issues emerging in discussions'),
        sa.Column('political_temperature', sa.Float(), nullable=True,
                 comment='Overall political activity level'),
        sa.Column('trend_direction', sa.String(16), nullable=True,
                 comment='improving|declining|stable|volatile'),
        sa.Column('momentum_drivers', sa.JSON(), nullable=True,
                 comment='Key factors driving momentum changes'),
        sa.Column('forecast_indicators', sa.JSON(), nullable=True,
                 comment='Predictive indicators for next 7/30 days'),
        sa.Column('last_calculated', sa.DateTime(timezone=True), nullable=False),
        sa.Column('calculation_metadata', sa.JSON(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_momentum_trend_temp', 'ward_momentum_indicators',
                   ['trend_direction', 'political_temperature'])

    # Sentiment Snapshot for point-in-time analysis
    op.create_table('sentiment_snapshot',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('snapshot_id', sa.String(36), nullable=False, unique=True),
        sa.Column('ward_id', sa.String(64), nullable=False),
        sa.Column('snapshot_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('analysis_period_hours', sa.Integer(), nullable=False, default=24),
        sa.Column('aggregated_sentiment', sa.JSON(), nullable=False),
        sa.Column('key_topics', sa.JSON(), nullable=True,
                 comment='Top topics driving sentiment'),
        sa.Column('sentiment_distribution', sa.JSON(), nullable=True,
                 comment='Distribution across sentiment categories'),
        sa.Column('comparative_analysis', sa.JSON(), nullable=True,
                 comment='Comparison with previous periods and other wards'),
        sa.Column('confidence_metrics', sa.JSON(), nullable=True),
        sa.Column('data_quality_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now())
    )
    
    op.create_index('ix_snapshot_ward_time', 'sentiment_snapshot',
                   ['ward_id', 'snapshot_time'])

    # Issue Tracking for comprehensive topic analysis
    op.create_table('issue_tracker',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('issue_id', sa.String(36), nullable=False, unique=True),
        sa.Column('ward_id', sa.String(64), nullable=True, index=True),
        sa.Column('issue_title', sa.String(256), nullable=False),
        sa.Column('issue_category', sa.String(64), nullable=False,
                 comment='infrastructure|healthcare|education|security|economy|etc.'),
        sa.Column('severity_level', sa.String(16), nullable=False,
                 comment='low|medium|high|critical'),
        sa.Column('first_detected', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_activity', sa.DateTime(timezone=True), nullable=False),
        sa.Column('mention_count', sa.Integer(), nullable=False, default=0),
        sa.Column('sentiment_trend', sa.String(16), nullable=True,
                 comment='improving|worsening|stable'),
        sa.Column('geographic_spread', sa.JSON(), nullable=True,
                 comment='Which wards are discussing this issue'),
        sa.Column('key_stakeholders', sa.JSON(), nullable=True,
                 comment='Politicians, parties, organizations involved'),
        sa.Column('resolution_status', sa.String(16), nullable=False, 
                 default='active',
                 comment='active|monitoring|resolved|escalated'),
        sa.Column('impact_assessment', sa.JSON(), nullable=True),
        sa.Column('response_recommendations', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_issue_category_severity', 'issue_tracker',
                   ['issue_category', 'severity_level'])
    op.create_index('ix_issue_status_activity', 'issue_tracker',
                   ['resolution_status', 'last_activity'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('issue_tracker')
    op.drop_table('sentiment_snapshot')
    op.drop_table('ward_momentum_indicators')
    op.drop_table('ward_sentiment_timeseries')
    
    # Remove alert enhancements
    with op.batch_alter_table('alert', schema=None) as batch_op:
        batch_op.drop_constraint('fk_alert_assigned_user', type_='foreignkey')
        batch_op.drop_index('ix_alert_status_deadline')
        batch_op.drop_index('ix_alert_type_priority')
        batch_op.drop_column('response_metadata')
        batch_op.drop_column('assigned_user_id')
        batch_op.drop_column('status')
        batch_op.drop_column('response_deadline')
        batch_op.drop_column('priority_score')
        batch_op.drop_column('alert_type')