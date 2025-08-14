LokDarpan — Phase-A Technical Reference
Last updated: Aug 2025 • Branch baseline: main (after “Trends API + UI” merge)

0) Executive summary
Phase-A delivers a stable Political War Room with:

Ward-aware UI (map + dropdown stay in sync, view persists)

On-Demand Strategic Briefings (“Area Pulse”) with resilient fallbacks

Realistic demo data seeded across wards with timestamps, emotions & parties

Time-series analytics: Emotions & Share-of-Voice + Competitor Trend

Graceful handling of empty datasets, improved loading/error UX

Build & tooling fixes (Vite + Tailwind + Recharts)

This document is the source of truth for environment, endpoints, data contracts, UI wiring, and iteration guardrails.

1) Runbook
1.1 Prerequisites
Python 3.12

Node.js 18+

PostgreSQL (or any SQLAlchemy-compatible DB)

Redis (recommended for Celery; optional in demo)

Optional external keys:

NEWS_API_KEY (NewsAPI)

GEMINI_API_KEY (Google Generative AI)

1.2 Backend
bash
Copy
Edit
# from backend/
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

# environment (example)
export FLASK_ENV=production
export SECRET_KEY=dev-secret
export DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/lokdarpan
export CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# optional AI/news
export NEWS_API_KEY=...
export GEMINI_API_KEY=...

# run API
flask run  # http://127.0.0.1:5000
Celery (optional):

bash
Copy
Edit
# worker
celery -A app.celery worker -l info
# optional beat (if/when scheduling ingest)
celery -A app.celery beat -l info
1.3 Frontend
bash
Copy
Edit
# from frontend/
npm i
npm run dev   # http://localhost:5173
Create frontend/.env:

ini
Copy
Edit
VITE_API_BASE_URL=http://127.0.0.1:5000
2) Data & assets
Ward polygons (GeoJSON)
backend/app/data/ghmc_wards.geojson → served at /api/v1/geojson.

Electorate metadata (UI chips)
frontend/public/data/wardData.js and frontend/public/data/wardVoters.js
Used for “Voters / Turnout / Last Winner” in StrategicSummary.jsx.

Ward normalization (shared convention)
Normalize user/label inputs to align map labels, dropdown values, and server filters:

Remove prefixes like Ward 95, Ward No. 12, 95 -, 95 .

Collapse whitespace.

Preserve human name, e.g.
“Ward 95 Jubilee Hills” → “Jubilee Hills”,
“Ward 7 Himayath Nagar” → “Himayath Nagar”.

Keep this logic consistent across backend filters and frontend components.

3) Backend architecture
3.1 App factory & extensions
app/__init__.py creates Flask app, initializes:

db, migrate, login_manager, celery (via celery_init_app)

CORS restricted to http://localhost:5173 and http://127.0.0.1:5173

Registers blueprints:

legacy/main routes

trends blueprint (new)

3.2 Models (relevant fields)
User — auth via session cookie.

Author — { id, name, platform } (demo “Demo Seeder” author).

Post — { id, text, author_id, city, emotion, party, created_at }

created_at is required for time-series.

Alert — { ward, opportunities, threats, actionable_alerts, source_articles }

Epaper — optional store for downloaded PDFs/extracted text.

Phase-A favors reseed over “backfill migrations” to guarantee coherent, dated data.

3.3 REST endpoints
Auth
POST /api/v1/login

json
Copy
Edit
{ "username": "user", "password": "ayra" }
Returns JSON & sets secure session cookie.

Geo
GET /api/v1/geojson
Ward polygons (GeoJSON FeatureCollection).

Content
GET /api/v1/posts?city=<Ward|All>
Demo posts filtered by city (normalized ward name).

GET /api/v1/competitive-analysis?city=<Ward|All>
Aggregate mentions/positivity per party (server-side).

New: Trends
GET /api/v1/trends?ward=<Ward|All>&days=30

Response contract

json
Copy
Edit
{
  "ward": "Jubilee Hills",
  "start_date": "2025-07-16",
  "end_date": "2025-08-14",
  "days": 30,
  "party_keys": ["AIMIM","BJP","BRS","INC","Other"],
  "emotion_keys": ["Positive","Anger","Negative","Hopeful","Pride","Admiration","Frustration"],
  "series": [
    {
      "date": "2025-08-01",
      "mentions_total": 12,
      "emotions": { "Positive": 3, "Anger": 2, "Negative": 1, "Hopeful": 2 },
      "parties":  { "BRS": 5, "BJP": 4, "INC": 2, "AIMIM": 1, "Other": 0 }
    }
  ]
}
Share-of-Voice is computed in the UI as party_mentions / mentions_total per day.

