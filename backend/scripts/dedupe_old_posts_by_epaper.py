# scripts/dedupe_old_posts_by_epaper.py
import hashlib
from datetime import timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, delete
from app import create_app
from app.extensions import db
from app.models import Post, Epaper, Author

def _norm(s: Optional[str]) -> str:
    return " ".join((s or "").strip().split()).lower()

def _sha(author_name: str, pub_date, text: str) -> str:
    key = f"{_norm(author_name)}|{pub_date.isoformat()}|{_norm(text)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def _pub_date(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.date()

def _plan_dupes() -> List[Tuple[int, int, list]]:
    """
    Returns a list of (epaper_id, keep_post_id, delete_post_ids[])
    Only deletes posts where epaper_id IS NULL; keeps the one already linked.
    """
    # Map sha256 -> epaper_id
    ep_map = dict(db.session.execute(select(Epaper.sha256, Epaper.id)).all())

    # Find a canonical (already linked) Post per epaper
    keep_map = dict(db.session.execute(
        select(Post.epaper_id, Post.id)
        .where(Post.epaper_id.is_not(None))
    ).all())

    # Scan legacy posts (epaper_id is NULL)
    rows = db.session.execute(
        select(Post.id, Post.text, Post.created_at, Author.name)
        .join(Author, Post.author_id == Author.id)
        .where(Post.epaper_id.is_(None))
    ).all()

    # Group candidates by sha
    buckets = {}
    for pid, text, created_at, author_name in rows:
        if not text or not created_at or not author_name:
            continue
        sha = _sha(author_name, _pub_date(created_at), text)
        buckets.setdefault(sha, []).append(pid)

    plan = []
    for sha, ids in buckets.items():
        ep_id = ep_map.get(sha)
        keep_id = keep_map.get(ep_id)
        if not ep_id or not keep_id:
            # Either we don't have an Epaper for that sha, or there is no canonical Post yet
            continue
        to_delete = [pid for pid in ids if pid != keep_id]
        if to_delete:
            plan.append((ep_id, keep_id, to_delete))
    return plan

def main(apply: bool = False):
    app = create_app()
    with app.app_context():
        plan = _plan_dupes()
        total = 0
        for ep_id, keep_id, to_delete in plan:
            print(f"Epaper {ep_id}: keep post {keep_id}, delete {to_delete}")
            total += len(to_delete)
            if apply and to_delete:
                db.session.execute(delete(Post).where(Post.id.in_(to_delete)))
        if apply:
            db.session.commit()
            print(f"Deleted {total} duplicate posts.")
        else:
            print(f"Dry run. Would delete {total} posts. Re-run with --apply to actually delete.")

if __name__ == "__main__":
    import sys
    main(apply="--apply" in sys.argv)
