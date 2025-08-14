import React, { useMemo } from "react";

const STOP = new Set([
  "the","a","an","and","or","but","of","to","in","for","on","with","at","from","by","this","that","is","are","am","be",
  "as","it","its","was","were","will","we","our","you","your","they","their","he","she","his","her","them","us","i",
  "about","into","after","before","over","under","again","more","most","very","can","cannot","could","would","should",
  "has","have","had","do","does","did","not","no","yes"
]);

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[#@]|https?:\/\/\S+|[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && !STOP.has(t));
}

export default function TopicAnalysis({ posts = [], keyword = "" }) {
  const top = useMemo(() => {
    const counts = new Map();
    posts.forEach((p) => {
      const text = p.text || p.content || "";
      tokenize(text).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [posts]);

  if (!posts.length) return <div className="text-sm text-gray-500">No posts to analyze.</div>;
  if (!top.length) return <div className="text-sm text-gray-500">No significant keywords detected.</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {top.map(([t, n]) => (
        <span key={t}
          className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs"
          title={`${n} mentions`}>
          {t}
        </span>
      ))}
    </div>
  );
}
