"""merge heads

Revision ID: 67372ba2e656
Revises: 20250814_add_created_at_to_post, a7d53cd7fd59
Create Date: 2025-08-14 15:46:48.433288

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '67372ba2e656'
down_revision = ('20250814_add_created_at_to_post', 'a7d53cd7fd59')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