Empty days are returned with zeros; the UI displays an informative “no data” state.

New: Area Pulse
GET /api/v1/pulse/<ward>?days=14
Returns briefing + evidence slice.

Response contract

json
Copy
Edit
{
  "status": "ok",
  "ward": "Jubilee Hills",
  "days": 14,
  "briefing": {
    "key_issue": "Recent discourse in Jubilee Hills centers around Positive.",
    "our_angle": "Our candidate will ...",
    "opposition_weakness": "Opposition messaging ...",
    "recommended_actions": [
      { "action": "Door-to-door listening", "timeline": "Within 72h", "details": "..." },
      { "action": "Local media pitch",      "timeline": "This week",   "details": "..." },
      { "action": "WhatsApp micro-content", "timeline": "48h",         "details": "..." }
    ],
    "top_emotions": [ { "emotion": "Positive", "count": 8 }, ... ],
    "top_keywords": [ { "term": "jubilee", "count": 31 }, ... ],
    "top_sources":  [ { "source": "Demo Seeder", "count": 31 } ]
  },
  "metrics": { ... },
  "evidence": [ { "author": "Demo Seeder", "text": "..." }, ... ]
}
Trigger analysis (best-effort)
POST /api/v1/trigger_analysis
Kicks a Celery task to scan general Hyderabad news using NewsAPI + Gemini.
UI always falls back to local summarization if this is unavailable.

3.4 Celery tasks (optional)
analyze_news_for_alerts(ward)

NewsAPI search → Gemini prompt → stores JSON in Alert row.

ingest_and_analyze_epaper()

(Scaffold) parse PDFs, then distinct Post.city drives ward analysis.

4) Data seeding & migrations
4.1 Reseed (recommended for demo)
ini
Copy
Edit
# from backend/
PYTHONPATH=. python scripts/reseed_demo_data.py
What it guarantees:

One Author(name="Demo Seeder", platform="internal")

~30 days of posts, spread across wards with realistic topics

Each post has created_at, emotion, party, city

4.2 Alembic (only if needed)
If multiple heads occur, either specify a head:

bash
Copy
Edit
flask db revision -m "add <field>" --head <current-head>
flask db upgrade
…or merge:

bash
Copy
Edit
flask db merge -m "merge heads" <head1> <head2>
flask db upgrade
5) Frontend architecture
5.1 Stack
React 18 + Vite 7

TailwindCSS

Recharts for time-series charts

Leaflet / React-Leaflet for maps

Axios for API

Build/tooling fixes

package.json cleaned; recharts added.

postcss.config.cjs (CommonJS) to satisfy Vite/Tailwind with "type": "module".

5.2 Key components
Dashboard.jsx

Loads GeoJSON once → the map no longer resets zoom/center.

Normalized ward names; dropdown & map stay in sync.

Fetches posts & competitive analysis on ward change; passes filters down.

LocationMap.jsx

Renders ward polygons; clicking a polygon sets selectedWard without altering current view.

StrategicSummary.jsx

Chips from /public/data/ward(Voters|Data).js (Voters / Turnout / Last Winner).

“Area Pulse”:

Try GET /api/v1/alerts/<ward> (if any Celery/News analysis exists),

Fallback: local summarization on /api/v1/posts?city=ward (extract keywords & craft narrative).

Clear “No recent posts …” status when empty.

EmotionChart.jsx

Converts posts into a static distribution chart (graceful empty state).

CompetitiveAnalysis.jsx

Uses server aggregate when available; otherwise counts from posts.

TimeSeriesChart.jsx ✅

Calls /api/v1/trends and renders:

Mentions (line)

Emotions (multiple lines)

Shows “Loading trend data…” or “No data” as appropriate.

CompetitorTrendChart.jsx ✅

Calls /api/v1/trends, computes Share-of-Voice % per day for BRS/BJP/INC/AIMIM/Other.

CompetitorBenchmark.jsx

Simple table of mentions, positives/negatives, engagement ratio.

PredictionSummary.jsx

Heuristic “if election held today” by emotions/party counts.

AlertsPanel.jsx

Intelligence feed (posts table) + surfaces Recommended Actions when available.

5.3 UX rules
Ward can be changed from map or dropdown; both remain synchronized.

Map view/zoom persists across selections.

All panels show useful loading & empty states (no dead spinners).

