from flask import Blueprint, request, jsonify
from sqlalchemy import text
from .extensions import db
from .tasks_summary import generate_summary

summary_bp = Blueprint("summary_bp", __name__)

@summary_bp.get("/api/v1/summary/latest")
def summary_latest():
    ward = request.args.get("ward", type=str)
    window = request.args.get("window", default="P7D", type=str)
    if not ward:
        return jsonify({"error": "ward is required"}), 400

    row = db.session.execute(text("""
      SELECT id, ward, window, sections, citations, confidence, model, cost_cents, created_at
        FROM summary
       WHERE ward = :ward AND window = :window
       ORDER BY created_at DESC
       LIMIT 1
    """), {"ward": ward, "window": window}).mappings().first()

    if not row:
        return jsonify({"status": "not_found"}), 404
    return jsonify(dict(row))

@summary_bp.post("/api/v1/summary/generate")
def summary_generate():
    data = request.get_json(silent=True) or {}
    ward = data.get("ward")
    window = data.get("window", "P7D")
    if not ward:
        return jsonify({"error": "ward is required"}), 400
    job = generate_summary.delay(ward, window)
    return jsonify({"job_id": job.id, "status": "queued"})
