"""add created_at to post (idempotent)

Revision ID: 20250814_add_created_at_to_post
Revises: a7d53cd7fd59
Create Date: 2025-08-14
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250814_add_created_at_to_post"
down_revision = "a7d53cd7fd59"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    cols = {c["name"] for c in insp.get_columns("post")}
    if "created_at" not in cols:
        # add nullable first, backfill, then make non-nullable
        op.add_column("post", sa.Column("created_at", sa.DateTime(), nullable=True))
        op.execute("UPDATE post SET created_at = NOW() WHERE created_at IS NULL;")
        op.alter_column("post", "created_at", nullable=False)

    # create index if it doesn't exist
    existing_ix = {ix["name"] for ix in insp.get_indexes("post")}
    if "ix_post_created_at" not in existing_ix:
        op.create_index("ix_post_created_at", "post", ["created_at"])

def downgrade():
    # make safe: only drop if exists (raw SQL for IF EXISTS)
    bind = op.get_bind()
    insp = sa.inspect(bind)

    existing_ix = {ix["name"] for ix in insp.get_indexes("post")}
    if "ix_post_created_at" in existing_ix:
        op.drop_index("ix_post_created_at", table_name="post")

    cols = {c["name"] for c in insp.get_columns("post")}
    if "created_at" in cols:
        op.drop_column("post", "created_at")
