# backend/app/pulse_api.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
import re

from .models import Post
from .extensions import db

pulse_bp = Blueprint("pulse_bp", __name__, url_prefix="/api/v1")

STOP = set("""
the a an and or but of to in for on with at from by this that is are am be as it its was were
will we our you your they their he she his her them us i about into after before over under
again more most very can cannot could would should has have had do does did not no yes
""".split())

def _norm(label: str) -> str:
    if not label:
        return ""
    s = re.sub(r"(?i)^ward\s*no\.?\s*\d+\s*", "", str(label))
    s = re.sub(r"(?i)^ward\s*\d+\s*", "", s)
    s = re.sub(r"(?i)^\d+\s*-\s*", "", s)
    s = re.sub(r"(?i)^\d+\s+", "", s)
    return re.sub(r"\s+", " ", s).strip()

def _tokens(text: str):
    return [
        t for t in re.sub(r"(?:https?://\S+)|[#@]|[^a-z0-9\s]", " ", (text or "").lower()).split()
        if len(t) > 2 and t not in STOP
    ]

def _make_briefing(ward: str, posts):
    bag = {}
    for p in (posts or [])[:200]:
        txt = getattr(p, "text", None) or getattr(p, "content", None) or ""
        for t in _tokens(txt):
            bag[t] = bag.get(t, 0) + 1
    keywords = [w for w, _ in sorted(bag.items(), key=lambda x: x[1], reverse=True)[:10]]

    key_issue = (
        f"Local sentiment centers on: {', '.join(keywords[:3])}."
        if keywords else
        "Local sentiment is diffuse across several issues without a single dominant topic."
    )

    our_angle = (
        f"We position our candidate as a proactive problem-solver in {ward}, focusing on "
        f"{' & '.join(keywords[:2]) if keywords else 'pressing civic issues'}, with clear delivery milestones, "
        "public progress checks, and responsive ward-level grievance handling."
    )

    opponent = (
        f"Opposition narratives show gaps on execution and consistency in {ward}. "
        "We contrast their reactive posture with our measurable plan, ward micro-budgets, and transparency."
    )

    actions = [
        {
            "action": "Micro-townhalls",
            "timeline": "72h",
            "details": f"Run 3 street-corner meets in {ward} on top concerns "
                       f"({', '.join(keywords[:3]) or 'roads, drainage, services'}). Capture testimonials."
        },
        {
            "action": "Before/After proof",
            "timeline": "7 days",
            "details": "Publish evidence of solved complaints; open a public issues board with 48h SLA."
        },
        {
            "action": "Narrative contrast",
            "timeline": "48h",
            "details": "Release a 90-second video on execution vs. opponent’s reactive stance."
        },
    ]

    return {
        "status": "Actionable intelligence found." if posts else "No ward-specific intelligence in recent posts.",
        "briefing": {
            "key_issue": key_issue,
            "our_angle": our_angle,
            "opposition_weakness": opponent,
            "recommended_actions": actions,
        }
    }

@pulse_bp.route("/pulse/<ward>", methods=["GET"])
def pulse_for_ward(ward):
    try:
        days = int(request.args.get("days", 14))
    except Exception:
        days = 14

    ward_clean = _norm(ward)
    since = datetime.utcnow() - timedelta(days=days)

    q = Post.query
    # created_at filter if column exists; otherwise just use latest N
    if hasattr(Post, "created_at"):
        q = q.filter(Post.created_at >= since)

    if ward_clean.lower() != "all":
        like = f"%{ward_clean}%"
        q = q.filter(db.func.lower(Post.city).like(db.func.lower(like)))

    posts = q.order_by(getattr(Post, "created_at", db.func.now()).desc()).all()
    payload = _make_briefing(ward_clean, posts)
    return jsonify(payload), 200
