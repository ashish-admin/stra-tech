import React, { useMemo } from "react";

function partyFromSource(p) {
  const src = (p.source || p.author || p.publisher || "").toLowerCase();
  if (/bjp|bharatiya/.test(src)) return "BJP";
  if (/brs|trs\b|telangana rashtra/.test(src)) return "BRS";
  if (/congress|inc\b|telangana congress/.test(src)) return "INC";
  if (/aimim/.test(src)) return "AIMIM";
  return "OTHER";
}
const POSITIVE = new Set(["joy", "hopeful", "admiration", "pride", "positive", "support", "confidence"]);
const NEGATIVE = new Set(["anger", "frustration", "fear", "sadness", "disgust", "negative"]);
function emotionOf(p) {
  return (p.emotion || p.detected_emotion || p.emotion_label || "").toLowerCase();
}

export default function CompetitorBenchmark({ posts = [] }) {
  const rows = useMemo(() => {
    const by = {};
    posts.forEach((p) => {
      const party = partyFromSource(p);
      by[party] = by[party] || { total: 0, pos: 0, neg: 0 };
      by[party].total += 1;
      const e = emotionOf(p);
      if (POSITIVE.has(e)) by[party].pos += 1;
      else if (NEGATIVE.has(e)) by[party].neg += 1;
    });
    return Object.entries(by)
      .map(([party, v]) => {
        const engagement = v.total ? (v.pos / (v.neg || 1)) : 0;
        return { party, ...v, engagement };
      })
      .sort((a, b) => b.engagement - a.engagement);
  }, [posts]);

  if (!rows.length) return <div className="text-sm text-gray-500">No competitive benchmark available for the selected ward.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="py-1">Party</th>
            <th className="py-1">Mentions</th>
            <th className="py-1 text-green-600">Positive</th>
            <th className="py-1 text-red-600">Negative</th>
            <th className="py-1">Engagement Ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.party} className="border-t">
              <td className="py-1">{r.party}</td>
              <td className="py-1">{r.total}</td>
              <td className="py-1">{r.pos}</td>
              <td className="py-1">{r.neg}</td>
              <td className="py-1">{r.engagement.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
