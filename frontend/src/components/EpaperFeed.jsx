// frontend/src/components/EpaperFeed.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api";

function ArticleCard({ item, onOpen }) {
  const title =
    item.title ||
    (item.preview || (item.raw_text || "").split("\n")[0]).slice(0, 160) ||
    "Untitled";

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold">{item.publication_name || "Unknown"}</div>
        <div className="text-xs text-gray-500">
          {item.publication_date || item.created_at || "—"}
        </div>
      </div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap">
        {title}
      </div>
      <div className="mt-2">
        <button
          onClick={() => onOpen(item.id || item.sha256)}
          className="text-blue-600 text-sm hover:underline"
        >
          Open full article
        </button>
      </div>
    </div>
  );
}

export default function EpaperFeed({ ward, limit = 10 }) {
  // Build query string: omit city when "All" to let backend return global latest
  const qs = new URLSearchParams();
  if (ward && ward !== "All") qs.set("city", ward);
  if (limit) qs.set("limit", String(limit));
  const listPath = `api/v1/epaper${qs.toString() ? `?${qs.toString()}` : ""}`;

  const q = useQuery({
    queryKey: ["epaperFeed", ward, limit],
    queryFn: () => fetchJson(listPath),
    staleTime: 60_000,
  });

  const [openId, setOpenId] = React.useState(null);

  const full = useQuery({
    enabled: !!openId,
    queryKey: ["epaperFull", openId],
    queryFn: () => fetchJson(`api/v1/epaper/${openId}`),
  });

  // Normalize return shape (array or {items: []})
  const items = React.useMemo(() => {
    if (!q.data) return [];
    if (Array.isArray(q.data)) return q.data;
    if (Array.isArray(q.data.items)) return q.data.items;
    return [];
  }, [q.data]);

  return (
    <div className="bg-white border rounded-md p-2">
      <div className="font-medium mb-2">
        Latest Epaper Headlines{ward && ward !== "All" ? ` — ${ward}` : ""}
      </div>

      {q.isLoading && <div className="text-sm text-gray-500">Loading headlines…</div>}
      {q.isError && <div className="text-sm text-red-600">Failed to load headlines.</div>}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <div className="text-sm text-gray-500">No recent articles.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <ArticleCard key={item.id || item.sha256} item={item} onOpen={setOpenId} />
        ))}
      </div>

      {/* Simple drawer / modal */}
      {openId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between border-b p-3">
              <div className="font-semibold">Article</div>
              <button
                className="text-gray-600 hover:text-black"
                onClick={() => setOpenId(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {full.isLoading && <div className="text-sm text-gray-500">Loading…</div>}
              {full.isError && (
                <div className="text-sm text-red-600">Failed to load the article.</div>
              )}
              {full.data && (
                <>
                  <div className="text-sm text-gray-500 mb-2">
                    {full.data.publication_name || "Unknown"} —{" "}
                    {full.data.publication_date || full.data.created_at || "—"}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">
                    {full.data.raw_text || "—"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
