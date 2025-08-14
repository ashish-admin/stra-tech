import React, { useMemo } from "react";

function parseFlexibleDate(raw) {
  if (!raw) return null;
  if (typeof raw === "number") {
    const d = new Date(raw < 1e12 ? raw * 1000 : raw);
    return isNaN(+d) ? null : d;
  }
  const s = String(raw).trim();
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) {
    const d = new Date(s.replace(" ", "T"));
    return isNaN(+d) ? null : d;
  }
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [_, dd, mm, yyyy, HH = "00", MM = "00", SS = "00"] = m;
    const d = new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}`);
    return isNaN(+d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(+d) ? null : d;
}
function getDay(p) {
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
  const d = parseFlexibleDate(raw);
  return d ? d.toISOString().slice(0, 10) : null;
}
function partyFromSource(p) {
  const src = (p.source || p.author || p.publisher || "").toLowerCase();
  if (/bjp|bharatiya/.test(src)) return "BJP";
  if (/brs|trs\b|telangana rashtra/.test(src)) return "BRS";
  if (/congress|inc\b|telangana congress/.test(src)) return "INC";
  if (/aimim/.test(src)) return "AIMIM";
  return "OTHER";
}

export default function CompetitorTrendChart({ posts = [] }) {
  const { series, synthetic, note } = useMemo(() => {
    const hasDates = posts.some((p) => getDay(p));
    const byParty = {};

    if (hasDates) {
      posts.forEach((p) => {
        const day = getDay(p);
        if (!day) return;
        const party = partyFromSource(p);
        byParty[party] = byParty[party] || {};
        byParty[party][day] = (byParty[party][day] || 0) + 1;
      });
      return { series: byParty, synthetic: false, note: "" };
    }

    // Fallback: 7 buckets in ingestion order per party
    const B = 7;
    posts.forEach((p, i) => {
      const bucket = `Day ${Math.floor((i / Math.max(1, posts.length)) * B) + 1}`;
      const party = partyFromSource(p);
      byParty[party] = byParty[party] || {};
      byParty[party][bucket] = (byParty[party][bucket] || 0) + 1;
    });
    return {
      series: byParty,
      synthetic: true,
      note: "Posts lack usable timestamps; trend shown across synthetic day-buckets.",
    };
  }, [posts]);

  const parties = Object.keys(series);
  if (!parties.length) {
    return <div className="text-sm text-gray-500">No competitor trend data available for the selected ward.</div>;
  }

  return (
    <div>
      {synthetic && <div className="text-xs text-amber-600 mb-2">{note}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {parties.map((party) => {
          const rows = Object.entries(series[party]).sort((a, b) => a[0].localeCompare(b[0]));
          return (
            <div key={party} className="border rounded p-2">
              <div className="text-xs font-medium mb-2">{party}</div>
              <div className="text-xs text-gray-600 space-y-1">
                {rows.map(([day, n]) => (
                  <div key={day} className="flex justify-between">
                    <span>{day}</span><span>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
