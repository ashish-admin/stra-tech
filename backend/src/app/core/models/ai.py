from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, UniqueConstraint, JSON
)
from .extensions import db

# --- Embeddings table (pgvector-backed via migration) ---
# store light metadata for retrieval + citations
class Embedding(db.Model):
    __tablename__ = "embedding"

    id = Column(Integer, primary_key=True)
    source_type = Column(String(16), nullable=False)   # 'post' | 'epaper'
    source_id = Column(Integer, nullable=False)        # FK id in its table
    ward = Column(String(64), index=True, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # vec column is created in Alembic as "vector(768)"
    # here we just declare a placeholder to keep ORM happy for selects
    vec = Column(Text, nullable=True)  # not used by ORM; pgvector handled via SQL
    meta = Column(JSON, nullable=True, default=dict)

    __table_args__ = (
        UniqueConstraint("source_type", "source_id", name="uq_embedding_source"),
    )

# --- Leaders snapshot + mentions ---
class Leader(db.Model):
    __tablename__ = "leader"

    id = Column(Integer, primary_key=True)
    name = Column(String(160), nullable=False, index=True)
    party = Column(String(32), nullable=True)
    role = Column(String(64), nullable=True)           # corporator | MLA | MP | worker
    ward = Column(String(64), nullable=True, index=True)
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)

class LeaderMention(db.Model):
    __tablename__ = "leader_mention"

    id = Column(Integer, primary_key=True)
    leader_id = Column(Integer, ForeignKey("leader.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(16), nullable=False)   # 'post' | 'epaper'
    source_id = Column(Integer, nullable=False)
    sentiment = Column(Float, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

# --- Issue clusters (rolling window) ---
class IssueCluster(db.Model):
    __tablename__ = "issue_cluster"

    id = Column(Integer, primary_key=True)
    ward = Column(String(64), index=True, nullable=False)
    label = Column(String(160), nullable=False)
    keywords = Column(JSON, nullable=True, default=list)
    sentiment = Column(Float, nullable=True)
    volume = Column(Integer, nullable=True, default=0)
    momentum = Column(Float, nullable=True)  # growth vs prior window
    window = Column(String(16), nullable=False, default="P7D")  # P7D | P30D
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

# --- AI strategic summary ---
class Summary(db.Model):
    __tablename__ = "summary"

    id = Column(Integer, primary_key=True)
    ward = Column(String(64), index=True, nullable=False)
    window = Column(String(16), nullable=False, default="P7D")
    sections = Column(JSON, nullable=False, default=dict)   # angle, weakness, actions_24h, actions_7d, risks
    citations = Column(JSON, nullable=True, default=list)   # list of {source_type, source_id, title, date}
    confidence = Column(Float, nullable=True, default=0.0)
    model = Column(String(64), nullable=True)
    cost_cents = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
