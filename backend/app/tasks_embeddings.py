from celery import shared_task
from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from .extensions import db
from .llm import get_embedding

def _make_doc_from_post(row) -> tuple[str, dict]:
    text_body = (row.get("text") or "").strip()
    title = (row.get("city") or "Post").strip()
    meta = {
        "title": title,
        "date": row.get("created_at"),
        "source": "post",
        "city": row.get("city"),
        "id": row.get("id"),
    }
    return text_body, meta

def _make_doc_from_epaper(row) -> tuple[str, dict]:
    body = (row.get("body") or row.get("raw_text") or "").strip()
    title = (row.get("title") or row.get("publication_name") or "Article").strip()
    meta = {
        "title": title,
        "date": row.get("publication_date") or row.get("created_at"),
        "publication_name": row.get("publication_name"),
        "id": row.get("id"),
        "source": "epaper",
    }
    return f"{title}\n\n{body}", meta

@shared_task(name="app.tasks.embed_recent")
def embed_recent(days: int = 7, limit: int = 400):
    """
    Embed recent posts and epaper rows and upsert into embedding table.
    """
    # Recent posts
    posts = db.session.execute(text("""
      SELECT id, text, city, created_at
      FROM post
      WHERE created_at >= NOW() - (:days || ' days')::interval
      ORDER BY created_at DESC
      LIMIT :limit
    """), {"days": days, "limit": limit}).mappings().all()

    # Recent epaper
    articles = db.session.execute(text("""
      SELECT id, title, body, raw_text, publication_name, publication_date, created_at
      FROM epaper
      WHERE COALESCE(publication_date::timestamp, created_at) >= NOW() - (:days || ' days')::interval
      ORDER BY COALESCE(publication_date::timestamp, created_at) DESC
      LIMIT :limit
    """), {"days": days, "limit": limit}).mappings().all()

    inserted = 0

    for row in posts:
      doc, meta = _make_doc_from_post(dict(row))
      if not doc: continue
      vec = get_embedding(doc)
      db.session.execute(text("""
        INSERT INTO embedding (source_type, source_id, ward, created_at, vec, meta)
        VALUES ('post', :sid, :ward, NOW(), :vec, :meta::jsonb)
        ON CONFLICT (source_type, source_id) DO UPDATE
          SET ward = EXCLUDED.ward,
              vec = EXCLUDED.vec,
              meta = EXCLUDED.meta
      """), {"sid": row["id"], "ward": row.get("city") or None, "vec": vec, "meta": json_dumps(meta)})
      inserted += 1

    for row in articles:
      doc, meta = _make_doc_from_epaper(dict(row))
      if not doc: continue
      vec = get_embedding(doc)
      db.session.execute(text("""
        INSERT INTO embedding (source_type, source_id, ward, created_at, vec, meta)
        VALUES ('epaper', :sid, NULL, COALESCE(:dt::timestamp, NOW()), :vec, :meta::jsonb)
        ON CONFLICT (source_type, source_id) DO UPDATE
          SET vec = EXCLUDED.vec,
              meta = EXCLUDED.meta
      """), {"sid": row["id"], "dt": row.get("publication_date"), "vec": vec, "meta": json_dumps(meta)})
      inserted += 1

    db.session.commit()
    return {"inserted": inserted}


def json_dumps(obj) -> str:
    import json
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
