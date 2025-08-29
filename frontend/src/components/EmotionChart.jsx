import React, { useMemo } from "react";

const COLORS = {
  anger: "#ef4444",
  joy: "#10b981",
  hopeful: "#34d399",
  frustration: "#f59e0b",
  fear: "#a78bfa",
  sadness: "#60a5fa",
  disgust: "#8b5cf6",
  admiration: "#06b6d4",
  pride: "#93c5fd",
  positive: "#16a34a",
  negative: "#dc2626",
  neutral: "#9ca3af",
};

function getEmotion(p) {
  return (
    p.emotion ||
    p.detected_emotion ||
    p.emotion_label ||
    (typeof p.emotion === "object" ? p.emotion?.label : "") ||
    ""
  );
}

export default function EmotionChart({ posts = [] }) {
  const counts = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      const e = String(getEmotion(p) || "").trim();
      if (!e) return;
      const key = e.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [posts]);

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (!total) {
    return <div className="text-sm text-gray-500">No sentiment data available for the selected ward.</div>;
  }

  // simple horizontal bars
  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2">
      {rows.map(([label, value]) => {
        const pct = Math.round((value / total) * 100);
        const color = COLORS[label] || "#64748b";
        return (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="capitalize">{label}</span>
              <span>{value} ({pct}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded h-2">
              <div className="h-2 rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