6) Security & config
CORS limited to http://localhost:5173 and http://127.0.0.1:5173; credentials enabled.

Session cookie is Secure; HttpOnly; SameSite=None (works for local dev).

External keys not committed; all read from environment.

Demo data contains no PII.

7) Quick tests (smoke)
Login

bash
Copy
Edit
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"username":"user","password":"ayra"}' \
  http://127.0.0.1:5000/api/v1/login
GeoJSON

bash
Copy
Edit
curl -i -b cookies.txt http://127.0.0.1:5000/api/v1/geojson | head
Trends

bash
Copy
Edit
curl -i -b cookies.txt "http://127.0.0.1:5000/api/v1/trends?ward=All&days=30"
Pulse

bash
Copy
Edit
curl -i -b cookies.txt "http://127.0.0.1:5000/api/v1/pulse/Jubilee%20Hills?days=14"
Front-end checks

Select a ward on the map → dropdown updates; map view remains.

“Trend: Emotions & Share of Voice” shows lines once seeded.

“Competitor Trend (Share of Voice)” shows multiple party lines.

Strategic Summary displays chips + narrative + three recommended actions.

8) Troubleshooting
Recharts or Vite errors
Run npm i after updating package.json. Ensure postcss.config.cjs exists (CommonJS).

PostCSS ESM error
Rename to postcss.config.cjs (not .js) since package.json uses "type": "module".

Multiple Alembic heads
Use --head on revision, or flask db merge.

No time-series data
Ensure posts have created_at. Run PYTHONPATH=. python scripts/reseed_demo_data.py.

Area Pulse returns “No recent posts …”
That’s expected if a ward has no posts in the last N days. Seed more data or switch wards.

9) Roadmap (next iterations)
Demographics & Electorate overlay
Expand wardVoters.js with age/literacy/caste; add map overlay & insights.

Smarter Area Pulse
Blend local infra registries + news + recent posts. Evidence panel with sources/snippets.

Richer trends
Weekly rollups, smoothing, spike drilldown to posts.

Benchmarking 2.0
Topic-sentiment by party and alerting when a party is vulnerable in a ward.

Predictive models
Train on historical elections + turnout + demographics + sentiment.

Data pipeline
ETL with dedupe, language detection & NER; job health dashboards.

Ops/security
RBAC, rate limiting, caching, pagination, one-click demo reset.

10) File map (key)
Backend

bash
Copy
Edit
app/
  __init__.py                 # app factory, CORS, Celery, blueprints
  routes.py                   # legacy APIs
  trends_api.py               # NEW: /api/v1/trends, /api/v1/pulse
  tasks.py                    # Celery: news analysis & epaper scaffold
  data/ghmc_wards.geojson     # polygons
scripts/
  reseed_demo_data.py         # NEW: realistic dated posts for trends
Frontend

bash
Copy
Edit
public/
  data/wardData.js
  data/wardVoters.js

src/components/
  Dashboard.jsx
  LocationMap.jsx
  StrategicSummary.jsx
  EmotionChart.jsx
  CompetitiveAnalysis.jsx
  TimeSeriesChart.jsx           # NEW
  CompetitorTrendChart.jsx      # NEW
  CompetitorBenchmark.jsx
  PredictionSummary.jsx
  AlertsPanel.jsx
Tooling:

lua
Copy
Edit
postcss.config.cjs
package.json
11) Conventions for future agents
Reseed, don’t backfill. Use reseed_demo_data.py to guarantee coherent time-series.

Keep ward normalization consistent across backend filters and UI labels.

Favor server aggregates (/trends, /competitive-analysis) and fallback to client counts for UX continuity.

Never remove empty-state and loading branches—they’re deliberate for resilience.

Any new data file added for chips or overlays should live under frontend/public/data/.

12) Appendix — sample commit message
bash
Copy
Edit
feat(trends+ui): add time-series Trends API & wire charts; harden strategic briefings; seed realistic data; fix build

- Backend
  • new /api/v1/trends?ward=&days=
  • /api/v1/pulse/<ward> with briefing + evidence
  • reseed_demo_data.py produces 30d of dated posts across wards
  • robust empty-state handling, ward normalization shared

- Frontend
  • TimeSeriesChart + CompetitorTrendChart pulling /trends
  • StrategicSummary chips + resilient Area Pulse
  • Map view persists; dropdown/map sync
  • package.json/postcss.cjs fixes; recharts added

BREAKING: requires `npm i` and reseed for time-series.
