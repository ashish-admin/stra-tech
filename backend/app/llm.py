"""
Simple LLM + embedding adapters.
Set via env:
  LLM_PROVIDER=openai            # or 'none' to stub
  LLM_MODEL=gpt-4o-mini          # any chat-capable model you have
  EMBED_PROVIDER=openai
  EMBED_MODEL=text-embedding-3-small
  OPENAI_API_KEY=...
"""

import os
import json
import time
import logging
import requests

log = logging.getLogger(__name__)

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "none").lower()
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
EMBED_PROVIDER = os.getenv("EMBED_PROVIDER", "openai").lower()
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def get_embedding(text: str) -> list[float]:
    if EMBED_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set for embeddings")
        r = requests.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={"model": EMBED_MODEL, "input": text},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["data"][0]["embedding"]
    # fallback stub (all zeros) – won’t be good for retrieval, but won’t crash
    return [0.0] * 768


def call_llm_json(system: str, user: str) -> dict:
    """Call LLM and parse JSON. If LLM is disabled, return a deterministic stub."""
    if LLM_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set for LLM")
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": LLM_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "system", "content": system},
                             {"role": "user", "content": user}],
                "temperature": 0.2
            },
            timeout=120,
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except Exception:
            log.warning("LLM returned non-JSON; returning empty")
            return {}
    # stubbed local response for dev
    return {
        "angle": "Recent discourse focuses on civic delivery gaps; propose quick-win roadmap tied to Ward Office.",
        "weakness": "Opposition narrative is reactive; lacks measurable commitments.",
        "actions_24h": ["Sample 100 HHs for sanitation feedback", "Publish 1-pager on road repairs", "3 WhatsApp creatives addressing top 2 issues"],
        "actions_7d": ["Ward Sabha with grievance desks", "Volunteer clean-up drive", "Progress tracker microsite"],
        "risks": ["Evidence is sparse; verify with phonebank."],
        "citations": [],
        "_model": "stub",
        "_cost": 0
    }
