import os
import json
import logging
from datetime import datetime, timezone, date
from typing import Optional, Iterable, Dict, Any

from celery import shared_task
from sqlalchemy.exc import IntegrityError

from .extensions import db

# Try to import Epaper; if it's unavailable we still ingest directly into Post.
try:
    from .models import Epaper, Author, Post
    HAS_EPAPER = True
except Exception:  # pragma: no cover
    from .models import Author, Post
    Epaper = None
    HAS_EPAPER = False

log = logging.getLogger(__name__)


# ----------------------------- helpers --------------------------------- #

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

def _compose_text(title: Optional[str], body: Optional[str]) -> str:
    title = (title or "").strip()
    body = (body or "").strip()
    return f"{title}\n\n{body}".strip() if title and body else (title or body)

def _created_at_from(pub_date: Optional[date]) -> Optional[datetime]:
    if not pub_date:
        return None
    # set created_at to midnight UTC of publication date
    return datetime(pub_date.year, pub_date.month, pub_date.day, tzinfo=timezone.utc)

def _iter_jsonl(path: str) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)

def _upsert_author(name: str, party: Optional[str] = None):
    a = Author.query.filter_by(name=name).first()
    if not a:
        a = Author(name=name, party=party)
        db.session.add(a)
        db.session.flush()  # ensure a.id exists
    return a

def _add_post(*, text: str, author, city: Optional[str],
              party: Optional[str], created_at: Optional[datetime]):
    p = Post(
        text=(text or "")[:10000],  # hard cap to protect DB
        author=author,
        city=city,
        party=party,
        created_at=created_at or _now_utc(),
    )
    db.session.add(p)
    return p


# ------------------------------ tasks ---------------------------------- #

@shared_task(bind=True, name="app.tasks.ingest_epaper_jsonl")
def ingest_epaper_jsonl(self, jsonl_path: str, also_create_posts: bool = True) -> str:
    """
    Ingest a JSONL file where each line looks like:
      {
        "publication_name": "Eenadu",
        "publication_date": "2025-08-10",
        "title": "Headline",
        "body": "Full article text...",
        "city": "Hyderabad",
        "party": "INC"           # optional
      }

    - If Epaper model exists: save a row to `Epaper` for each line.
    - If also_create_posts=True (default): mirror to `Post` so features/UI see it.
    - If Epaper model is missing: directly create `Post` rows (defensive fallback).
    """
    if not os.path.exists(jsonl_path):
        msg = f"ingest_epaper_jsonl: file not found: {jsonl_path}"
        log.error(msg)
        return msg

    inserted_epaper = 0
    inserted_posts = 0

    try:
        for row in _iter_jsonl(jsonl_path):
            publication = (row.get("publication_name") or "Unknown Publication").strip()
            pub_date = _parse_date(row.get("publication_date"))
            title = row.get("title")
            body = row.get("body")
            city = row.get("city")
            party = row.get("party")
            text = _compose_text(title, body)
            created_at = _created_at_from(pub_date)

            # Always ensure an Author exists (used for Post mirror)
            author = _upsert_author(publication)

            # Store raw archive if Epaper is available
            if HAS_EPAPER:
                ep = Epaper(
                    publication_name=publication,
                    publication_date=pub_date or _now_utc().date(),
                    raw_text=text,
                    created_at=_now_utc(),
                )
                db.session.add(ep)
                inserted_epaper += 1

            # Mirror to Post (recommended so downstream features work)
            if also_create_posts or not HAS_EPAPER:
                _add_post(
                    text=text,
                    author=author,
                    city=city,
                    party=party,
                    created_at=created_at,
                )
                inserted_posts += 1

        db.session.commit()
        msg = (
            f"ingest_epaper_jsonl: epaper_rows={inserted_epaper} "
            f"post_rows={inserted_posts} from {jsonl_path} (HAS_EPAPER={HAS_EPAPER})"
        )
        log.info(msg)
        return msg
    except Exception as e:  # pragma: no cover
        db.session.rollback()
        log.exception("ingest_epaper_jsonl failed")
        return f"ingest_epaper_jsonl: ERROR {e!r}"


@shared_task(bind=True, name="app.tasks.ingest_epaper_dir")
def ingest_epaper_dir(self, dir_path: str, also_create_posts: bool = True) -> str:
    """
    Ingest all *.jsonl files in a directory (non-recursive), sorted by name.
    """
    if not os.path.isdir(dir_path):
        msg = f"ingest_epaper_dir: not a directory: {dir_path}"
        log.error(msg)
        return msg

    files = sorted(fn for fn in os.listdir(dir_path) if fn.lower().endswith(".jsonl"))
    total_epaper = 0
    total_posts = 0
    for fn in files:
        res = ingest_epaper_jsonl.apply(args=(os.path.join(dir_path, fn), also_create_posts)).get()
        # Parse counts back out of the message string (simple/robust)
        # Format: "ingest_epaper_jsonl: epaper_rows=X post_rows=Y from ..."
        try:
            parts = res.split()
            x = int(parts[2].split("=")[1])
            y = int(parts[3].split("=")[1])
            total_epaper += x
            total_posts += y
        except Exception:
            log.warning("ingest_epaper_dir: could not parse child result: %s", res)

    msg = f"ingest_epaper_dir: epaper_rows={total_epaper} post_rows={total_posts} from {dir_path}"
    log.info(msg)
    return msg


@shared_task(bind=True, name="app.tasks.ping")
def ping(self) -> Dict[str, Any]:
    """Simple health check task."""
    return {"pong": True, "at": _now_utc().isoformat()}
