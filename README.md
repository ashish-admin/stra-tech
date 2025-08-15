LokDarpan – Backend
====================

Flask + SQLAlchemy + Alembic + Celery backend for ward‑level electoral intelligence and news/epaper ingestion.

------------------------------------------------------------------

Changelog (last 24h)
--------------------

**Schema**
- Reintroduced `epaper` table and added **`epaper.sha256`** (NOT NULL, **UNIQUE**).
- Added **`post.epaper_id`** (FK → `epaper.id`) and created a **partial unique index** so there is at most one `post` per `epaper` when `epaper_id` is not null.
- Resolved multiple Alembic heads and merged to a **single head**.

**Tasks / Ingestion**
- `app.tasks.ingest_epaper_jsonl`: **idempotent upsert** into `epaper` by `sha256`, then **links/creates** a `post` with `post.epaper_id`; **skips duplicates** on re-runs.
- `app.tasks.ingest_epaper_dir`: helper to batch a directory of `.jsonl` files.

**API**
- `GET /api/v1/ward/meta/<ward_id>` now includes a **top‑level `updated_at`** (the max of nested timestamps).

**Time Handling**
- New/updated code uses **timezone‑aware UTC** (`datetime.now(timezone.utc)`). DB columns remain naive `DateTime` for now, but values written are UTC.

**Backfill scripts**
- `scripts/backfill_epaper_sha.py` (compute `sha256` for existing `epaper` rows).
- `scripts/backfill_post_epaper_id.py` (link legacy posts to epapers; safe with the partial unique index).

------------------------------------------------------------------

Stack
-----
- **Flask** application factory: `app:create_app`
- **PostgreSQL** (primary DB)
- **Redis** (Celery broker + results)
- **SQLAlchemy** ORM / **Alembic** migrations
- **Celery** worker + beat
- **Python 3.12**

------------------------------------------------------------------

