import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

// parties we surface consistently
const PARTIES = ["BRS", "BJP", "INC", "AIMIM", "Other"];

const PARTY_COLORS = {
  BRS: "#22c55e",
  BJP: "#f97316",
  INC: "#3b82f6",
  AIMIM: "#10b981",
  Other: "#6b7280",
};

function fmtDate(d) {
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export default function CompetitorTrendChart({ ward = "All", days = 30 }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const url = `${apiBase}/api/v1/trends?ward=${encodeURIComponent(
          ward || "All"
        )}&days=${days}`;
        const res = await axios.get(url, { withCredentials: true });
        if (cancelled) return;

        const raw = Array.isArray(res.data?.series) ? res.data.series : [];

        // Map per day -> share-of-voice % for each party
        const shaped = raw.map((d) => {
          const total = Number(d.mentions_total || 0);
          const p = d.parties || {};
          const row = { date: fmtDate(d.date) };
          PARTIES.forEach((name) => {
            const v = Number(p[name] || 0);
            row[name] = total > 0 ? Math.round((v * 10000) / total) / 100 : 0;
          });
          return row;
        });

        setSeries(shaped);
      } catch (e) {
        console.error("CompetitorTrendChart error", e);
        setErr("Could not load competitor trends.");
        setSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ward, days]);

  const hasData = useMemo(
    () => {
      if (!series.length) return false;
      // Check if we have at least 2 parties with meaningful data (>1% share)
      const dataPoints = series.some((d) => {
        const activeParties = PARTIES.filter(p => d[p] > 1).length;
        return activeParties >= 2;
      });
      return dataPoints;
    },
    [series]
  );

  if (loading) {
    return <div className="text-sm text-gray-500">Loading competitor trends…</div>;
  }

  if (err) {
    return <div className="text-sm text-red-600">{err}</div>;
  }

  if (!hasData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-sm text-gray-500 mb-2">
          ⚠️ Limited Competition Data
        </div>
        <div className="text-xs text-gray-400 mb-3">
          Current ward shows minimal party competition data.
          {series.length > 0 && (
            <span className="block mt-1">
              {series.length} days of data available, mostly "Other" party mentions.
            </span>
          )}
        </div>
        <div className="text-xs text-blue-600">
          💡 Try selecting a different ward or check back after more data is ingested.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ minHeight: '320px', height: '320px' }}>
      <div className="mb-2 text-xs text-gray-500">
        📊 Party Share of Voice Over Time (showing {series.length} days)
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={series} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            minTickGap={20} 
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={11}
          />
          <YAxis 
            domain={[0, 100]} 
            tickFormatter={(v) => `${v}%`}
            fontSize={11}
            width={50}
          />
          <Tooltip 
            formatter={(v) => [`${v}%`, 'Share of Voice']}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ fontSize: '12px' }}
          />
          <Legend />
          {PARTIES.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              name={`${p} (share)`}
              stroke={PARTY_COLORS[p]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
