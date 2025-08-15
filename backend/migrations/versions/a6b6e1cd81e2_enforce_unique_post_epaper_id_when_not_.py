"""Enforce unique post.epaper_id when not null."""

from alembic import op
import sqlalchemy as sa

# Keep the auto-generated IDs so the graph stays correct
revision = 'a6b6e1cd81e2'
down_revision = '34e370799ea7'
branch_labels = None
depends_on = None

def upgrade():
    # Partial unique index (PostgreSQL)
    op.create_index(
        'uq_post_epaper_id',
        'post',
        ['epaper_id'],
        unique=True,
        postgresql_where=sa.text('epaper_id IS NOT NULL'),
    )

def downgrade():
    op.drop_index('uq_post_epaper_id', table_name='post')
