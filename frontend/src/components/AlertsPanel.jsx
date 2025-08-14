import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

export default function AlertsPanel({ posts = [], ward = "All" }) {
  const [loading, setLoading] = useState(false);
  const [proactive, setProactive] = useState([]); // from pulse briefings (recommended actions)
  const [error, setError] = useState("");

  // Load proactive “alerts” from the instant pulse endpoint for the selected ward
  useEffect(() => {
    let cancelled = false;

    async function loadPulse() {
      setLoading(true);
      setError("");
      setProactive([]);

      // Only query a ward; skip “All” to avoid 404s
      if (!ward || ward === "All") {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(
          `${apiBase}/api/v1/pulse/${encodeURIComponent(ward)}?days=14`,
          { withCredentials: true }
        );
        if (!cancelled) {
          const actions = res.data?.briefing?.recommended_actions;
          setProactive(Array.isArray(actions) ? actions : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Could not fetch proactive alerts for this ward.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPulse();
    return () => {
      cancelled = true;
    };
  }, [ward]);

  // Feed table is driven from posts prop (already filtered by dashboard)
  const tableRows = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    return posts.slice(0, 100); // keep UI snappy
  }, [posts]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Proactive Alerts</h3>

      {ward === "All" ? (
        <div className="text-sm text-gray-600">
          Select a ward on the map (or from the filter above) to fetch targeted
          recommended actions.
        </div>
      ) : loading ? (
        <div className="text-sm text-gray-500">Loading proactive actions…</div>
      ) : error ? (
        <div className="p-2 bg-red-100 text-red-700 rounded-md">{error}</div>
      ) : proactive.length === 0 ? (
        <div className="text-sm text-gray-600">No new alerts.</div>
      ) : (
        <ol className="list-decimal pl-5 space-y-1">
          {proactive.map((a, i) => (
            <li key={i}>
              <span className="font-semibold">{a.action}</span>
              {a.timeline ? ` — ${a.timeline}` : ""}: {a.details}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 border-t pt-3">
        <div className="font-semibold text-gray-800 mb-2">Actionable Intelligence Feed</div>
        {tableRows.length === 0 ? (
          <div className="text-sm text-gray-600">No items for the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">News highlight</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Ward</th>
                  <th className="py-2">Detected emotion</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((p) => (
                  <tr key={p.id || `${p.author}-${p.created_at}-${p.text?.slice(0,20)}`} className="border-t">
                    <td className="py-2 pr-3">{p.text}</td>
                    <td className="py-2 pr-3">{p.author || "Unknown"}</td>
                    <td className="py-2 pr-3">{p.city || "—"}</td>
                    <td className="py-2">{p.emotion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
