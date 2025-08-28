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

// keep labels consistent with your app’s emotions
const EMOTIONS = [
  "Positive",
  "Anger",
  "Negative",
  "Hopeful",
  "Pride",
  "Admiration",
  "Frustration",
];

// modest color palette (recharts 3 is fine with hex)
const EMOTION_COLORS = {
  Positive: "#16a34a",
  Anger: "#ef4444",
  Negative: "#a3a3a3",
  Hopeful: "#22c55e",
  Pride: "#60a5fa",
  Admiration: "#06b6d4",
  Frustration: "#f59e0b",
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

export default function TimeSeriesChart({ ward = "All", days = 30 }) {
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
        // shape each day into: { date, mentions, Positive, Anger, ... }
        const shaped = raw.map((d) => {
          const out = {
            date: fmtDate(d.date),
            mentions: Number(d.mentions_total || 0),
          };
          const em = d.emotions || {};
          EMOTIONS.forEach((k) => {
            out[k] = Number(em[k] || 0);
          });
          return out;
        });

        setSeries(shaped);
      } catch (e) {
        console.error("TimeSeriesChart trends error", e);
        setErr("Could not load trend data.");
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

  const hasData = useMemo(() => {
    if (!series.length) return false;
    // at least one non-zero emotion or mentions
    return series.some(
      (d) =>
        (d.mentions && d.mentions > 0) ||
        EMOTIONS.some((k) => Number(d[k] || 0) > 0)
    );
  }, [series]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading trend data…</div>;
  }

  if (err) {
    return <div className="text-sm text-red-600">{err}</div>;
  }

  if (!hasData) {
    return (
      <div className="text-sm text-gray-500">
        No historical trend data available for the selected ward.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={20} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          {/* Mentions on right axis */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="mentions"
            stroke="#64748b"
            strokeWidth={2}
            dot={false}
            name="Mentions (total)"
          />
          {/* A few key emotions by default; you can turn on all if you like */}
          {["Positive", "Anger", "Negative"].map((k) => (
            <Line
              key={k}
              yAxisId="left"
              type="monotone"
              dataKey={k}
              stroke={EMOTION_COLORS[k]}
              strokeWidth={2}
              dot={false}
              name={k}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
