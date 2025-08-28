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
    () => series.length && series.some((d) => PARTIES.some((p) => d[p] > 0)),
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
      <div className="text-sm text-gray-500">
        No competitor trend data for the selected ward.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={20} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => `${v}%`} />
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
