"""Demographic Intelligence Workbench

Revision ID: 010_demographic_intelligence
Revises: 009_ai_knowledge_system
Create Date: 2025-08-22 12:00:00.000000

This migration implements advanced demographic analysis and voter intelligence
capabilities with ethical voter segmentation, engagement pattern analysis,
and service gap identification for political intelligence operations.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_demographic_intelligence'
down_revision = '009_ai_knowledge_system'
branch_labels = None
depends_on = None


def upgrade():
    # Enhanced Ward Demographics with detailed segmentation
    with op.batch_alter_table('ward_demographics', schema=None) as batch_op:
        # Age distribution
        batch_op.add_column(sa.Column('age_18_25_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('age_26_35_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('age_36_50_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('age_51_65_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('age_65_plus_pct', sa.Float(), nullable=True))
        
        # Education levels
        batch_op.add_column(sa.Column('education_primary_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('education_secondary_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('education_graduate_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('education_postgrad_pct', sa.Float(), nullable=True))
        
        # Economic indicators
        batch_op.add_column(sa.Column('income_low_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('income_middle_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('income_high_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('employment_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('self_employed_pct', sa.Float(), nullable=True))
        
        # Housing and infrastructure
        batch_op.add_column(sa.Column('owned_homes_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('rental_homes_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('slum_households_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('access_to_water_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('access_to_sanitation_pct', sa.Float(), nullable=True))
        
        # Digital divide
        batch_op.add_column(sa.Column('internet_penetration_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('smartphone_ownership_pct', sa.Float(), nullable=True))
        
        # Transportation patterns
        batch_op.add_column(sa.Column('private_vehicle_pct', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('public_transport_pct', sa.Float(), nullable=True))
        
        # Data quality tracking
        batch_op.add_column(sa.Column('data_sources', sa.JSON(), nullable=True,
                                    comment='Sources of demographic data'))
        batch_op.add_column(sa.Column('data_quality_score', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('last_census_update', sa.DateTime(timezone=True), nullable=True))

    # Voter Segment Analysis (ethical approach)
    op.create_table('voter_segment',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('segment_id', sa.String(36), nullable=False, unique=True),
        sa.Column('ward_id', sa.String(64), nullable=False),
        sa.Column('segment_name', sa.String(128), nullable=False,
                 comment='Issue-based grouping, not personal attributes'),
        sa.Column('segment_type', sa.String(32), nullable=False,
                 comment='issue_concern|service_need|civic_engagement|policy_interest'),
        sa.Column('primary_concerns', sa.JSON(), nullable=False,
                 comment='Main issues this segment cares about'),
        sa.Column('engagement_level', sa.String(16), nullable=False,
                 comment='high|medium|low|dormant'),
        sa.Column('preferred_communication', sa.JSON(), nullable=True,
                 comment='How this segment prefers to receive information'),
        sa.Column('service_priorities', sa.JSON(), nullable=True,
                 comment='Which government services are most important'),
        sa.Column('voting_likelihood', sa.String(16), nullable=True,
                 comment='very_likely|likely|uncertain|unlikely'),
        sa.Column('influence_factors', sa.JSON(), nullable=True,
                 comment='What influences this segment decisions'),
        sa.Column('segment_size_estimate', sa.Integer(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True,
                 comment='Confidence in segment analysis'),
        sa.Column('ethical_compliance', sa.JSON(), nullable=False,
                 comment='Privacy and ethical compliance metadata'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_segment_ward_type', 'voter_segment',
                   ['ward_id', 'segment_type'])
    op.create_index('ix_segment_engagement_size', 'voter_segment',
                   ['engagement_level', 'segment_size_estimate'])

    # Engagement Pattern Analysis
    op.create_table('engagement_pattern',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('pattern_id', sa.String(36), nullable=False, unique=True),
        sa.Column('ward_id', sa.String(64), nullable=False),
        sa.Column('time_period', sa.String(16), nullable=False,
                 comment='daily|weekly|monthly|quarterly'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('engagement_metrics', sa.JSON(), nullable=False,
                 comment='Civic engagement, event attendance, complaint rates'),
        sa.Column('communication_patterns', sa.JSON(), nullable=True,
                 comment='How citizens communicate with government'),
        sa.Column('service_usage_patterns', sa.JSON(), nullable=True,
                 comment='Which services are used most/least'),
        sa.Column('issue_reporting_patterns', sa.JSON(), nullable=True,
                 comment='Types and frequency of issues reported'),
        sa.Column('feedback_patterns', sa.JSON(), nullable=True,
                 comment='How citizens provide feedback'),
        sa.Column('seasonal_variations', sa.JSON(), nullable=True,
                 comment='How engagement varies by season/events'),
        sa.Column('demographic_correlations', sa.JSON(), nullable=True,
                 comment='Engagement patterns by demographic factors'),
        sa.Column('trend_indicators', sa.JSON(), nullable=True,
                 comment='Whether engagement is increasing/decreasing'),
        sa.Column('anomaly_detection', sa.JSON(), nullable=True,
                 comment='Unusual patterns requiring attention'),
        sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now())
    )
    
    op.create_index('ix_engagement_ward_period', 'engagement_pattern',
                   ['ward_id', 'time_period', 'period_start'])

    # Service Gap Analysis for identifying unmet needs
    op.create_table('service_gap_analysis',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('analysis_id', sa.String(36), nullable=False, unique=True),
        sa.Column('ward_id', sa.String(64), nullable=False),
        sa.Column('service_category', sa.String(64), nullable=False,
                 comment='healthcare|education|infrastructure|transport|utilities'),
        sa.Column('service_subcategory', sa.String(128), nullable=True),
        sa.Column('gap_severity', sa.String(16), nullable=False,
                 comment='critical|high|medium|low'),
        sa.Column('affected_population_estimate', sa.Integer(), nullable=True),
        sa.Column('affected_demographics', sa.JSON(), nullable=True,
                 comment='Which demographic groups are most affected'),
        sa.Column('gap_description', sa.Text(), nullable=False),
        sa.Column('current_service_level', sa.JSON(), nullable=True,
                 comment='Current state of service provision'),
        sa.Column('required_service_level', sa.JSON(), nullable=True,
                 comment='What level of service is needed'),
        sa.Column('gap_indicators', sa.JSON(), nullable=False,
                 comment='Metrics indicating the service gap'),
        sa.Column('potential_solutions', sa.JSON(), nullable=True,
                 comment='Possible approaches to address the gap'),
        sa.Column('resource_requirements', sa.JSON(), nullable=True,
                 comment='Resources needed to close the gap'),
        sa.Column('political_implications', sa.JSON(), nullable=True,
                 comment='Political opportunities and risks'),
        sa.Column('citizen_demand_level', sa.String(16), nullable=True,
                 comment='very_high|high|medium|low'),
        sa.Column('implementation_complexity', sa.String(16), nullable=True,
                 comment='simple|moderate|complex|very_complex'),
        sa.Column('budget_impact', sa.String(16), nullable=True,
                 comment='low|medium|high|very_high'),
        sa.Column('timeline_estimate', sa.String(32), nullable=True,
                 comment='Estimated time to address the gap'),
        sa.Column('stakeholders_involved', sa.JSON(), nullable=True,
                 comment='Key stakeholders for addressing this gap'),
        sa.Column('monitoring_indicators', sa.JSON(), nullable=True,
                 comment='How to track progress on closing the gap'),
        sa.Column('identified_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('last_reviewed', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('status', sa.String(16), nullable=False, default='identified',
                 comment='identified|analyzing|planning|addressing|resolved')
    )
    
    op.create_index('ix_service_gap_ward_severity', 'service_gap_analysis',
                   ['ward_id', 'gap_severity'])
    op.create_index('ix_service_gap_category_demand', 'service_gap_analysis',
                   ['service_category', 'citizen_demand_level'])

    # Demographic Insights Summary for quick access
    op.create_table('demographic_insight',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('insight_id', sa.String(36), nullable=False, unique=True),
        sa.Column('ward_id', sa.String(64), nullable=False),
        sa.Column('insight_type', sa.String(32), nullable=False,
                 comment='demographic_shift|service_gap|engagement_change|voting_pattern'),
        sa.Column('insight_title', sa.String(256), nullable=False),
        sa.Column('insight_summary', sa.Text(), nullable=False),
        sa.Column('key_findings', sa.JSON(), nullable=False),
        sa.Column('supporting_data', sa.JSON(), nullable=True,
                 comment='Data points supporting this insight'),
        sa.Column('implications', sa.JSON(), nullable=True,
                 comment='Political and strategic implications'),
        sa.Column('recommended_actions', sa.JSON(), nullable=True,
                 comment='Suggested responses to this insight'),
        sa.Column('confidence_level', sa.String(16), nullable=False,
                 comment='very_high|high|medium|low'),
        sa.Column('urgency_level', sa.String(16), nullable=False,
                 comment='immediate|high|medium|low'),
        sa.Column('impact_assessment', sa.JSON(), nullable=True,
                 comment='Potential impact on political outcomes'),
        sa.Column('related_insights', sa.JSON(), nullable=True,
                 comment='Other insights related to this one'),
        sa.Column('generated_by', sa.String(32), nullable=False,
                 comment='ai_analysis|manual_analysis|hybrid'),
        sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('review_status', sa.String(16), nullable=False,
                 default='pending',
                 comment='pending|approved|disputed|needs_revision'),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True,
                 comment='When this insight becomes outdated')
    )
    
    op.create_foreign_key('fk_insight_reviewer', 'demographic_insight',
                         'user', ['reviewed_by_user_id'], ['id'])
    op.create_index('ix_insight_ward_type_urgency', 'demographic_insight',
                   ['ward_id', 'insight_type', 'urgency_level'])


def downgrade():
    # Drop new tables
    op.drop_table('demographic_insight')
    op.drop_table('service_gap_analysis')
    op.drop_table('engagement_pattern')
    op.drop_table('voter_segment')
    
    # Remove demographic enhancements
    with op.batch_alter_table('ward_demographics', schema=None) as batch_op:
        batch_op.drop_column('last_census_update')
        batch_op.drop_column('data_quality_score')
        batch_op.drop_column('data_sources')
        batch_op.drop_column('public_transport_pct')
        batch_op.drop_column('private_vehicle_pct')
        batch_op.drop_column('smartphone_ownership_pct')
        batch_op.drop_column('internet_penetration_pct')
        batch_op.drop_column('access_to_sanitation_pct')
        batch_op.drop_column('access_to_water_pct')
        batch_op.drop_column('slum_households_pct')
        batch_op.drop_column('rental_homes_pct')
        batch_op.drop_column('owned_homes_pct')
        batch_op.drop_column('self_employed_pct')
        batch_op.drop_column('employment_rate')
        batch_op.drop_column('income_high_pct')
        batch_op.drop_column('income_middle_pct')
        batch_op.drop_column('income_low_pct')
        batch_op.drop_column('education_postgrad_pct')
        batch_op.drop_column('education_graduate_pct')
        batch_op.drop_column('education_secondary_pct')
        batch_op.drop_column('education_primary_pct')
        batch_op.drop_column('age_65_plus_pct')
        batch_op.drop_column('age_51_65_pct')
        batch_op.drop_column('age_36_50_pct')
        batch_op.drop_column('age_26_35_pct')
        batch_op.drop_column('age_18_25_pct')