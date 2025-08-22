# backend/app/routes.py
from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, timezone, timedelta

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, login_user, logout_user, current_user
from sqlalchemy import func

from . import db
from .models import User, Post, Author, Alert
from .security import (
    rate_limit, 
    InputValidator, 
    AuditLogger, 
    validate_content_type
)

main_bp = Blueprint("main", __name__, url_prefix="/api/v1")

# ---------------------------
# Helpers for Pulse
# ---------------------------
def normalize_ward_name(name: str) -> str:
    return (name or "").strip()


def window_start(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=max(1, min(days, 90)))


def compute_metrics(posts: list[dict]):
    sentiments = []
    authors = []
    texts = []
    evidence = []
    for p in posts:
        sentiments.append((p.get("emotion") or "Unknown").strip())
        authors.append((p.get("author") or "Unknown").strip())
        t = (p.get("text") or "").strip()
        texts.append(t)
        if t:
            evidence.append({"text": t, "author": p.get("author") or "Unknown"})
    return {
        "sentiments": sentiments,
        "top_authors": authors,
        "texts": texts,
        "evidence": evidence,
    }


def build_briefing(ward: str, texts: list[str], sentiment_counts: Counter, author_counts: Counter):
    top_emotions = sentiment_counts.most_common(3)
    top_sources = author_counts.most_common(3)

    key_issue = f"Recent discourse in {ward} centers around {top_emotions[0][0] if top_emotions else 'local governance'}."
    our_angle = (
        f"Our candidate will address the drivers behind these concerns with a ward-specific plan, "
        f"naming accountable agencies and clear timelines. We’ll show quick wins and a 90-day roadmap."
    )
    opp_weakness = (
        "Opposition messaging is reactive and lacks measurable commitments; emphasize delivery gaps "
        "and redirect to our concrete plan."
    )

    # lightweight keywords (very simple heuristic)
    from collections import Counter as C
    tokens = []
    for t in texts:
        for w in (t.lower().replace(",", " ").replace(".", " ").split()):
            if len(w) >= 4:
                tokens.append(w)
    top_keywords = [{"term": k, "count": n} for k, n in C(tokens).most_common(10)]

    recs = [
        {
            "action": "Door-to-door listening",
            "timeline": "Within 72h",
            "details": f"Sample 200 households across {ward} to gather evidence aligned to top concerns; publish a short fact-sheet.",
        },
        {
            "action": "Local media pitch",
            "timeline": "This week",
            "details": "Place a story with before/after visuals and a clear accountability tracker for the next 90 days.",
        },
        {
            "action": "WhatsApp micro-content",
            "timeline": "48h",
            "details": "3 short creatives addressing the top 2 issues and how to escalate complaints effectively.",
        },
    ]

    return {
        "key_issue": key_issue,
        "our_angle": our_angle,
        "opposition_weakness": opp_weakness,
        "recommended_actions": recs,
        "top_keywords": top_keywords,
        "top_emotions": [{"emotion": e, "count": n} for e, n in top_emotions],
        "top_sources": [{"source": s, "count": n} for s, n in top_sources],
    }


# ---------------------------
# Health / Session status
# ---------------------------
@main_bp.route("/status", methods=["GET"])
def status():
    return jsonify({
        "ok": True,
        "authenticated": bool(getattr(current_user, "is_authenticated", False)),
        "user": (
            {"id": current_user.id, "username": current_user.username, "email": current_user.email}
            if getattr(current_user, "is_authenticated", False) else None
        ),
        "server_time": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    }), 200


