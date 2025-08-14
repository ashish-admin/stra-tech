# backend/app/utils_pulse.py
from __future__ import annotations
import re
import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

STOPWORDS = {
    "the","a","an","and","or","to","of","in","on","for","with","at","by","from","as","is","are","was","were",
    "be","been","being","this","that","these","those","it","its","we","our","you","your","their","they",
    "but","if","than","then","so","because","about","into","over","after","before","up","down","out","off",
    "just","very","more","most","some","any","can","could","should","would","will","may","might","must",
    "not","no","nor","do","does","did","done","doing","have","has","had","having"
}

WARD_ALIASES = {
    # normalize common map labels → canonical ward names you use in DB
    "ward 8 habsiguda": "Habsiguda",
    "ward 79 himayath nagar": "Himayath Nagar",
    "ward 9 ramnathpur": "Ramnathpur",
    "ward 5 kapra": "Kapra",
    "ward 135 jubilee hills": "Jubilee Hills",
}

def normalize_ward_name(raw: str) -> str:
    if not raw:
        return ""
    s = re.sub(r"\s+", " ", raw.strip()).lower()
    s = re.sub(r"[,.;:()\-_/]+", " ", s)
    s = s.replace("ghmc", "").strip()
    if s in WARD_ALIASES:
        return WARD_ALIASES[s]
    # strip leading "ward <num>"
    s = re.sub(r"^ward\s*\d+\s*", "", s).strip()
    # title case words
    return " ".join(w.capitalize() for w in s.split())

def tokenize(text: str) -> List[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    toks = [t for t in text.split() if t and t not in STOPWORDS and not t.isdigit()]
    return toks

def top_keywords(texts: List[str], k: int = 8) -> List[Tuple[str, int]]:
    c = Counter()
    for t in texts:
        c.update(tokenize(t))
    return c.most_common(k)

def summarize_issue(keywords: List[Tuple[str,int]]) -> str:
    if not keywords:
        return "Local civic issues and public services"
    words = [w for w,_ in keywords[:3]]
    return ", ".join(words).capitalize()

def recommend_actions(ward: str, issue: str) -> List[Dict[str,str]]:
    return [
        {
            "action": "Door-to-door survey",
            "details": f"Gather firsthand accounts in {ward} on {issue}. Prioritize affected colonies; map concerns within 72 hours.",
            "timeline": "3 days"
        },
        {
            "action": "Contrast communication",
            "details": f"Publish a short video/post highlighting our concrete plan for {issue} vs the opposition’s record in {ward}.",
            "timeline": "1 week"
        },
        {
            "action": "Local meet-up",
            "details": f"Host a ward meeting in {ward} with subject experts and resident welfare associations; capture media for social.",
            "timeline": "10 days"
        }
    ]

def build_briefing(ward: str, texts: List[str], sentiments: Counter, authors: Counter) -> Dict:
    kw = top_keywords(texts)
    issue = summarize_issue(kw)

    # choose dominant negative if any, else most common overall to flavor the weakness
    neg_buckets = ["Anger","Fear","Frustration","Disgust","Sadness"]
    neg_total = sum(v for k,v in sentiments.items() if k in neg_buckets)
    top_emotion, _ = max(sentiments.items(), key=lambda kv: kv[1]) if sentiments else ("",0)

    our_angle = (
        f"Our candidate is focused on {issue} in {ward} with a concrete plan and timelines. "
        "We will publish progress trackers and involve civic experts to ensure visible outcomes."
    )
    opp_weak = (
        f"The opposition has lacked a coherent roadmap on {issue} in {ward}. "
        "Residents report reactive measures and delays, not long-term solutions."
    )
    if neg_total == 0 and top_emotion:
        opp_weak = (
            f"Public sentiment trends mostly {top_emotion.lower()} but without a unifying agenda from the opposition. "
            "We can lead with practical steps and consistent follow-up."
        )

    return {
        "key_issue": issue,
        "our_angle": our_angle,
        "opposition_weakness": opp_weak,
        "recommended_actions": recommend_actions(ward, issue),
        "top_keywords": [{"term": k, "count": c} for k,c in kw],
        "top_sources": [{"source": a, "count": n} for a,n in authors.most_common(5)]
    }

def compute_metrics(posts: List[dict]) -> Dict:
    # posts: list of dicts with keys text, emotion, author, created_at
    sentiments = Counter()
    authors = Counter()
    texts = []
    evidence = []

    for p in posts:
        texts.append(p["text"])
        if p.get("emotion"):
            sentiments[p["emotion"]] += 1
        if p.get("author"):
            authors[p["author"]] += 1
        if len(evidence) < 5:
            evidence.append({
                "source": p.get("author") or "Unknown",
                "excerpt": (p["text"][:220] + "…") if len(p["text"]) > 220 else p["text"],
                "created_at": p.get("created_at")
            })

    return {
        "sentiments": dict(sentiments),
        "top_authors": dict(authors),
        "texts": texts,
        "evidence": evidence,
    }

def window_start(days: int) -> datetime:
    days = 1 if days < 1 else min(days, 90)
    return datetime.now(timezone.utc) - timedelta(days=days)
