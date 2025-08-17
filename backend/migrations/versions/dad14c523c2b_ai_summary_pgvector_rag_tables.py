"""AI summary: pgvector + embeddings/leaders/clusters/summary (vector-aware fallback)

Revision ID: <REV_ID>         # KEEP what Alembic generated
Revises: a6b6e1cd81e2         # your current head
Create Date: 2025-08-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as psql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = "<REV_ID>"         # KEEP what Alembic generated
down_revision = "a6b6e1cd81e2"
branch_labels = None
depends_on = None


def _has_pgvector(conn) -> bool:
    try:
        return bool(conn.execute(
            text("SELECT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='vector')")
        ).scalar())
    except Exception:
        return False


def upgrade():
    bind = op.get_bind()
    use_vector = _has_pgvector(bind)

    if use_vector:
        # create extension only if available to avoid failure
        bind.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

    # 1) Embedding table (vector or bytea)
    if use_vector:
        op.execute("""
            CREATE TABLE IF NOT EXISTS embedding (
                id SERIAL PRIMARY KEY,
                source_type VARCHAR(16) NOT NULL,   -- 'post' | 'epaper'
                source_id INTEGER NOT NULL,
                ward VARCHAR(64),
                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                vec vector(768),
                meta JSONB
            );
        """)
        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_embedding_source ON embedding(source_type, source_id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_embedding_ward ON embedding(ward);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_embedding_vec ON embedding USING ivfflat (vec vector_l2_ops) WITH (lists = 100);")
    else:
        # Fallback: store embeddings as raw bytes (BYTEA). We can still compute in Python when needed.
        op.create_table(
            "embedding",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("source_type", sa.String(16), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("ward", sa.String(64), nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.text("NOW()")),
            sa.Column("vec", sa.LargeBinary(), nullable=True),   # <— BYTEA
            sa.Column("meta", psql.JSONB(), nullable=True),
        )
        op.create_unique_constraint("uq_embedding_source", "embedding", ["source_type", "source_id"])
        op.create_index("ix_embedding_ward", "embedding", ["ward"])
        # no ivfflat index in fallback

    # 2) Leaders + mentions
    op.create_table(
        "leader",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("party", sa.String(32), nullable=True),
        sa.Column("role", sa.String(64), nullable=True),
        sa.Column("ward", sa.String(64), nullable=True),
        sa.Column("first_seen", sa.TIMESTAMP(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("last_seen", sa.TIMESTAMP(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_leader_name", "leader", ["name"])
    op.create_index("ix_leader_ward", "leader", ["ward"])

    op.create_table(
        "leader_mention",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("leader_id", sa.Integer(), sa.ForeignKey("leader.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(16), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("sentiment", sa.Float(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.text("NOW()")),
    )

    # 3) Issue clusters
    op.create_table(
        "issue_cluster",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ward", sa.String(64), nullable=False),
        sa.Column("label", sa.String(160), nullable=False),
        sa.Column("keywords", psql.JSONB(), nullable=True),
        sa.Column("sentiment", sa.Float(), nullable=True),
        sa.Column("volume", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("momentum", sa.Float(), nullable=True),
        sa.Column("window", sa.String(16), nullable=False, server_default="P7D"),
        sa.Column("updated_at", sa.TIMESTAMP(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_issue_cluster_ward", "issue_cluster", ["ward"])

    # 4) AI summaries
    op.create_table(
        "summary",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ward", sa.String(64), nullable=False),
        sa.Column("window", sa.String(16), nullable=False, server_default="P7D"),
        sa.Column("sections", psql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("citations", psql.JSONB(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True, server_default="0"),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column("cost_cents", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_summary_ward", "summary", ["ward"])


def downgrade():
    op.drop_index("ix_summary_ward", table_name="summary")
    op.drop_table("summary")

    op.drop_index("ix_issue_cluster_ward", table_name="issue_cluster")
    op.drop_table("issue_cluster")

    op.drop_table("leader_mention")

    op.drop_index("ix_leader_ward", table_name="leader")
    op.drop_index("ix_leader_name", table_name="leader")
    op.drop_table("leader")

    # embedding + indexes (handle both variants)
    try:
        op.execute("DROP INDEX IF EXISTS ix_embedding_vec;")
    except Exception:
        pass
    try:
        op.drop_index("ix_embedding_ward", table_name="embedding")
    except Exception:
        pass
    try:
        op.drop_constraint("uq_embedding_source", "embedding", type_="unique")
    except Exception:
        pass
    op.drop_table("embedding")
    # we intentionally do not drop the extension
