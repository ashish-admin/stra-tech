"""Make epaper.sha256 NOT NULL + UNIQUE

Revision ID: 34e370799ea7
Revises: 4484a58c250e
Create Date: 2025-08-15 11:51:57.228881

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '34e370799ea7'
down_revision = '4484a58c250e'
branch_labels = None
depends_on = None


def upgrade():
    # 1) Drop the temporary non-unique index if present (safe if it never existed)
    try:
        op.drop_index('ix_epaper_sha256_tmp', table_name='epaper')
    except Exception:
        pass

    # 2) Enforce NOT NULL on sha256
    op.alter_column(
        'epaper', 'sha256',
        existing_type=sa.String(length=64),
        nullable=False
    )

    # 3) Create UNIQUE index (portable across backends)
    op.create_index('uq_epaper_sha256', 'epaper', ['sha256'], unique=True)


def downgrade():
    # Reverse the operations
    op.drop_index('uq_epaper_sha256', table_name='epaper')
    op.alter_column(
        'epaper', 'sha256',
        existing_type=sa.String(length=64),
        nullable=True
    )
    op.create_index('ix_epaper_sha256_tmp', 'epaper', ['sha256'], unique=False)