# ---------------------------
# Auth
# ---------------------------
@main_bp.route("/login", methods=["POST"])
@rate_limit('auth')
@validate_content_type(['application/json'])
def login():
    """Secure authentication endpoint with rate limiting and audit logging."""
    data = request.get_json(silent=True) or {}
    
    # Validate input
    try:
        username = InputValidator.validate_username(data.get("username", ""))
        password = data.get("password", "")
        
        if not password:
            raise ValueError("Password is required")
            
    except (ValueError, Exception) as e:
        AuditLogger.log_authentication_attempt("", False, str(e))
        return jsonify({"error": "Invalid input"}), 400
    
    # Find user
    user = User.query.filter(func.lower(User.username) == username.lower()).first()
    
    # Check if account is locked
    if user and user.is_account_locked():
        AuditLogger.log_authentication_attempt(username, False, "Account locked")
        return jsonify({"error": "Account temporarily locked due to multiple failed login attempts"}), 423
    
    # Check credentials
    if not user or not user.check_password(password):
        if user:
            user.record_failed_login()
            db.session.commit()
        
        AuditLogger.log_authentication_attempt(username, False, "Invalid credentials")
        return jsonify({"error": "Invalid username or password"}), 401
    
    # Check if account is active
    if not user.is_active:
        AuditLogger.log_authentication_attempt(username, False, "Inactive account")
        return jsonify({"error": "Account is inactive"}), 403
    
    # Successful login
    user.record_successful_login()
    db.session.commit()
    
    login_user(user, remember=False)
    
    AuditLogger.log_authentication_attempt(username, True, "Successful login")
    
    return jsonify({
        "message": "Login successful", 
        "user": {
            "id": user.id, 
            "username": user.username, 
            "email": user.email,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    })
    

@main_bp.route("/logout", methods=["POST"])
@login_required
@rate_limit('default')
def logout():
    """Secure logout endpoint with audit logging."""
    user_id = current_user.id
    username = current_user.username
    
    AuditLogger.log_security_event(
        'user_logout',
        {'user_id': user_id, 'username': username}
    )
    
    logout_user()
    return jsonify({"message": "Logged out successfully"})


# ---------------------------
# Core data
# ---------------------------
@main_bp.route("/posts", methods=["GET"])
@login_required
def get_posts():
    ward = request.args.get("city") or request.args.get("ward") or ""
    q = Post.query
    if ward:
        q = q.filter(func.lower(Post.city).like(f"%{ward.lower()}%"))
    q = q.order_by(Post.created_at.desc()).limit(1000)
    rows = q.all()

    author_map = {a.id: a.name for a in Author.query.all()}
    items = []
    for r in rows:
        items.append({
            "id": r.id,
            "text": r.text,
            "emotion": r.emotion,
            "author": author_map.get(r.author_id, "Unknown"),
            "city": r.city,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return jsonify({"items": items})


@main_bp.route("/geojson", methods=["GET"])
@login_required
def get_geojson():
    """
    Serve GHMC ward boundaries from backend/app/data/ghmc_wards.geojson.
    Falls back to a tiny demo FeatureCollection if the file is missing or invalid.
    """
    import json, os
    from flask import current_app

    # 1) Prefer the app/data copy you have
    data_path = os.path.join(current_app.root_path, "data", "ghmc_wards.geojson")

    # 2) Secondary locations (optional)
    alt_paths = [
        os.path.join(current_app.root_path, "static", "ghmc_wards.geojson"),
        os.path.join(os.path.dirname(current_app.root_path), "data", "ghmc_wards.geojson"),
    ]

    paths_to_try = [data_path] + alt_paths

    for p in paths_to_try:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Normalize: ensure FeatureCollection with "features" list
                if isinstance(data, dict) and data.get("type") == "FeatureCollection":
                    feats = data.get("features") or []
                    # Quick sanity check
                    if isinstance(feats, list) and len(feats) > 0:
                        # Optional: stamp the source path for debugging
                        data["_source_path"] = p
                        return jsonify(data)
                # If structure is unexpected, try to wrap a flat features list
                if isinstance(data, list):
                    wrapped = {"type": "FeatureCollection", "features": data, "_source_path": p}
                    return jsonify(wrapped)

                # If we got here, structure wasn’t usable
                current_app.logger.warning("GeoJSON at %s has no features; using fallback.", p)
            except Exception as e:
                current_app.logger.error("Failed reading GeoJSON %s: %s", p, e)

    # 3) Fallback so the map is never empty (two tiny wards near Hyderabad)
    fallback = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Ward 1 Himayath Nagar"},
                "geometry": {"type": "Polygon", "coordinates": [[[78.47, 17.40],[78.49, 17.40],[78.49, 17.42],[78.47, 17.42],[78.47, 17.40]]]},
            },
            {
                "type": "Feature",
                "properties": {"name": "Ward 2 Banjara Hills"},
                "geometry": {"type": "Polygon", "coordinates": [[[78.43, 17.41],[78.45, 17.41],[78.45, 17.43],[78.43, 17.43],[78.43, 17.41]]]},
            },
        ],
        "_source_path": "fallback",
    }
    return jsonify(fallback)


