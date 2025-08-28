"""Crisis Response and Performance Optimization

Revision ID: 011_crisis_response_system
Revises: 010_demographic_intelligence
Create Date: 2025-08-22 13:00:00.000000

This migration implements comprehensive crisis response workflows, performance
monitoring, and real-time coordination capabilities for political intelligence
crisis management with sub-15-minute response times.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011_crisis_response_system'
down_revision = '010a_ward_query_performance_optimization'
branch_labels = None
depends_on = None


def upgrade():
    # Crisis Event Tracking for comprehensive crisis management
    op.create_table('crisis_event',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('crisis_id', sa.String(36), nullable=False, unique=True),
        sa.Column('title', sa.String(256), nullable=False),
        sa.Column('crisis_type', sa.String(32), nullable=False,
                 comment='political|infrastructure|social|security|natural|economic'),
        sa.Column('severity_level', sa.String(16), nullable=False,
                 comment='low|medium|high|critical|catastrophic'),
        sa.Column('geographic_scope', sa.JSON(), nullable=False,
                 comment='Affected wards and regions'),
        sa.Column('affected_population_estimate', sa.Integer(), nullable=True),
        sa.Column('crisis_description', sa.Text(), nullable=False),
        sa.Column('initial_trigger', sa.Text(), nullable=True,
                 comment='What initially triggered this crisis'),
        sa.Column('current_status', sa.String(16), nullable=False,
                 default='active',
                 comment='developing|active|contained|resolved|escalating'),
        sa.Column('timeline_progression', sa.JSON(), nullable=True,
                 comment='Key events and timeline progression'),
        sa.Column('stakeholders_involved', sa.JSON(), nullable=True,
                 comment='Key parties, officials, organizations involved'),
        sa.Column('media_coverage_level', sa.String(16), nullable=True,
                 comment='none|local|regional|national|international'),
        sa.Column('social_media_activity', sa.JSON(), nullable=True,
                 comment='Social media metrics and sentiment'),
        sa.Column('political_implications', sa.JSON(), nullable=True,
                 comment='Potential political impacts and opportunities'),
        sa.Column('response_priority', sa.String(16), nullable=False,
                 comment='immediate|urgent|high|medium|low'),
        sa.Column('resource_requirements', sa.JSON(), nullable=True,
                 comment='Personnel, budget, materials needed'),
        sa.Column('communication_strategy', sa.JSON(), nullable=True,
                 comment='Planned communication approach'),
        sa.Column('success_metrics', sa.JSON(), nullable=True,
                 comment='How to measure successful resolution'),
        sa.Column('lessons_learned', sa.JSON(), nullable=True,
                 comment='Key learnings from crisis management'),
        sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('first_response_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_crisis_severity_status', 'crisis_event',
                   ['severity_level', 'current_status'])
    op.create_index('ix_crisis_priority_detected', 'crisis_event',
                   ['response_priority', 'detected_at'])

    # Response Workflow for coordinated crisis response
    op.create_table('response_workflow',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('workflow_id', sa.String(36), nullable=False, unique=True),
        sa.Column('crisis_id', sa.String(36), nullable=False),
        sa.Column('workflow_name', sa.String(128), nullable=False),
        sa.Column('workflow_type', sa.String(32), nullable=False,
                 comment='communication|investigation|mitigation|coordination'),
        sa.Column('priority_level', sa.String(16), nullable=False),
        sa.Column('assigned_team', sa.JSON(), nullable=True,
                 comment='Team members assigned to this workflow'),
        sa.Column('workflow_steps', sa.JSON(), nullable=False,
                 comment='Detailed steps and their status'),
        sa.Column('current_step', sa.Integer(), nullable=False, default=1),
        sa.Column('step_deadlines', sa.JSON(), nullable=True,
                 comment='Deadlines for each step'),
        sa.Column('resources_allocated', sa.JSON(), nullable=True),
        sa.Column('dependencies', sa.JSON(), nullable=True,
                 comment='Other workflows or resources this depends on'),
        sa.Column('communication_protocols', sa.JSON(), nullable=True,
                 comment='How and when to communicate progress'),
        sa.Column('escalation_triggers', sa.JSON(), nullable=True,
                 comment='When to escalate or change approach'),
        sa.Column('success_criteria', sa.JSON(), nullable=True),
        sa.Column('risk_mitigation', sa.JSON(), nullable=True,
                 comment='Identified risks and mitigation strategies'),
        sa.Column('status', sa.String(16), nullable=False, default='planned',
                 comment='planned|active|blocked|completed|cancelled'),
        sa.Column('completion_percentage', sa.Float(), nullable=False, default=0.0),
        sa.Column('estimated_completion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_completion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('performance_metrics', sa.JSON(), nullable=True,
                 comment='Time to complete, quality metrics, etc.'),
        sa.Column('lessons_learned', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_foreign_key('fk_workflow_crisis', 'response_workflow',
                         'crisis_event', ['crisis_id'], ['crisis_id'])
    op.create_index('ix_workflow_crisis_status', 'response_workflow',
                   ['crisis_id', 'status'])
    op.create_index('ix_workflow_priority_step', 'response_workflow',
                   ['priority_level', 'current_step'])

    # Crisis Performance Metrics for analytics
    op.create_table('crisis_performance_metrics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('metrics_id', sa.String(36), nullable=False, unique=True),
        sa.Column('crisis_id', sa.String(36), nullable=False),
        sa.Column('measurement_period', sa.String(16), nullable=False,
                 comment='realtime|hourly|daily|final'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('response_time_metrics', sa.JSON(), nullable=False,
                 comment='Time from detection to first response, full response'),
        sa.Column('communication_metrics', sa.JSON(), nullable=True,
                 comment='Message reach, engagement, sentiment'),
        sa.Column('stakeholder_satisfaction', sa.JSON(), nullable=True,
                 comment='Feedback from stakeholders and affected parties'),
        sa.Column('media_coverage_analysis', sa.JSON(), nullable=True,
                 comment='Media sentiment, reach, key messages'),
        sa.Column('social_media_metrics', sa.JSON(), nullable=True,
                 comment='Mentions, sentiment, viral potential'),
        sa.Column('resource_utilization', sa.JSON(), nullable=True,
                 comment='Personnel time, budget spent, resources used'),
        sa.Column('outcome_assessment', sa.JSON(), nullable=True,
                 comment='Achievement of objectives, unintended consequences'),
        sa.Column('public_perception_impact', sa.JSON(), nullable=True,
                 comment='Polling data, sentiment changes, reputation impact'),
        sa.Column('political_capital_impact', sa.JSON(), nullable=True,
                 comment='Effect on political standing and relationships'),
        sa.Column('lessons_learned_impact', sa.JSON(), nullable=True,
                 comment='Improvements for future crisis response'),
        sa.Column('benchmark_comparisons', sa.JSON(), nullable=True,
                 comment='How this response compares to similar past crises'),
        sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now())
    )
    
    op.create_foreign_key('fk_metrics_crisis', 'crisis_performance_metrics',
                         'crisis_event', ['crisis_id'], ['crisis_id'])
    op.create_index('ix_metrics_crisis_period', 'crisis_performance_metrics',
                   ['crisis_id', 'measurement_period', 'period_start'])

    # Real-time Notification System
    op.create_table('real_time_notification',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('notification_id', sa.String(36), nullable=False, unique=True),
        sa.Column('notification_type', sa.String(32), nullable=False,
                 comment='crisis_alert|workflow_update|deadline_warning|escalation'),
        sa.Column('priority_level', sa.String(16), nullable=False,
                 comment='critical|high|medium|low|info'),
        sa.Column('target_audience', sa.JSON(), nullable=False,
                 comment='Who should receive this notification'),
        sa.Column('title', sa.String(256), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('context_data', sa.JSON(), nullable=True,
                 comment='Additional context for the notification'),
        sa.Column('action_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('action_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('related_crisis_id', sa.String(36), nullable=True),
        sa.Column('related_workflow_id', sa.String(36), nullable=True),
        sa.Column('delivery_channels', sa.JSON(), nullable=False,
                 comment='email|sms|push|dashboard|all'),
        sa.Column('delivery_status', sa.JSON(), nullable=True,
                 comment='Status of delivery through each channel'),
        sa.Column('read_receipts', sa.JSON(), nullable=True,
                 comment='Who has read this notification'),
        sa.Column('response_tracking', sa.JSON(), nullable=True,
                 comment='Responses and actions taken'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    op.create_foreign_key('fk_notification_crisis', 'real_time_notification',
                         'crisis_event', ['related_crisis_id'], ['crisis_id'])
    op.create_foreign_key('fk_notification_workflow', 'real_time_notification',
                         'response_workflow', ['related_workflow_id'], ['workflow_id'])
    op.create_index('ix_notification_priority_created', 'real_time_notification',
                   ['priority_level', 'created_at'])
    op.create_index('ix_notification_type_expires', 'real_time_notification',
                   ['notification_type', 'expires_at'])

    # Communication Log for tracking all crisis communications
    op.create_table('crisis_communication_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('communication_id', sa.String(36), nullable=False, unique=True),
        sa.Column('crisis_id', sa.String(36), nullable=False),
        sa.Column('communication_type', sa.String(32), nullable=False,
                 comment='press_release|social_media|direct_message|public_statement'),
        sa.Column('channel', sa.String(64), nullable=False,
                 comment='twitter|facebook|press|email|sms|website|other'),
        sa.Column('target_audience', sa.String(64), nullable=False,
                 comment='public|media|stakeholders|affected_parties|internal'),
        sa.Column('message_title', sa.String(256), nullable=True),
        sa.Column('message_content', sa.Text(), nullable=False),
        sa.Column('message_tone', sa.String(16), nullable=True,
                 comment='informative|reassuring|urgent|apologetic|defensive'),
        sa.Column('key_messages', sa.JSON(), nullable=True,
                 comment='Key points being communicated'),
        sa.Column('call_to_action', sa.Text(), nullable=True),
        sa.Column('sent_by_user_id', sa.Integer(), nullable=False),
        sa.Column('approved_by_user_id', sa.Integer(), nullable=True),
        sa.Column('reach_estimate', sa.Integer(), nullable=True),
        sa.Column('engagement_metrics', sa.JSON(), nullable=True,
                 comment='Likes, shares, comments, etc.'),
        sa.Column('sentiment_feedback', sa.JSON(), nullable=True,
                 comment='Public response sentiment analysis'),
        sa.Column('effectiveness_score', sa.Float(), nullable=True,
                 comment='How effective was this communication'),
        sa.Column('follow_up_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now())
    )
    
    op.create_foreign_key('fk_comm_crisis', 'crisis_communication_log',
                         'crisis_event', ['crisis_id'], ['crisis_id'])
    op.create_foreign_key('fk_comm_sender', 'crisis_communication_log',
                         'user', ['sent_by_user_id'], ['id'])
    op.create_foreign_key('fk_comm_approver', 'crisis_communication_log',
                         'user', ['approved_by_user_id'], ['id'])
    op.create_index('ix_comm_crisis_channel', 'crisis_communication_log',
                   ['crisis_id', 'channel'])
    op.create_index('ix_comm_sent_effectiveness', 'crisis_communication_log',
                   ['sent_at', 'effectiveness_score'])

    # Performance optimization views for quick access
    op.execute("""
        CREATE VIEW ward_crisis_summary AS
        SELECT 
            w.ward_id,
            COUNT(ce.id) as total_crises,
            COUNT(CASE WHEN ce.severity_level IN ('high', 'critical', 'catastrophic') THEN 1 END) as high_severity_crises,
            COUNT(CASE WHEN ce.current_status = 'active' THEN 1 END) as active_crises,
            AVG(EXTRACT(EPOCH FROM (ce.first_response_at - ce.detected_at))/60) as avg_response_time_minutes,
            MAX(ce.detected_at) as last_crisis_date
        FROM ward_profile w
        LEFT JOIN crisis_event ce ON ce.geographic_scope::jsonb ? w.ward_id
        GROUP BY w.ward_id;
    """)


def downgrade():
    # Drop views
    op.execute("DROP VIEW IF EXISTS ward_crisis_summary;")
    
    # Drop tables in reverse order
    op.drop_table('crisis_communication_log')
    op.drop_table('real_time_notification')
    op.drop_table('crisis_performance_metrics')
    op.drop_table('response_workflow')
    op.drop_table('crisis_event')