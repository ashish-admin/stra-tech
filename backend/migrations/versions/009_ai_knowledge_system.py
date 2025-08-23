"""AI Knowledge Base and Talking Points System

Revision ID: 009_ai_knowledge_system
Revises: 008_ward_pulse_intelligence
Create Date: 2025-08-22 11:00:00.000000

This migration implements the AI-powered talking points generator with
comprehensive knowledge base, fact verification, and strategic messaging
capabilities for political intelligence operations.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009_ai_knowledge_system'
down_revision = '008_ward_pulse_intelligence'
branch_labels = None
depends_on = None


def upgrade():
    # Knowledge Base for fact verification and context
    op.create_table('knowledge_base',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('kb_entry_id', sa.String(36), nullable=False, unique=True),
        sa.Column('title', sa.String(512), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(32), nullable=False,
                 comment='fact|statistic|policy|biography|historical|legal'),
        sa.Column('category', sa.String(64), nullable=False,
                 comment='infrastructure|healthcare|education|economy|politics|etc.'),
        sa.Column('ward_relevance', sa.JSON(), nullable=True,
                 comment='List of wards where this knowledge is relevant'),
        sa.Column('political_relevance_score', sa.Float(), nullable=True),
        sa.Column('credibility_score', sa.Float(), nullable=False,
                 comment='0.0-1.0 credibility rating based on sources'),
        sa.Column('source_urls', sa.JSON(), nullable=True),
        sa.Column('source_attribution', sa.Text(), nullable=True),
        sa.Column('verification_status', sa.String(16), nullable=False,
                 default='unverified',
                 comment='verified|disputed|unverified|pending'),
        sa.Column('last_fact_check', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True,
                 comment='When this information becomes outdated'),
        sa.Column('embedding_vector', sa.Text(), nullable=True,
                 comment='Vector embedding for similarity search'),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_kb_category_relevance', 'knowledge_base',
                   ['category', 'political_relevance_score'])
    op.create_index('ix_kb_verification_credibility', 'knowledge_base',
                   ['verification_status', 'credibility_score'])

    # Talking Points Templates for strategic messaging
    op.create_table('talking_points_template',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('template_id', sa.String(36), nullable=False, unique=True),
        sa.Column('title', sa.String(256), nullable=False),
        sa.Column('category', sa.String(64), nullable=False,
                 comment='defense|offense|neutral|crisis|opportunity'),
        sa.Column('issue_category', sa.String(64), nullable=False),
        sa.Column('target_audience', sa.String(64), nullable=False,
                 comment='voters|media|supporters|opponents|general'),
        sa.Column('strategic_context', sa.String(32), nullable=False,
                 comment='defensive|neutral|offensive'),
        sa.Column('template_structure', sa.JSON(), nullable=False,
                 comment='Template with variables: {opening, key_points, evidence, closing}'),
        sa.Column('required_evidence_types', sa.JSON(), nullable=True,
                 comment='Types of evidence needed to support points'),
        sa.Column('tone_guidelines', sa.JSON(), nullable=True,
                 comment='Tone, style, and messaging guidelines'),
        sa.Column('usage_scenarios', sa.JSON(), nullable=True,
                 comment='When and how to use this template'),
        sa.Column('effectiveness_score', sa.Float(), nullable=True,
                 comment='Historical effectiveness rating'),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_foreign_key('fk_template_creator', 'talking_points_template', 
                         'user', ['created_by_user_id'], ['id'])
    op.create_index('ix_template_category_audience', 'talking_points_template',
                   ['category', 'target_audience'])

    # Generated Talking Points with full provenance
    op.create_table('talking_points_generation',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('generation_id', sa.String(36), nullable=False, unique=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.String(36), nullable=True),
        sa.Column('ward_context', sa.String(64), nullable=True),
        sa.Column('issue_context', sa.String(256), nullable=False),
        sa.Column('strategic_context', sa.String(32), nullable=False),
        sa.Column('target_audience', sa.String(64), nullable=False),
        sa.Column('generated_content', sa.JSON(), nullable=False,
                 comment='Full talking points with structure'),
        sa.Column('supporting_evidence', sa.JSON(), nullable=True,
                 comment='Evidence and sources supporting each point'),
        sa.Column('fact_check_results', sa.JSON(), nullable=True,
                 comment='Automated fact-checking results'),
        sa.Column('confidence_score', sa.Float(), nullable=True,
                 comment='AI confidence in generated content'),
        sa.Column('quality_indicators', sa.JSON(), nullable=True),
        sa.Column('generation_metadata', sa.JSON(), nullable=True,
                 comment='AI models used, processing time, costs'),
        sa.Column('usage_tracking', sa.JSON(), nullable=True,
                 comment='How and when these points were used'),
        sa.Column('user_feedback', sa.JSON(), nullable=True,
                 comment='User ratings and improvements'),
        sa.Column('status', sa.String(16), nullable=False, default='draft',
                 comment='draft|approved|used|archived'),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    op.create_foreign_key('fk_generation_user', 'talking_points_generation',
                         'user', ['user_id'], ['id'])
    op.create_foreign_key('fk_generation_template', 'talking_points_generation',
                         'talking_points_template', ['template_id'], ['template_id'])
    op.create_index('ix_generation_user_context', 'talking_points_generation',
                   ['user_id', 'ward_context', 'strategic_context'])

    # Fact Check Results for verification tracking
    op.create_table('fact_check_result',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('check_id', sa.String(36), nullable=False, unique=True),
        sa.Column('claim_text', sa.Text(), nullable=False),
        sa.Column('source_type', sa.String(32), nullable=False,
                 comment='talking_points|knowledge_base|user_input|news'),
        sa.Column('source_id', sa.String(36), nullable=True),
        sa.Column('verification_result', sa.String(16), nullable=False,
                 comment='true|false|misleading|unverifiable|needs_context'),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('evidence_sources', sa.JSON(), nullable=True,
                 comment='Sources supporting or refuting the claim'),
        sa.Column('explanation', sa.Text(), nullable=True,
                 comment='Detailed explanation of the verification'),
        sa.Column('context_needed', sa.Text(), nullable=True,
                 comment='Additional context required for accuracy'),
        sa.Column('verification_method', sa.String(32), nullable=False,
                 comment='automated|manual|hybrid'),
        sa.Column('fact_checker_metadata', sa.JSON(), nullable=True,
                 comment='Tools and services used for verification'),
        sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('review_status', sa.String(16), nullable=False,
                 default='pending',
                 comment='pending|approved|disputed|needs_review'),
        sa.Column('checked_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True,
                 comment='When this fact-check becomes outdated')
    )
    
    op.create_foreign_key('fk_factcheck_reviewer', 'fact_check_result',
                         'user', ['reviewed_by_user_id'], ['id'])
    op.create_index('ix_factcheck_result_confidence', 'fact_check_result',
                   ['verification_result', 'confidence_score'])

    # Campaign Position Registry for consistency
    op.create_table('campaign_position',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('position_id', sa.String(36), nullable=False, unique=True),
        sa.Column('issue_category', sa.String(64), nullable=False),
        sa.Column('position_title', sa.String(256), nullable=False),
        sa.Column('position_statement', sa.Text(), nullable=False),
        sa.Column('key_messages', sa.JSON(), nullable=False,
                 comment='Core messages and talking points'),
        sa.Column('supporting_evidence', sa.JSON(), nullable=True),
        sa.Column('target_demographics', sa.JSON(), nullable=True,
                 comment='Which voter segments this position targets'),
        sa.Column('ward_applicability', sa.JSON(), nullable=True,
                 comment='Which wards this position is relevant for'),
        sa.Column('position_strength', sa.String(16), nullable=False,
                 comment='strong|moderate|soft|testing'),
        sa.Column('strategic_priority', sa.String(16), nullable=False,
                 comment='high|medium|low'),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('approved_by_user_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(16), nullable=False, default='draft',
                 comment='draft|approved|active|retired'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                 server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_foreign_key('fk_position_creator', 'campaign_position',
                         'user', ['created_by_user_id'], ['id'])
    op.create_foreign_key('fk_position_approver', 'campaign_position',
                         'user', ['approved_by_user_id'], ['id'])
    op.create_index('ix_position_category_priority', 'campaign_position',
                   ['issue_category', 'strategic_priority'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('campaign_position')
    op.drop_table('fact_check_result')
    op.drop_table('talking_points_generation')
    op.drop_table('talking_points_template')
    op.drop_table('knowledge_base')