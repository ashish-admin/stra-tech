import React, { useMemo } from "react";

/** Flexible date parsing for mixed datasets (ISO, epoch, DD-MM-YYYY, DD/MM/YYYY, etc.) */
function parseFlexibleDate(raw) {
  if (!raw) return null;
  // Numbers: epoch seconds/millis
  if (typeof raw === "number") {
    const d = new Date(raw < 1e12 ? raw * 1000 : raw);
    return isNaN(+d) ? null : d;
  }

  const s = String(raw).trim();

  // ISO or "YYYY-MM-DD HH:mm:ss" — Date() handles these well
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) {
    const d = new Date(s.replace(" ", "T"));
    return isNaN(+d) ? null : d;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [_, dd, mm, yyyy, HH = "00", MM = "00", SS = "00"] = m;
    const d = new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}`);
    return isNaN(+d) ? null : d;
  }

  // Fallback try
  const d = new Date(s);
  return isNaN(+d) ? null : d;
}

function getDateFromPost(p) {
  const raw =
    p.created_at ||
    p.createdAt ||
    p.timestamp ||
    p.date ||
    p.published_at ||
    p.publishedAt ||
    p.time ||
    p.datetime ||
    p.post_date ||
    p.epaper_date ||
    p.date_str;
  return parseFlexibleDate(raw);
}

const fmtDay = (d) => d.toISOString().slice(0, 10);

export default function TimeSeriesChart({ posts = [] }) {
  const { points, synthetic, reason } = useMemo(() => {
    const map = new Map();
    let dated = 0;

    posts.forEach((p, idx) => {
      const d = getDateFromPost(p);
      if (d) {
        dated++;
        const k = fmtDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        map.set(k, (map.get(k) || 0) + 1);
      }
    });

    if (dated > 0) {
      const arr = Array.from(map.entries())
        .map(([k, v]) => ({ date: k, value: v }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return { points: arr, synthetic: false, reason: "" };
    }

    // Soft fallback: build 7 synthetic buckets to still show momentum
    const N = Math.min(posts.length, 140);
    if (!N) return { points: [], synthetic: false, reason: "" };

    const B = 7;
    const per = Math.max(1, Math.floor(N / B));
    const arr = Array.from({ length: B }, (_, i) => ({
      date: `Day ${i + 1}`,
      value: posts.slice(i * per, (i + 1) * per).length,
    }));
    return {
      points: arr,
      synthetic: true,
      reason: "Posts lack usable timestamps; showing relative trend by ingestion order.",
    };
  }, [posts]);

  if (!points.length) {
    return <div className="text-sm text-gray-500">No historical trend data available for the selected ward.</div>;
  }

  const max = Math.max(...points.map((p) => p.value));
  const w = 360, h = 80, pad = 6;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1 || 1));
  const ys = points.map((p) => h - pad - (max ? (p.value / max) * (h - pad * 2) : 0));
  const path = xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");

  return (
    <div>
      <svg width={w} height={h} aria-label="time series">
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />
      </svg>
      <div className="text-xs text-gray-500 mt-1">
        {synthetic ? reason : `Last ${points.length} dated points • peak ${max}`}
      </div>
    </div>
  );
}