@main_bp.route("/competitive-analysis", methods=["GET"])
@login_required
def competitive_analysis():
    ward = (request.args.get("city") or "").strip()
    q = db.session.query(Post.emotion, Author.name, func.count().label("n")) \
        .join(Author, Author.id == Post.author_id)
    if ward and ward.lower() != "all":
        q = q.filter(func.lower(Post.city).like(f"%{ward.lower()}%"))
    q = q.group_by(Post.emotion, Author.name)
    rows = q.all()

    out = {}
    for emotion, author, n in rows:
        author = author or "Unknown"
        emotion = emotion or "Unknown"
        out.setdefault(author, {}).setdefault(emotion, 0)
        out[author][emotion] += int(n)
    return jsonify(out)


# ---------------------------
# Alerts (legacy) + trigger
# ---------------------------
@main_bp.route("/alerts/<ward>", methods=["GET"])
@login_required
def get_alerts(ward):
    ward = normalize_ward_name(ward)
    row = Alert.query.filter(func.lower(Alert.ward) == ward.lower()).order_by(Alert.created_at.desc()).first()
    if not row:
        return jsonify({"message": "No alerts found for this ward."}), 404
    return jsonify({"opportunities": row.opportunities})


@main_bp.route("/trigger_analysis", methods=["POST"])
@login_required
def trigger_analysis():
    data = request.get_json(silent=True) or {}
    ward = normalize_ward_name(data.get("ward", ""))
    if not ward:
        return jsonify({"message": "Ward is required."}), 400
    return jsonify({"message": f"Analysis triggered for {ward}."})


# ---------------------------
# Instant Area Pulse
# ---------------------------
@main_bp.route("/pulse/<ward>", methods=["GET"])
@login_required
def pulse(ward):
    try:
        days = int(request.args.get("days", 14))
    except Exception:
        days = 14
    ward = normalize_ward_name(ward)
    if not ward:
        return jsonify({"message": "Ward is required."}), 400

    start_dt = window_start(days)

    q = db.session.query(Post, Author.name.label("author")) \
        .outerjoin(Author, Author.id == Post.author_id) \
        .filter(func.lower(Post.city).like(f"%{ward.lower()}%")) \
        .filter(Post.created_at >= start_dt) \
        .order_by(Post.created_at.desc()) \
        .limit(800)
    rows = q.all()

    posts = [{
        "text": r.Post.text or "",
        "emotion": r.Post.emotion or "",
        "author": r.author or "Unknown",
        "created_at": r.Post.created_at.isoformat() if r.Post.created_at else None
    } for r in rows]

    if not posts:
        return jsonify({
            "status": f"No recent posts found for {ward} (last {days} days).",
            "briefing": None,
            "metrics": {"sentiments": {}, "top_authors": {}},
            "evidence": []
        }), 200

    m = compute_metrics(posts)
    from collections import Counter
    briefing = build_briefing(ward, m["texts"], Counter(m["sentiments"]), Counter(m["top_authors"]))
    return jsonify({
        "status": "ok",
        "ward": ward,
        "days": days,
        "briefing": briefing,
        "metrics": {
            "sentiments": m["sentiments"],
            "top_authors": m["top_authors"],
            "top_keywords": briefing.get("top_keywords", [])
        },
        "evidence": m["evidence"]
    })
