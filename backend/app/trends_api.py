# backend/app/trends_api.py
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import re

from flask import Blueprint, jsonify, request
from flask_login import login_required
from sqlalchemy import func

from . import db
from .models import Post, Author
from .utils.ward import normalize_ward

trends_bp = Blueprint("trends_bp", __name__, url_prefix="/api/v1")

# Known party aliases (extend as needed)
PARTY_ALIAS = {
    "BJP Telangana": "BJP",
    "BRS Party": "BRS",
    "Telangana Rashtra Samithi": "BRS",
    "TRS": "BRS",
    "Indian National Congress": "INC",
    "Telangana Congress": "INC",
    "INC": "INC",
    "AIMIM": "AIMIM",
}

# ---- Robust, dependency-free date parsing ----------------------------------

_DDMMYYYY = re.compile(r"^(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$")

def _parse_date_value(v):
    """Parse a variety of date formats into naive UTC datetime (or None)."""
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    # Epoch seconds/millis
    if isinstance(v, (int, float)):
        try:
            return datetime.utcfromtimestamp(v if v > 1e12 else v * 1000 / 1000.0)
        except Exception:
            return None
    s = str(v).strip()
    # ISO / “YYYY-MM-DD …”
    if re.match(r"^\d{4}[-/]\d{2}[-/]\d{2}", s):
        try:
            # normalize a possible "YYYY-MM-DD HH:mm:ss"
            s2 = s.replace(" ", "T")
            return datetime.fromisoformat(s2.split("Z")[0])
        except Exception:
            pass
    # DD-MM-YYYY or DD/MM/YYYY (with optional time)
    m = _DDMMYYYY.match(s)
    if m:
        dd, mm, yyyy, HH, MM, SS = m.group(1), m.group(2), m.group(3), m.group(4) or "00", m.group(5) or "00", m.group(6) or "00"
        try:
            return datetime.fromisoformat(f"{yyyy}-{mm}-{dd}T{HH}:{MM}:{SS}")
        except Exception:
            return None
    # Last resort
    try:
        return datetime.fromisoformat(s)
    except Exception:
        try:
            # Very loose fallback
            return datetime.strptime(s, "%Y-%m-%d")
        except Exception:
            return None

def _post_datetime(p):
    """Best-effort extraction of a datetime from a Post row."""
    for attr in [
        "created_at", "createdAt", "timestamp", "published_at", "publishedAt",
        "post_date", "epaper_date", "date", "date_str", "time", "datetime"
    ]:
        if hasattr(p, attr):
            d = _parse_date_value(getattr(p, attr))
            if d:
                return d
    return None

def _post_emotion(p):
    for attr in ["emotion", "detected_emotion", "emotion_label"]:
        if hasattr(p, attr) and getattr(p, attr):
            return str(getattr(p, attr))
    return "Unspecified"

def _party_of(post: Post, author: Author):
    # First, check if post has direct party assignment
    if hasattr(post, 'party') and post.party:
        party = str(post.party).strip()
        # Normalize party names
        if party.upper() in ['BRS', 'TRS', 'TELANGANA RASHTRA SAMITHI']:
            return 'BRS'
        elif party.upper() in ['BJP', 'BHARATIYA JANATA PARTY']:
            return 'BJP'
        elif party.upper() in ['INC', 'CONGRESS', 'INDIAN NATIONAL CONGRESS']:
            return 'INC'  
        elif party.upper() in ['AIMIM', 'ALL INDIA MAJLIS-E-ITTEHADUL MUSLIMEEN']:
            return 'AIMIM'
        elif party.upper() != 'OTHER':
            return party
    
    # Fallback to author-based detection
    if not author:
        return "Other"
    if getattr(author, "party", None):
        return author.party
    name = (author.name or "").strip()
    return PARTY_ALIAS.get(name, "Other")

# ---- API -------------------------------------------------------------------

@trends_bp.route("/trends", methods=["GET"])
@login_required
def get_trends():
    """
    Returns per-day trends for last N days:
    {
      "ward": "Jubilee Hills",
      "days": 30,
      "start_date": "YYYY-MM-DD",
      "end_date":   "YYYY-MM-DD",
      "emotion_keys": [...],
      "party_keys":   [...],
      "series": [
        {"date":"YYYY-MM-DD","mentions_total":n,"emotions":{...},"parties":{...}},
        ...
      ]
    }
    """
    ward = request.args.get("ward", "All")
    days = int(request.args.get("days", 30))
    ward_key = normalize_ward(ward)

    now = datetime.utcnow()
    start_dt = now - timedelta(days=days)

    # Base query: join Author, optionally filter by ward (city)
    q = db.session.query(Post, Author).outerjoin(Author, Post.author_id == Author.id)

    if ward_key and ward_key.lower() != "all":
        # Compare normalized city to normalized ward
        q = q.filter(func.lower(func.trim(Post.city)) == ward_key.lower())

    rows = q.all()

    # Aggregate in Python (robust to missing columns / mixed date formats)
    day_emotions = defaultdict(lambda: defaultdict(int))
    day_parties = defaultdict(lambda: defaultdict(int))
    day_total = defaultdict(int)

    emotion_keys = set()
    party_keys = {"BJP", "BRS", "INC", "AIMIM", "Other"}

    for post, author in rows:
        dt = _post_datetime(post)
        if not dt:
            continue
        if dt < start_dt:
            continue

        dkey = dt.date().isoformat()

        emo = _post_emotion(post)
        emotion_keys.add(emo)
        day_emotions[dkey][emo] += 1

        party = _party_of(post, author)
        party_keys.add(party)
        day_parties[dkey][party] += 1

        day_total[dkey] += 1

    # Fill the window so charts draw continuous lines
    series = []
    for i in range(days + 1):
        di = (start_dt + timedelta(days=i)).date().isoformat()
        series.append(
            {
                "date": di,
                "mentions_total": day_total.get(di, 0),
                "emotions": day_emotions.get(di, {}),
                "parties": day_parties.get(di, {}),
            }
        )

    return jsonify(
        {
            "ward": ward_key or "All",
            "days": days,
            "start_date": start_dt.date().isoformat(),
            "end_date": now.date().isoformat(),
            "emotion_keys": sorted(emotion_keys),
            "party_keys": sorted(party_keys),
            "series": series,
        }
    )
