# app/epaper_api.py
from flask import Blueprint, jsonify, request, abort
from sqlalchemy import desc, func
from .extensions import db
from .models import Epaper, Post

bp_epaper = Blueprint("bp_epaper", __name__, url_prefix="/api/v1/epaper")


def _serialize_epaper(e: Epaper, preview_chars: int | None = 300):
    txt = e.raw_text or ""
    if preview_chars is not None and len(txt) > preview_chars:
        txt = txt[:preview_chars].rstrip() + "…"
    return {
        "id": e.id,
        "publication_name": e.publication_name,
        "publication_date": e.publication_date.isoformat() if e.publication_date else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "preview": txt,
        # useful when the client wants to show relative freshness
        "sha256": getattr(e, "sha256", None),
    }


@bp_epaper.get("")
def list_epaper():
    """
    GET /api/v1/epaper?city=Allapur&limit=20
    If city=All or missing → latest across all wards.
    Otherwise join Post to respect city filter (distinct on Epaper).
    """
    city = (request.args.get("city") or "").strip()
    try:
        limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    except ValueError:
        limit = 20

    q = db.session.query(Epaper)

    if city and city.lower() != "all":
        q = (
            q.join(Post, Post.epaper_id == Epaper.id)
            .filter(Post.city == city)
            .group_by(Epaper.id)
        )

    q = q.order_by(desc(Epaper.publication_date), desc(Epaper.created_at)).limit(limit)
    rows = q.all()
    return jsonify([_serialize_epaper(e) for e in rows])


@bp_epaper.get("/<int:epaper_id>")
def get_epaper(epaper_id: int):
    """
    GET /api/v1/epaper/<id>  → full article payload
    """
    e = db.session.get(Epaper, epaper_id)
    if not e:
        abort(404, description="epaper not found")
    return jsonify(
        {
            "id": e.id,
            "publication_name": e.publication_name,
            "publication_date": e.publication_date.isoformat() if e.publication_date else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "raw_text": e.raw_text or "",
            "sha256": getattr(e, "sha256", None),
        }
    )
