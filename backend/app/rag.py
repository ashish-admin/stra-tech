from typing import List, Dict
from sqlalchemy import text
from .extensions import db

def ann_retrieve(ward: str, window_days: int = 7, k: int = 12) -> List[Dict]:
    """
    Retrieve top-k embeddings for a ward within a recent window.
    Currently sorts by recency and ANN distance if a query_vec is provided.
    For v1 we use recency only (no query vector) to keep it simple.
    """
    sql = text("""
      SELECT id, source_type, source_id, ward, created_at, meta
      FROM embedding
      WHERE (ward = :ward OR :ward = '' OR ward IS NULL)
        AND created_at >= NOW() - (:window_days || ' days')::interval
      ORDER BY created_at DESC
      LIMIT :k
    """)
    rows = db.session.execute(sql, {"ward": ward or "", "window_days": window_days, "k": k}).mappings().all()
    return [dict(r) for r in rows]
