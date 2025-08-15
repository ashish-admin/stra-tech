"""Add epaper.sha256 unique and post.epaper_id FK

Revision ID: bc11d78134d9
Revises: 51d8e8e4cc64
Create Date: 2025-08-15 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'bc11d78134d9'
down_revision = '51d8e8e4cc64'
branch_labels = None
depends_on = None

def upgrade():
    # 1) epaper.sha256 (nullable for now; we will backfill and then enforce NOT NULL + UNIQUE)
    op.add_column('epaper', sa.Column('sha256', sa.String(length=64), nullable=True))
    op.create_index('ix_epaper_sha256_tmp', 'epaper', ['sha256'], unique=False)

    # 2) post.epaper_id (nullable FK to epaper.id)
    op.add_column('post', sa.Column('epaper_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_post_epaper', 'post', 'epaper', ['epaper_id'], ['id'])
    op.create_index('ix_post_epaper_id', 'post', ['epaper_id'], unique=False)

def downgrade():
    op.drop_index('ix_post_epaper_id', table_name='post')
    op.drop_constraint('fk_post_epaper', 'post', type_='foreignkey')
    op.drop_column('post', 'epaper_id')

    op.drop_index('ix_epaper_sha256_tmp', table_name='epaper')
    op.drop_column('epaper', 'sha256')