Project layout (key)
--------------------
backend/
  app/
    __init__.py              # create_app(), celery integration
    extensions.py            # db, celery instances
    models.py                # ORM models (incl. epaper, post.epaper_id)
    ward_api.py              # /api/v1/ward/meta + /api/v1/prediction
    tasks.py                 # epaper ingestion (sha256 upsert + post link)
    tasks_epaper.py          # (legacy/simple ingestion kept for reference)
    electoral_tasks.py       # form20 ingest, features, profiles, etc.
  migrations/
    versions/*.py
  scripts/
    seed_minimal_ward.py
    backfill_epaper_sha.py
    backfill_post_epaper_id.py
  celery_worker.py           # worker/beat bootstrap + schedule example
  data/
    epaper/
      inbox/                 # drop .jsonl files here
      processed/

------------------------------------------------------------------

Environment & configuration
---------------------------
Create `backend/.env` with:

[Flask]
FLASK_ENV=development
SECRET_KEY=dev-change-me

[PostgreSQL]
DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db

[Redis / Celery]
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

------------------------------------------------------------------

Local development: quick start
------------------------------
# 0) Clone
git clone https://github.com/ashish-admin/stra-tech.git
cd stra-tech/backend

# 1) Python env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # if present

# 2) Environment
# If you keep a template:
# cp .env.example .env
# Otherwise paste the .env contents from the section above.

# 3) Database (ensure Postgres is running; create DB if needed)
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
createdb -h localhost -U postgres lokdarpan_db || true

# 4) Migrations
export FLASK_APP=app:create_app
flask db upgrade

# 5) Run API
flask run  # http://localhost:5000

------------------------------------------------------------------

API endpoints
-------------
- GET /api/v1/pulse/<ward>
- GET /api/v1/alerts/<ward>
- GET /api/v1/ward/meta/<ward_id>    (includes top-level `updated_at`)
- GET /api/v1/prediction/<ward_id>

Example:
curl -s http://localhost:5000/api/v1/ward/meta/WARD_001 | jq

------------------------------------------------------------------

Seeding a demo ward
-------------------
source venv/bin/activate
export FLASK_APP=app:create_app
python scripts/seed_minimal_ward.py

curl -s http://localhost:5000/api/v1/ward/meta/WARD_001 | jq
curl -s http://localhost:5000/api/v1/prediction/WARD_001 | jq

------------------------------------------------------------------

Epaper ingestion (JSONL → Epaper + Post)
----------------------------------------
JSONL schema per line:
{
  "publication_name": "Eenadu",
  "publication_date": "2025-08-10",
  "title": "Headline",
  "body": "Full article text...",
  "city": "Hyderabad",
  "party": "INC"
}

Try it:
mkdir -p data/epaper/inbox data/epaper/processed

cat > data/epaper/inbox/articles.jsonl <<'JSONL'
{"publication_name":"Eenadu","publication_date":"2025-08-10","title":"GHMC sanitation drive","body":"Residents report mixed results in ...","city":"Hyderabad"}
{"publication_name":"Sakshi","publication_date":"2025-08-10","title":"Ward 12 road repairs","body":"Work to be completed before ...","city":"Hyderabad","party":"INC"}
JSONL

# start a worker (in another terminal)
celery -A celery_worker.celery worker --loglevel=info

# enqueue (idempotent)
celery -A celery_worker.celery call app.tasks.ingest_epaper_jsonl --args='["data/epaper/inbox/articles.jsonl", true]'

What happens
- Epaper dedup by sha256 → one row per unique article.
- A Post is created/linked (`post.epaper_id = epaper.id`).
- Re-running with the same file skips duplicates.

Sanity checks
# Unique sha is enforced
psql "$DATABASE_URL" -c "SELECT count(*) epapers, count(sha256) sha_cnt, count(DISTINCT sha256) unique_sha FROM epaper;"

# At most one post per epaper
psql "$DATABASE_URL" -c "SELECT epaper_id, COUNT(*) FROM post WHERE epaper_id IS NOT NULL GROUP BY epaper_id HAVING COUNT(*)>1;"

# Spot check
psql "$DATABASE_URL" -c "SELECT id, epaper_id, city, created_at FROM post ORDER BY id DESC LIMIT 10;"

------------------------------------------------------------------

Backfill utilities
------------------
If you added `epaper.sha256` after having data:

# 1) compute sha for epaper rows
export PYTHONPATH="$(pwd)"
python scripts/backfill_epaper_sha.py
# Backfilling sha256 for N epaper rows... Done.

# 2) link legacy posts → epaper (skips if it would violate unique)
python scripts/backfill_post_epaper_id.py
# Scanned: X, Linked: Y, Skipped_due_to_unique: Z

------------------------------------------------------------------

Migrations & branching
----------------------
export FLASK_APP=app:create_app

# Create auto migration
flask db migrate -m "message"

# Or an empty revision (handwrite upgrade/downgrade)
flask db revision -m "message"

# Apply
flask db upgrade

# Heads/current
flask db heads
flask db current

# If multiple heads appear
flask db merge -m "merge heads" <head1> <head2>
flask db upgrade

------------------------------------------------------------------

How to deploy (Ubuntu + systemd + Nginx)
----------------------------------------

0) Prereqs
- Ubuntu 22.04+ (or similar)
- Postgres 14+ and Redis installed and running
- A non-root system user, e.g. `loka`
- Domain or host with Nginx

1) Layout
We’ll place the backend in `/opt/stra-tech/backend`:

sudo mkdir -p /opt/stra-tech
sudo chown -R $USER:$USER /opt/stra-tech
git clone https://github.com/ashish-admin/stra-tech.git /opt/stra-tech
cd /opt/stra-tech/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # if present

# Environment
cat > /opt/stra-tech/backend/.env <<'ENV'
FLASK_ENV=production
SECRET_KEY=change-me

DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db

REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
ENV

# DB migrate
export FLASK_APP=app:create_app
flask db upgrade

# Data dirs
mkdir -p /opt/stra-tech/backend/data/epaper/inbox /opt/stra-tech/backend/data/epaper/processed

2) Gunicorn (systemd)
Create `/etc/systemd/system/lokdarpan.service`:

[Unit]
Description=LokDarpan Flask (Gunicorn)
After=network.target

[Service]
User=loka
Group=loka
WorkingDirectory=/opt/stra-tech/backend
EnvironmentFile=/opt/stra-tech/backend/.env
ExecStart=/opt/stra-tech/backend/venv/bin/gunicorn -w 3 -b 127.0.0.1:8000 'app:create_app()'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

3) Celery worker (systemd)
Create `/etc/systemd/system/lokdarpan-celery.service`:

[Unit]
Description=LokDarpan Celery Worker
After=network.target redis-server.service
Requires=redis-server.service

[Service]
User=loka
Group=loka
WorkingDirectory=/opt/stra-tech/backend
EnvironmentFile=/opt/stra-tech/backend/.env
ExecStart=/opt/stra-tech/backend/venv/bin/celery -A celery_worker.celery worker --loglevel=info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

4) Celery beat (systemd)
Create `/etc/systemd/system/lokdarpan-celery-beat.service`:

[Unit]
Description=LokDarpan Celery Beat
After=network.target lokdarpan-celery.service

[Service]
User=loka
Group=loka
WorkingDirectory=/opt/stra-tech/backend
EnvironmentFile=/opt/stra-tech/backend/.env
ExecStart=/opt/stra-tech/backend/venv/bin/celery -A celery_worker.celery beat --loglevel=info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

Enable & start:

sudo systemctl daemon-reload
sudo systemctl enable --now lokdarpan.service
sudo systemctl enable --now lokdarpan-celery.service
sudo systemctl enable --now lokdarpan-celery-beat.service

# Check
systemctl status lokdarpan.service
journalctl -u lokdarpan.service -f

5) Nginx reverse proxy
Create `/etc/nginx/sites-available/lokdarpan`:

server {
    listen 80;
    server_name your.domain.com;

    client_max_body_size 16m;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}

Enable & reload:

sudo ln -s /etc/nginx/sites-available/lokdarpan /etc/nginx/sites-enabled/lokdarpan
sudo nginx -t
sudo systemctl reload nginx
# (Optional) Add Let’s Encrypt (Certbot) for HTTPS.

6) Zero-downtime deploy (manual)

cd /opt/stra-tech
git fetch --all
git checkout main
git pull

cd backend
source venv/bin/activate
pip install -r requirements.txt  # if dependencies changed
export FLASK_APP=app:create_app
flask db upgrade

sudo systemctl restart lokdarpan.service
sudo systemctl restart lokdarpan-celery.service
sudo systemctl restart lokdarpan-celery-beat.service

------------------------------------------------------------------

Operational tips
----------------
# Celery inspection
celery -A celery_worker.celery inspect registered
celery -A celery_worker.celery call app.tasks.ping

# Schedule ingestion (see celery_worker.py)
# (Python snippet)
from celery.schedules import crontab
celery.conf.beat_schedule = {
    "ingest-epaper-dir-6am": {
        "task": "app.tasks.ingest_epaper_dir",
        "schedule": crontab(hour=6, minute=0),
        "args": ("data/epaper/inbox", True),
    },
}

------------------------------------------------------------------

Time & UTC
----------
All new code uses **timezone‑aware UTC**:

from datetime import datetime, timezone
now_utc = datetime.now(timezone.utc)

DB columns remain naive `DateTime` for now, but we store UTC values.
When ready, we can migrate to `DateTime(timezone=True)` and add `server_default=func.now()`.

------------------------------------------------------------------

Troubleshooting
---------------
- psql: FATAL: database "amuktha" does not exist
  Use a full connection string:
  psql "postgresql://postgres:amuktha@localhost/lokdarpan_db"

- Alembic multiple heads
  flask db heads
  flask db merge -m "merge heads" <headA> <headB>
  flask db upgrade

- ImportError: cannot import name 'Epaper'
  Apply migrations and restart worker:
  flask db upgrade
  systemctl restart lokdarpan-celery.service

- IntegrityError: duplicate key ... uq_post_epaper_id during backfill
  The backfill script intentionally skips linking when a different Post already owns that `epaper_id`.

- Celery broker connection warnings
  In Celery 6, set `broker_connection_retry_on_startup=True` if needed.

------------------------------------------------------------------

License
-------
TBD
