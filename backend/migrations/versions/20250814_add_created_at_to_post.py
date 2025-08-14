# backend/migrations/versions/20250814_add_created_at_to_post.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = "20250814_add_created_at_to_post"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table("post") as b:
        b.add_column(sa.Column("created_at", sa.DateTime(), nullable=True))
    # backfill with now() for existing rows so NOT NULL can be enforced
    op.execute("UPDATE post SET created_at = NOW() WHERE created_at IS NULL;")
    with op.batch_alter_table("post") as b:
        b.alter_column("created_at", existing_type=sa.DateTime(), nullable=False)
        b.create_index("ix_post_created_at", ["created_at"])

def downgrade():
    with op.batch_alter_table("post") as b:
        b.drop_index("ix_post_created_at")
        b.drop_column("created_at")
