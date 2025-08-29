// frontend/src/components/WardMetaPanel.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api";

/** Simple “x mins ago” formatter */
function timeAgo(iso) {
  if (!iso) return "—";
  const then = new Date(iso);
  const diff = Math.max(0, Date.now() - then.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-semibold">{value ?? "—"}</span>
    </div>
  );
}

export default function WardMetaPanel({ wardId }) {
  const q = useQuery({
    queryKey: ["wardMeta", wardId],
    // NOTE: we pass the path without a leading slash — fetchJson joins it to the base
    queryFn: () => fetchJson(`api/v1/ward/meta/${wardId}`),
    enabled: !!wardId, // Only run query when wardId is not null/undefined
  });

  if (q.isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (q.isError) {
    if (q.error?.status === 404 || q.error?.body?.status === "not_found") {
      return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">
            No data found for <span className="font-semibold">{wardId}</span>.
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-red-600">Failed to load ward meta.</div>
      </div>
    );
  }

  const data = q.data || {};
  const profile = data.profile || {};
  const demo = data.demographics || {};
  const feats = data.features || {};
  const updatedAt = data.updated_at;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">
          Ward Overview — {data.ward || wardId}
        </h3>
        <div className="text-xs text-gray-500">updated {timeAgo(updatedAt)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Electors" value={profile.electors?.toLocaleString()} />
        <Stat label="Votes Cast" value={profile.votes_cast?.toLocaleString()} />
        <Stat label="Turnout %" value={profile.turnout_pct ?? "—"} />
        <Stat label="Last Winner" value={profile.last_winner_party ?? "—"} />
        <Stat label="Last Year" value={profile.last_winner_year ?? "—"} />
        <Stat label="Turnout Volatility" value={feats.turnout_volatility ?? "—"} />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500 mb-1">ACI 23</div>
          <div className="text-lg font-semibold">{feats.aci_23 ?? "—"}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500 mb-1">SECC Deprivation</div>
          <div className="text-lg font-semibold">{demo.secc_deprivation_idx ?? "—"}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500 mb-1">Literacy</div>
          <div className="text-lg font-semibold">{demo.literacy_idx ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
