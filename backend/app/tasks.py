# app/tasks.py
import os
import json
import hashlib
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

def _norm(s: Optional[str]) -> str:
    return " ".join((s or "").strip().split()).lower()

def _epaper_key(publication_name: str, publication_date: date, raw_text: str) -> str:
    return f"{_norm(publication_name)}|{publication_date.isoformat()}|{_norm(raw_text)}"

def _epaper_sha(publication_name: str, publication_date: date, raw_text: str) -> str:
    return hashlib.sha256(_epaper_key(publication_name, publication_date, raw_text).encode("utf-8")).hexdigest()

def _upsert_author(name: str, party: Optional[str] = None) -> Author:
    a = Author.query.filter_by(name=name).first()
    if not a:
        a = Author(name=name, party=party)
        db.session.add(a)
        db.session.flush()  # ensure a.id exists
    return a

def _add_post(
    *,
    text: str,
    author: Author,
    city: Optional[str],
    party: Optional[str],
    created_at: Optional[datetime],
    epaper_id: Optional[int] = None,
) -> Post:
    p = Post(
        text=(text or "")[:10000],  # protect DB
        author=author,
        city=city,
        party=party,
        created_at=created_at or _now_utc(),
        epaper_id=epaper_id,
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

    - If Epaper model exists: upsert by sha256; one Epaper row per unique article.
    - Mirror to Post (also_create_posts=True by default) and link Post.epaper_id.
    - Avoid duplicate Posts for the same epaper (idempotent re-ingest).
    - If Epaper model is missing: create only Post rows (fallback).
    """
    if not os.path.exists(jsonl_path):
        msg = f"ingest_epaper_jsonl: file not found: {jsonl_path}"
        log.error(msg)
        return msg

    inserted_epaper = 0
    reused_epaper = 0
    inserted_posts = 0
    skipped_posts = 0

    try:
        for row in _iter_jsonl(jsonl_path):
            publication = (row.get("publication_name") or "Unknown Publication").strip()
            pub_date = _parse_date(row.get("publication_date")) or _now_utc().date()
            title = row.get("title")
            body = row.get("body")
            city = row.get("city")
            party = row.get("party")
            text = _compose_text(title, body)
            created_at = _created_at_from(pub_date)

            epaper_id = None

            # Prepare/Upsert Epaper (if model available)
            if HAS_EPAPER:
                sha = _epaper_sha(publication, pub_date, text)
                ep = Epaper.query.filter_by(sha256=sha).first()
                if ep is None:
                    ep = Epaper(
                        publication_name=publication,
                        publication_date=pub_date,
                        raw_text=text,
                        created_at=_now_utc(),
                        sha256=sha,
                    )
                    db.session.add(ep)
                    try:
                        db.session.flush()  # assign ep.id
                        inserted_epaper += 1
                    except IntegrityError:
                        # Another worker inserted the same row; rollback the failed insert
                        db.session.rollback()
                        ep = Epaper.query.filter_by(sha256=sha).first()
                        if ep is None:
                            # extremely unlikely; bubble up
                            raise
                        reused_epaper += 1
                        # IMPORTANT: After rollback the session is clean; make sure Author exists again below
                else:
                    reused_epaper += 1

                epaper_id = ep.id

            # Ensure Author (do this *after* any rollback above)
            author = _upsert_author(publication)

            # Mirror to Post unless disabled (or always if Epaper is absent)
            if also_create_posts or not HAS_EPAPER:
                # Idempotency guard: if we already mirrored a Post for this epaper, don't add another
                if epaper_id is not None:
                    existing_post = Post.query.filter_by(epaper_id=epaper_id).first()
                    if existing_post:
                        skipped_posts += 1
                    else:
                        _add_post(
                            text=text,
                            author=author,
                            city=city,
                            party=party,
                            created_at=created_at,
                            epaper_id=epaper_id,
                        )
                        inserted_posts += 1
                else:
                    # No Epaper model or epaper_id -> create a plain Post (best effort)
                    _add_post(
                        text=text,
                        author=author,
                        city=city,
                        party=party,
                        created_at=created_at,
                        epaper_id=None,
                    )
                    inserted_posts += 1

        db.session.commit()
        msg = (
            f"ingest_epaper_jsonl: epaper_new={inserted_epaper} "
            f"epaper_reused={reused_epaper} posts={inserted_posts} "
            f"posts_skipped={skipped_posts} from {jsonl_path} (HAS_EPAPER={HAS_EPAPER})"
        )
        log.info(msg)
        return msg
    except Exception as e:  # pragma: no cover
        db.session.rollback()
        log.exception("ingest_epaper_jsonl failed")
        return f"ingest_epaper_jsonl: ERROR {e!r}"

@shared_task(bind=True, name="app.tasks.ingest_epaper_dir")
def ingest_epaper_dir(self, dir_path: str, also_create_posts: bool = True) -> str:
    """Ingest all *.jsonl files in a directory (non-recursive), sorted by name."""
    if not os.path.isdir(dir_path):
        msg = f"ingest_epaper_dir: not a directory: {dir_path}"
        log.error(msg)
        return msg

    files = sorted(fn for fn in os.listdir(dir_path) if fn.lower().endswith(".jsonl"))
    total_new = total_reused = total_posts = total_skipped = 0

    for fn in files:
        res = ingest_epaper_jsonl.apply(args=(os.path.join(dir_path, fn), also_create_posts)).get()
        # Example msg: "ingest_epaper_jsonl: epaper_new=1 epaper_reused=0 posts=1 posts_skipped=0 from ..."
        try:
            parts = dict(kv.split("=") for kv in (p for p in res.split() if "=" in p))
            total_new += int(parts.get("epaper_new", 0))
            total_reused += int(parts.get("epaper_reused", 0))
            total_posts += int(parts.get("posts", 0))
            total_skipped += int(parts.get("posts_skipped", 0))
        except Exception:
            log.warning("ingest_epaper_dir: could not parse child result: %s", res)

    msg = (
        f"ingest_epaper_dir: epaper_new={total_new} epaper_reused={total_reused} "
        f"posts={total_posts} posts_skipped={total_skipped} from {dir_path}"
    )
    log.info(msg)
    return msg

@shared_task(bind=True, name="app.tasks.ping")
def ping(self) -> Dict[str, Any]:
    """Simple health check task."""
    return {"pong": True, "at": _now_utc().isoformat()}
