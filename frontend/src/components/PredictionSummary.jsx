import React, { useMemo } from "react";

const POSITIVE = new Set(["joy", "hopeful", "admiration", "pride", "positive", "support", "confidence"]);
const NEGATIVE = new Set(["anger", "frustration", "fear", "sadness", "disgust", "negative"]);

function partyFromSource(p) {
  const src = (p.source || p.author || p.publisher || "").toLowerCase();
  if (/bjp|bharatiya/.test(src)) return "BJP";
  if (/brs|trs\b|telangana rashtra/.test(src)) return "BRS";
  if (/congress|inc\b|telangana congress/.test(src)) return "INC";
  if (/aimim/.test(src)) return "AIMIM";
  return "OTHER";
}
function emotionOf(p) {
  return (p.emotion || p.detected_emotion || p.emotion_label || "").toLowerCase();
}

export default function PredictionSummary({ posts = [], ward = "All" }) {
  const rows = useMemo(() => {
    const by = {};
    posts.forEach((p) => {
      const party = partyFromSource(p);
      by[party] = by[party] || { pos: 0, neg: 0, total: 0 };
      by[party].total += 1;
      const e = emotionOf(p);
      if (POSITIVE.has(e)) by[party].pos += 1;
      else if (NEGATIVE.has(e)) by[party].neg += 1;
    });

    // simple score: pos*2 - neg, normalize to [0,1]
    const scored = Object.entries(by).map(([party, v]) => {
      const raw = v.pos * 2 - v.neg;
      return { party, ...v, raw };
    });
    if (!scored.length) return [];

    const min = Math.min(...scored.map((r) => r.raw));
    const max = Math.max(...scored.map((r) => r.raw));
    return scored.map((r) => ({
      ...r,
      prob: max === min ? 0.5 : (r.raw - min) / (max - min),
    })).sort((a, b) => b.prob - a.prob);
  }, [posts]);

  if (!rows.length) return <div className="text-sm text-gray-500">Insufficient signals to estimate outlook.</div>;

  const leader = rows[0];
  return (
    <div className="text-sm">
      <div className="mb-2">
        If the election were held today in <span className="font-semibold">{ward}</span>, the model
        indicates a leading chance for <span className="font-semibold">{leader.party}</span>.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Party</th>
              <th className="py-1">Signals</th>
              <th className="py-1">Score</th>
              <th className="py-1">Win Prob.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.party} className="border-t">
                <td className="py-1">{r.party}</td>
                <td className="py-1">{r.total}</td>
                <td className="py-1">{(r.pos * 2 - r.neg)}</td>
                <td className="py-1">{Math.round(r.prob * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        *Heuristic model using sentiment-derived signals. Calibrate with ward voters & historic outcomes for stronger accuracy.
      </div>
    </div>
  );
}
