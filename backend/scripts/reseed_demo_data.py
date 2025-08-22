from datetime import datetime, timezone
# backend/scripts/reseed_demo_data.py
import os
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

# Make "app" importable when running as a script
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app import create_app, db
from app.models import Post, Author  # use only columns that actually exist

WARDS = [
    "Jubilee Hills", "Kapra", "Gandhinagar", "Himayath Nagar", "Banjara Hills",
    "Ramnathpur", "Khairatabad", "Asif Nagar", "Habsiguda", "Malkajgiri",
    "Marredpally", "Begumpet", "Fateh Nagar", "Langar Houz",
]
PARTIES = ["BJP", "BRS", "INC", "AIMIM"]
EMOTIONS = ["Anger", "Pride", "Positive", "Frustration", "Hopeful", "Admiration", "Negative"]

POSITIVE_LINES = [
    "Progress on 2BHK housing continues; residents appreciate the speed.",
    "Water-logging hotspots fixed; drainage upgrade underway.",
    "Community clinic inaugurated; great turnout today.",
    "Local roads relaid; travel time improving.",
    "Metro connectivity improved; residents happy with new station access.",
    "Park development completed; families enjoying green spaces.",
    "Street lights installation finished; safer nights for all.",
    "Digital literacy center opened; youth learning new skills.",
]
NEGATIVE_LINES = [
    "Opposition rallies again; no plan for flooding challenges.",
    "Sewage overflow complaints persist; need faster escalation.",
    "Garbage pickup delays reported; pressure is building.",
    "Traffic snarls worsening; junction redesign required.",
    "Power outages increasing; need immediate transformer upgrade.",
    "Water supply irregular; tanker dependency growing.",
    "Road conditions deteriorating; monsoon damage unrepaired.",
    "Auto-rickshaw fare disputes; need better regulation.",
]

def pick_line(emotion: str) -> str:
    return random.choice(POSITIVE_LINES if emotion in {"Pride","Positive","Admiration","Hopeful"} else NEGATIVE_LINES)

def run():
    app = create_app()
    with app.app_context():
        # Ensure helper columns used by analytics (dev-safe, idempotent)
        db.session.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='post' AND column_name='created_at'
                ) THEN
                  EXECUTE 'ALTER TABLE post ADD COLUMN created_at TIMESTAMPTZ';
                END IF;

                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='post' AND column_name='party'
                ) THEN
                  EXECUTE 'ALTER TABLE post ADD COLUMN party VARCHAR(64)';
                END IF;

                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='post' AND column_name='city'
                ) THEN
                  EXECUTE 'ALTER TABLE post ADD COLUMN city VARCHAR(128)';
                END IF;
            END$$;
        """))
        db.session.commit()

        # 🔹 Guarantee a valid author_id (your Post.author_id is NOT NULL)
        author = Author.query.filter_by(name="Demo Seeder").first()
        if not author:
            # Build minimal kwargs using only valid Author columns
            author_cols = {c.name: c for c in Author.__table__.columns}
            author_kwargs = {}
            if "name" in author_cols:
                author_kwargs["name"] = "Demo Seeder"
            # Fill any other NOT NULL string columns with a safe default
            for c in author_cols.values():
                if c.name in ("id", "name", "created_at"):
                    continue
                # If NOT NULL and no default on DB side, supply a simple value
                if not c.nullable and c.default is None and c.server_default is None:
                    try:
                        pytype = c.type.python_type  # may raise for some SQL types
                    except Exception:
                        pytype = str
                    if pytype is str:
                        author_kwargs.setdefault(c.name, "demo")
                    elif pytype is int:
                        author_kwargs.setdefault(c.name, 0)
                    elif pytype is bool:
                        author_kwargs.setdefault(c.name, False)
                    else:
                        # last resort: string
                        author_kwargs.setdefault(c.name, "demo")
            author = Author(**author_kwargs)
            db.session.add(author)
            db.session.commit()
        author_id = author.id

        # Clear existing demo posts to keep charts deterministic (remove if you want to append)
        db.session.execute(text("DELETE FROM post"))
        db.session.commit()

        # Detect mapped columns on your Post model
        post_cols = set(Post.__table__.columns.keys())

        # Choose which emotion column to use
        emotion_key = None
        for k in ("emotion", "detected_emotion", "emotion_label"):
            if k in post_cols:
                emotion_key = k
                break

        # Choose text/content column
        text_key = "text" if "text" in post_cols else ("content" if "content" in post_cols else None)

        now = datetime.now(timezone.utc)
        batch = []
        for day in range(30, -1, -1):
            base = now - timedelta(days=day)
            for _ in range(random.randint(20, 40)):
                when = base + timedelta(minutes=random.randint(0, 1440))
                ward = random.choice(WARDS)
                party = random.choice(PARTIES)
                emo = random.choice(EMOTIONS)
                line = pick_line(emo)
                composed = f"{ward}: {line} #{party}"

                row = {}

                # author_id (required)
                if "author_id" in post_cols:
                    row["author_id"] = author_id

                # city/ward
                if "city" in post_cols:
                    row["city"] = ward
                elif "ward" in post_cols:
                    row["ward"] = ward

                # party
                if "party" in post_cols:
                    row["party"] = party

                # emotion
                if emotion_key:
                    row[emotion_key] = emo

                # created_at
                if "created_at" in post_cols:
                    row["created_at"] = when

                # text/content
                if text_key:
                    row[text_key] = composed

                batch.append(Post(**row))

        db.session.add_all(batch)
        db.session.commit()

        # Helpful index for time-range queries (idempotent)
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_post_created_at ON post (created_at)"))
        db.session.commit()

        print("✅ Reseed complete: demo posts generated with valid author_id and created_at over the last 31 days.")

if __name__ == "__main__":
    run()
