# scripts/backfill_post_epaper_id.py
import hashlib
from datetime import timezone
from typing import Optional

from sqlalchemy import select, update
from app import create_app
from app.extensions import db
from app.models import Post, Epaper, Author

BATCH = 1000

def _norm(s: Optional[str]) -> str:
    return " ".join((s or "").strip().split()).lower()

def _epaper_sha(publication_name: str, publication_date, raw_text: str) -> str:
    key = f"{_norm(publication_name)}|{publication_date.isoformat()}|{_norm(raw_text)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def _pub_date_from_post_created_at(dt):
    """Treat naive timestamps as UTC; then take the UTC date."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.date()

def main():
    app = create_app()
    with app.app_context():
        scanned = linked = skipped = 0
        last_id = 0

        while True:
            # Stream only columns we need; avoid ORM entities to prevent autoflush/lazy loads
            rows = db.session.execute(
                select(Post.id, Post.text, Post.created_at, Author.name)
                .join(Author, Post.author_id == Author.id)
                .where(Post.epaper_id.is_(None), Post.id > last_id)
                .order_by(Post.id)
                .limit(BATCH)
            ).all()

            if not rows:
                break

            for pid, text, created_at, author_name in rows:
                scanned += 1
                last_id = pid

                if not text or not created_at or not author_name:
                    continue

                pub_date = _pub_date_from_post_created_at(created_at)
                sha = _epaper_sha(author_name, pub_date, text)

                ep_id = db.session.execute(
                    select(Epaper.id).where(Epaper.sha256 == sha)
                ).scalar()

                if not ep_id:
                    # No matching Epaper; nothing to link
                    continue

                # If some Post is ALREADY linked to this Epaper, skip this one
                already = db.session.execute(
                    select(Post.id).where(Post.epaper_id == ep_id).limit(1)
                ).scalar()

                if already:
                    skipped += 1
                    continue

                # Link this Post (guard again to avoid racing another writer)
                db.session.execute(
                    update(Post)
                    .where(Post.id == pid, Post.epaper_id.is_(None))
                    .values(epaper_id=ep_id)
                )
                linked += 1

            db.session.commit()

        print(f"Scanned: {scanned}, Linked: {linked}, Skipped_due_to_unique: {skipped}")

if __name__ == "__main__":
    main()
