import React, { useMemo } from "react";

const PARTY_COLORS = {
  BJP: "#f59e0b",
  BRS: "#ec4899",
  INC: "#3b82f6",
  AIMIM: "#10b981",
  OTHER: "#9ca3af",
};

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
const POSITIVE = new Set(["joy", "hopeful", "admiration", "pride", "positive", "support", "confidence"]);
const NEGATIVE = new Set(["anger", "frustration", "fear", "sadness", "disgust", "negative"]);

export default function CompetitiveAnalysis({ data = {}, posts = [] }) {
  // If server aggregate is empty, build from posts
  const computed = useMemo(() => {
    const byParty = {};
    posts.forEach((p) => {
      const party = partyFromSource(p);
      byParty[party] = byParty[party] || { total: 0, positive: 0, negative: 0, other: 0 };
      byParty[party].total += 1;
      const e = emotionOf(p);
      if (POSITIVE.has(e)) byParty[party].positive += 1;
      else if (NEGATIVE.has(e)) byParty[party].negative += 1;
      else byParty[party].other += 1;
    });
    return byParty;
  }, [posts]);

  const src = Object.keys(data || {}).length ? data : computed;
  const parties = Object.keys(src);

  if (!parties.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <div className="text-sm text-gray-500 mb-2">⚠️ No Competitive Analysis Available</div>
        <div className="text-xs text-gray-400">
          Current ward has insufficient party competition data.
          {posts?.length > 0 && (
            <span className="block mt-1">
              Found {posts.length} posts but could not determine party affiliations.
            </span>
          )}
        </div>
      </div>
    );
  }

  // Render stacked bars: positive / negative / other
  return (
    <div className="space-y-3">
      {parties.map((party) => {
        const { total, positive, negative, other } = src[party];
        const pPct = total ? Math.round((positive / total) * 100) : 0;
        const nPct = total ? Math.round((negative / total) * 100) : 0;
        const oPct = Math.max(0, 100 - pPct - nPct);
        return (
          <div key={party}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium" style={{ color: PARTY_COLORS[party] || PARTY_COLORS.OTHER }}>
                {party}
              </span>
              <span className="text-gray-500">{total} mentions</span>
            </div>
            <div className="w-full bg-gray-100 rounded h-3 flex overflow-hidden">
              <div className="h-3" style={{ width: `${pPct}%`, background: "#10b981" }} title={`Positive ${pPct}%`} />
              <div className="h-3" style={{ width: `${nPct}%`, background: "#ef4444" }} title={`Negative ${nPct}%`} />
              <div className="h-3" style={{ width: `${oPct}%`, background: "#a3a3a3" }} title={`Other ${oPct}%`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
