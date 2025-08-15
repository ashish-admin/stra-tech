"""Add ward intelligence tables

Revision ID: 93e55b319031
Revises: 67372ba2e656
Create Date: 2025-08-14 15:52:09.542884
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "93e55b319031"
down_revision = "67372ba2e656"
branch_labels = None
depends_on = None


def upgrade():
    # --- New core tables -----------------------------------------------------
    op.create_table(
        "election",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("round", sa.String(length=32), nullable=True),
        sa.Column("official_ref", sa.String(length=256), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "polling_station",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ps_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=True),
        sa.Column("address", sa.String(length=512), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("ac_id", sa.String(length=64), nullable=True),
        sa.Column("pc_id", sa.String(length=64), nullable=True),
        sa.Column("ward_id", sa.String(length=64), nullable=True),
        sa.Column("ward_name", sa.String(length=256), nullable=True),
        sa.Column("source_meta", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ps_id"),
    )
    with op.batch_alter_table("polling_station", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_polling_station_ward_id"), ["ward_id"], unique=False
        )

    op.create_table(
        "ward_demographics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=64), nullable=False),
        sa.Column("literacy_idx", sa.Float(), nullable=True),
        sa.Column("muslim_idx", sa.Float(), nullable=True),
        sa.Column("scst_idx", sa.Float(), nullable=True),
        sa.Column("secc_deprivation_idx", sa.Float(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ward_id"),
    )

    op.create_table(
        "ward_features",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=64), nullable=False),
        sa.Column("as23_party_shares", sa.JSON(), nullable=True),
        sa.Column("ls24_party_shares", sa.JSON(), nullable=True),
        sa.Column("dvi", sa.JSON(), nullable=True),
        sa.Column("aci_23", sa.Float(), nullable=True),
        sa.Column("turnout_volatility", sa.Float(), nullable=True),
        sa.Column("incumbency_weakness", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ward_id"),
    )

    op.create_table(
        "ward_profile",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=64), nullable=False),
        sa.Column("electors", sa.Integer(), nullable=True),
        sa.Column("votes_cast", sa.Integer(), nullable=True),
        sa.Column("turnout_pct", sa.Float(), nullable=True),
        sa.Column("last_winner_party", sa.String(length=64), nullable=True),
        sa.Column("last_winner_year", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ward_id"),
    )

    op.create_table(
        "result_ps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("election_id", sa.Integer(), nullable=False),
        sa.Column("ps_id", sa.String(length=64), nullable=False),
        sa.Column("party", sa.String(length=64), nullable=False),
        sa.Column("candidate", sa.String(length=256), nullable=True),
        sa.Column("votes", sa.Integer(), nullable=True),
        sa.Column("total_polled", sa.Integer(), nullable=True),
        sa.Column("rejected", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["election_id"], ["election.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "result_ward_agg",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("election_id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=64), nullable=False),
        sa.Column("party", sa.String(length=64), nullable=False),
        sa.Column("votes", sa.Integer(), nullable=True),
        sa.Column("vote_share", sa.Float(), nullable=True),
        sa.Column("turnout_pct", sa.Float(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["election_id"], ["election.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("result_ward_agg", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_result_ward_agg_ward_id"), ["ward_id"], unique=False
        )

    # --- Drop legacy table detected as removed -------------------------------
    op.drop_table("epaper")

    # --- ALERT table: safe changes -------------------------------------------
    with op.batch_alter_table("alert", schema=None) as b:
        if not _col_exists("alert", "description"):
            b.add_column(sa.Column("description", sa.String(length=512), nullable=True))
        if not _col_exists("alert", "severity"):
            b.add_column(sa.Column("severity", sa.String(length=32), nullable=True))

        # Backfill created_at then enforce NOT NULL
        op.execute(sa.text("UPDATE alert SET created_at = NOW() WHERE created_at IS NULL"))
        b.alter_column("created_at", existing_type=sa.DateTime(), nullable=False)

        # Add updated_at with temporary default to backfill, then drop default
        if not _col_exists("alert", "updated_at"):
            b.add_column(
                sa.Column(
                    "updated_at",
                    sa.DateTime(),
                    server_default=sa.text("NOW()"),
                    nullable=False,
                )
            )
            b.alter_column("updated_at", server_default=None)
        else:
            op.execute(sa.text("UPDATE alert SET updated_at = NOW() WHERE updated_at IS NULL"))
            b.alter_column("updated_at", nullable=False)
            b.alter_column("updated_at", server_default=None)

        # Normalize ward type/nullable if needed
        b.alter_column(
            "ward",
            existing_type=sa.VARCHAR(length=150),
            type_=sa.String(length=120),
            nullable=True,
            existing_nullable=True,
        )

    # Create indexes AFTER column exists in the real table
    _create_index_if_missing("alert", "ix_alert_created_at", ["created_at"])
    _create_index_if_missing("alert", "ix_alert_updated_at", ["updated_at"])

    # --- AUTHOR tweaks --------------------------------------------------------
    with op.batch_alter_table("author", schema=None) as batch_op:
        if not _col_exists("author", "party"):
            batch_op.add_column(sa.Column("party", sa.String(length=64), nullable=True))
        batch_op.alter_column(
            "name",
            existing_type=sa.VARCHAR(length=100),
            type_=sa.String(length=120),
            existing_nullable=False,
        )

    # --- POST tweaks ----------------------------------------------------------
    with op.batch_alter_table("post", schema=None) as batch_op:
        batch_op.alter_column(
            "text", existing_type=sa.VARCHAR(length=280), type_=sa.Text(), existing_nullable=False
        )
        batch_op.alter_column("author_id", existing_type=sa.INTEGER(), nullable=True)
        batch_op.alter_column(
            "city",
            existing_type=sa.VARCHAR(length=100),
            type_=sa.String(length=120),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "emotion",
            existing_type=sa.VARCHAR(length=50),
            type_=sa.String(length=64),
            existing_nullable=True,
        )
        op.execute(sa.text("UPDATE post SET created_at = NOW() WHERE created_at IS NULL"))
        batch_op.alter_column("created_at", existing_type=postgresql.TIMESTAMP(), nullable=False)
        if _col_exists("post", "detected_emotion"):
            batch_op.drop_column("detected_emotion")
        if _col_exists("post", "source"):
            batch_op.drop_column("source")

    # --- USER tweaks ----------------------------------------------------------
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.alter_column(
            "username",
            existing_type=sa.VARCHAR(length=64),
            type_=sa.String(length=80),
            existing_nullable=False,
        )
        op.execute(sa.text("UPDATE \"user\" SET password_hash = '!' WHERE password_hash IS NULL"))
        batch_op.alter_column("password_hash", existing_type=sa.VARCHAR(length=256), nullable=False)

        # Drop old indexes if present
        if _index_exists("user", batch_op.f("ix_user_email")):
            batch_op.drop_index(batch_op.f("ix_user_email"))
        if _index_exists("user", batch_op.f("ix_user_username")):
            batch_op.drop_index(batch_op.f("ix_user_username"))

    # Create named unique constraints AFTER batch (idempotent)
    _create_unique_if_missing("user", "uq_user_email", ["email"])
    _create_unique_if_missing("user", "uq_user_username", ["username"])


def downgrade():
    # USER
    _drop_unique_if_exists("user", "uq_user_username")
    _drop_unique_if_exists("user", "uq_user_email")
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_user_username"), ["username"], unique=True)
        batch_op.create_index(batch_op.f("ix_user_email"), ["email"], unique=True)
        batch_op.alter_column("password_hash", existing_type=sa.VARCHAR(length=256), nullable=True)
        batch_op.alter_column(
            "username", existing_type=sa.String(length=80), type_=sa.VARCHAR(length=64), existing_nullable=False
        )

    # POST
    with op.batch_alter_table("post", schema=None) as batch_op:
        if not _col_exists("post", "source"):
            batch_op.add_column(sa.Column("source", sa.VARCHAR(length=128), nullable=True))
        if not _col_exists("post", "detected_emotion"):
            batch_op.add_column(sa.Column("detected_emotion", sa.VARCHAR(length=64), nullable=True))
        batch_op.alter_column("created_at", existing_type=postgresql.TIMESTAMP(), nullable=True)
        batch_op.alter_column(
            "emotion", existing_type=sa.String(length=64), type_=sa.VARCHAR(length=50), existing_nullable=True
        )
        batch_op.alter_column(
            "city", existing_type=sa.String(length=120), type_=sa.VARCHAR(length=100), existing_nullable=True
        )
        batch_op.alter_column("author_id", existing_type=sa.INTEGER(), nullable=False)
        batch_op.alter_column(
            "text", existing_type=sa.Text(), type_=sa.VARCHAR(length=280), existing_nullable=False
        )

    # AUTHOR
    with op.batch_alter_table("author", schema=None) as batch_op:
        batch_op.alter_column(
            "name", existing_type=sa.String(length=120), type_=sa.VARCHAR(length=100), existing_nullable=False
        )
        if _col_exists("author", "party"):
            batch_op.drop_column("party")

    # ALERT (drop indexes before dropping column)
    if _index_exists("alert", "ix_alert_updated_at"):
        op.drop_index("ix_alert_updated_at", table_name="alert")
    if _index_exists("alert", "ix_alert_created_at"):
        op.drop_index("ix_alert_created_at", table_name="alert")

    with op.batch_alter_table("alert", schema=None) as b:
        b.alter_column("created_at", existing_type=postgresql.TIMESTAMP(), nullable=True)
        b.alter_column(
            "ward",
            existing_type=sa.String(length=120),
            type_=sa.VARCHAR(length=150),
            nullable=False,
        )
        if _col_exists("alert", "updated_at"):
            b.drop_column("updated_at")
        if _col_exists("alert", "severity"):
            b.drop_column("severity")
        if _col_exists("alert", "description"):
            b.drop_column("description")

    # Restore legacy table
    op.create_table(
        "epaper",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("publication_name", sa.VARCHAR(length=100), nullable=False),
        sa.Column("publication_date", sa.DATE(), nullable=False),
        sa.Column("raw_text", sa.TEXT(), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("epaper_pkey")),
    )

    # Drop ward/election structures
    with op.batch_alter_table("result_ward_agg", schema=None) as batch_op:
        if _index_exists("result_ward_agg", batch_op.f("ix_result_ward_agg_ward_id")):
            batch_op.drop_index(batch_op.f("ix_result_ward_agg_ward_id"))
    op.drop_table("result_ward_agg")
    op.drop_table("result_ps")
    op.drop_table("ward_profile")
    op.drop_table("ward_features")
    op.drop_table("ward_demographics")
    with op.batch_alter_table("polling_station", schema=None) as batch_op:
        if _index_exists("polling_station", batch_op.f("ix_polling_station_ward_id")):
            batch_op.drop_index(batch_op.f("ix_polling_station_ward_id"))
    op.drop_table("polling_station")
    op.drop_table("election")


# ----------------------------- Helpers --------------------------------------

def _col_exists(table_name: str, col_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(c["name"] == col_name for c in insp.get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(ix["name"] == index_name for ix in insp.get_indexes(table_name))


def _create_index_if_missing(table: str, name: str, cols: list[str]) -> None:
    if not _index_exists(table, name):
        op.create_index(name, table, cols)


def _create_unique_if_missing(table: str, name: str, cols: list[str]) -> None:
    # detect via index list; if absent, create a named unique constraint
    if not _index_exists(table, name):
        op.create_unique_constraint(name, table, cols)


def _drop_unique_if_exists(table: str, name: str) -> None:
    if _index_exists(table, name):
        op.drop_constraint(name, table, type_="unique")
