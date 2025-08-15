import json
import logging
from datetime import datetime, timezone, date
from typing import Iterable, Dict, Any, Optional
from celery import shared_task
from sqlalchemy.exc import IntegrityError
from .tasks import ingest_epaper_jsonl as _impl
from .extensions import db
from .models import Author, Post

log = logging.getLogger(__name__)

def _now_utc():
    return datetime.now(timezone.utc)

def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None

def _upsert_author(name: str, party: Optional[str] = None) -> Author:
    a = Author.query.filter_by(name=name).first()
    if not a:
        a = Author(name=name, party=party)
        db.session.add(a)
        db.session.flush()
    return a

def _add_post(text: str, author: Author, city: Optional[str], party: Optional[str], created_at: Optional[datetime]):
    p = Post(
        text=text[:10000],  # hard cap to protect DB
        author=author,
        city=city,
        party=party,
        created_at=created_at or _now_utc(),
    )
    db.session.add(p)
    return p

def _iter_jsonl(path: str) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)

def _compose_text(title: Optional[str], body: Optional[str]) -> str:
    title = (title or "").strip()
    body  = (body  or "").strip()
    return f"{title}\n\n{body}".strip()

def _created_at_from(pub_date: Optional[date]) -> Optional[datetime]:
    if not pub_date:
        return None
    return datetime(pub_date.year, pub_date.month, pub_date.day, tzinfo=timezone.utc)

def _ingest_epaper_jsonl_core(jsonl_path: str) -> int:
    """
    JSONL schema per line:
    {
      "publication_name": "Eenadu",
      "publication_date": "2025-08-10",
      "title": "Headline",
      "body": "Full article text...",
      "city": "Hyderabad",
      "party": "INC"  // optional tagging if you have it
    }
    """
    count = 0
    for row in _iter_jsonl(jsonl_path):
        pub  = (row.get("publication_name") or "Unknown Publication").strip()
        pubd = _parse_date(row.get("publication_date"))
        title = row.get("title")
        body  = row.get("body")
        city  = row.get("city")
        party = row.get("party")

        author = _upsert_author(pub)
        text = _compose_text(title, body)
        created_at = _created_at_from(pubd)

        _add_post(text=text, author=author, city=city, party=party, created_at=created_at)
        count += 1

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        log.exception("Integrity error while committing epaper posts")
        raise
    return count

@shared_task(bind=True, name="app.tasks_epaper.ingest_epaper_jsonl")
def ingest_epaper_jsonl(self, jsonl_path: str) -> str:
    n = _ingest_epaper_jsonl_core(jsonl_path)
    msg = f"ingest_epaper_jsonl: inserted {n} Post rows from {jsonl_path}"
    log.info(msg)
    return msg
@shared_task(bind=True, name="app.tasks_epaper.ingest_epaper_jsonl")
def ingest_epaper_jsonl(self, jsonl_path: str):
    return _impl.apply(args=(jsonl_path, True)).get()