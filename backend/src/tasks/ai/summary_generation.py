from celery import shared_task
from sqlalchemy import text
from .extensions import db
from .rag import ann_retrieve
from .llm import call_llm_json
import os, json, requests

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:5000")

def fetch_ward_meta(ward: str) -> dict:
    try:
        r = requests.get(f"{BACKEND_BASE_URL}/api/v1/ward/meta/{ward}", timeout=15)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return {}

def compute_confidence(items: list[dict], sections: dict) -> float:
    # very simple heuristic
    src_count = len(items)
    has_citations = len(sections.get("citations", [])) > 0
    base = min(1.0, src_count / 10.0) * 0.6 + (0.4 if has_citations else 0)
    return round(base * 100, 1)

def build_prompt(ward: str, profile: dict, items: list[dict], window_label: str) -> tuple[str, str]:
    # Compose context S1..Sk
    sources = []
    for i, it in enumerate(items, start=1):
        meta = it.get("meta") or {}
        title = meta.get("title") or f"{it['source_type'].title()} {it['source_id']}"
        date = meta.get("date") or ""
        sources.append(f"[S{i}] {title} — {date}")

    issues = profile.get("features", {}).get("top_issues", [])
    voters = profile.get("profile", {}).get("electors")
    turnout = profile.get("profile", {}).get("turnout_pct")
    last_winner = profile.get("profile", {}).get("last_winner_party")

    system = (
        "You are a political field strategist. Only use the provided context. "
        "Every non-obvious claim must cite a source id like [S2]. Respond in compact JSON with keys: "
        "angle, weakness, actions_24h, actions_7d, risks, citations."
    )
    user = f"""
Ward: {ward}
Window: {window_label}

Profile:
- electors: {voters}
- turnout_pct: {turnout}
- last_winner_party: {last_winner}
- issues: {issues}

Sources:
{chr(10).join(sources)}

Write for {ward} in 4 sections (max ~120 words each):
1) Our Angle (The Narrative) — grounded in issues + profile [cite].
2) Opposition Weakness — evidence-backed [cite].
3) Recommended Actions — 24h (3 bullets) AND 7d (3 bullets), be specific (who/where) [cite where possible].
4) Risks & Watchouts — note data gaps and freshness.

Return JSON strictly: {{"angle": "...", "weakness": "...",
 "actions_24h": ["...","...","..."], "actions_7d": ["...","...","..."],
 "risks": ["..."], "citations": ["S1","S4"]}}
"""
    return system, user

@shared_task(name="app.tasks.generate_summary")
def generate_summary(ward: str, window: str = "P7D"):
    days = 7 if window == "P7D" else 30
    profile = fetch_ward_meta(ward)
    items = ann_retrieve(ward=ward, window_days=days, k=12)

    system, user = build_prompt(ward, profile, items, window)
    out = call_llm_json(system, user) or {}
    conf = compute_confidence(items, out)

    # Save
    db.session.execute(text("""
      INSERT INTO summary (ward, "window", sections, citations, confidence, model, cost_cents)
      VALUES (:ward, :window, :sections::jsonb, :cites::jsonb, :conf, :model, :cost)
    """), {
        "ward": ward,
        "window": window,
        "sections": json.dumps({
            "angle": out.get("angle", ""),
            "weakness": out.get("weakness", ""),
            "actions_24h": out.get("actions_24h", []),
            "actions_7d": out.get("actions_7d", []),
            "risks": out.get("risks", []),
        }, ensure_ascii=False),
        "cites": json.dumps(out.get("citations", [])),
        "conf": conf,
        "model": out.get("_model", "llm"),
        "cost": int(out.get("_cost", 0)),
    })
    db.session.commit()
    return {"ward": ward, "window": window, "confidence": conf}
