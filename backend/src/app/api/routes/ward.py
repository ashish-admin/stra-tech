"""
Ward-level API endpoints for the LokDarpan backend.

This blueprint exposes endpoints that return deterministic ward-specific data
compiled from the electoral spine and analytic features. These endpoints
complement the existing `/pulse` endpoint by providing structured data that
frontend widgets can consume without relying on the LLM.

Endpoints defined here:

* GET /api/v1/ward/meta/<ward_id> – consolidated snapshot of electors, turnout,
  last winner info, socio-economic indices, and derived features.
* GET /api/v1/prediction/<ward_id> – simple heuristic prediction based on features.
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify
from .models import WardProfile, WardDemographics, WardFeatures

ward_bp = Blueprint("ward_bp", __name__, url_prefix="/api/v1")


def _iso(dt: datetime | None) -> str | None:
    """Return an ISO8601 UTC (Z) string for a datetime (or None)."""
    if dt is None:
        return None
    if dt.tzinfo is None:  # treat naive as UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# META: Consolidated ward snapshot
# ---------------------------------------------------------------------------
@ward_bp.get("/ward/meta/<ward_id>")
def ward_meta(ward_id: str):
    """Return consolidated metadata and features for a ward.

    Aggregates information from WardProfile, WardDemographics and WardFeatures.
    Missing components are returned as null. If nothing exists, 404.
    """
    profile = WardProfile.query.filter_by(ward_id=ward_id).first()
    demographics = WardDemographics.query.filter_by(ward_id=ward_id).first()
    features = WardFeatures.query.filter_by(ward_id=ward_id).first()

    if not any([profile, demographics, features]):
        return jsonify({"status": "not_found", "ward": ward_id}), 404

    # Build payload pieces
    payload = {"ward": ward_id}

    payload["profile"] = (
        {
            "electors": getattr(profile, "electors", None),
            "votes_cast": getattr(profile, "votes_cast", None),
            "turnout_pct": getattr(profile, "turnout_pct", None),
            "last_winner_party": getattr(profile, "last_winner_party", None),
            "last_winner_year": getattr(profile, "last_winner_year", None),
            "updated_at": _iso(getattr(profile, "updated_at", None)),
        }
        if profile
        else None
    )

    payload["demographics"] = (
        {
            "literacy_idx": getattr(demographics, "literacy_idx", None),
            "muslim_idx": getattr(demographics, "muslim_idx", None),
            "scst_idx": getattr(demographics, "scst_idx", None),
            "secc_deprivation_idx": getattr(demographics, "secc_deprivation_idx", None),
            "updated_at": _iso(getattr(demographics, "updated_at", None)),
        }
        if demographics
        else None
    )

    payload["features"] = (
        {
            "as23_party_shares": getattr(features, "as23_party_shares", None),
            "ls24_party_shares": getattr(features, "ls24_party_shares", None),
            "dvi": getattr(features, "dvi", None),
            "aci_23": getattr(features, "aci_23", None),
            "turnout_volatility": getattr(features, "turnout_volatility", None),
            "incumbency_weakness": getattr(features, "incumbency_weakness", None),
            "updated_at": _iso(getattr(features, "updated_at", None)),
        }
        if features
        else None
    )

    # Compute top-level updated_at = max(profile, demographics, features)
    cand = []
    for section in ("profile", "demographics", "features"):
        sec = payload.get(section)
        if sec and sec.get("updated_at"):
            # parse ISO back to dt to compute max
            cand.append(datetime.fromisoformat(sec["updated_at"].replace("Z", "+00:00")))
    top_dt = max(cand) if cand else None
    payload["updated_at"] = _iso(top_dt)

    return jsonify(payload)


# ---------------------------------------------------------------------------
# PREDICTION: Simple heuristic based on features (unchanged behavior)
# ---------------------------------------------------------------------------
@ward_bp.get("/prediction/<ward_id>")
def prediction_for_ward(ward_id: str):
    """Return a simple heuristic prediction for a ward.
    Uses ls24_party_shares (or falls back to as23) and a basic confidence.
    """
    features = WardFeatures.query.filter_by(ward_id=ward_id).first()
    if not features:
        return jsonify({"status": "not_found", "ward": ward_id}), 404

    shares = dict(features.ls24_party_shares or {}) or dict(features.as23_party_shares or {})
    if not shares:
        return jsonify({"status": "not_found", "ward": ward_id}), 404

    total = sum(shares.values()) or 1.0
    normalized = {p: (v / total) * 100.0 for p, v in shares.items()}

    volatility = features.turnout_volatility or 0.0
    base_confidence = 1.0 - min(volatility / 100.0, 0.9)
    if not (features.ls24_party_shares and features.as23_party_shares):
        base_confidence *= 0.5
    confidence = max(min(base_confidence, 1.0), 0.0)

    return jsonify({"ward": ward_id, "scores": normalized, "confidence": confidence})
