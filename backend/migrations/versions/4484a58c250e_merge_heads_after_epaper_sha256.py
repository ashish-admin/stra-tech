"""merge heads after epaper sha256

Revision ID: 4484a58c250e
Revises: bc11d78134d9, 8e4f525b4312
Create Date: 2025-08-15 11:31:38.579550

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4484a58c250e'
down_revision = ('bc11d78134d9', '8e4f525b4312')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
