import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import wardDataRaw from "../data/wardData.js";
import wardVotersRaw from "../data/wardVoters.js"; // keep as empty {} if not used

// Political Strategist components
import PoliticalStrategist from "../features/strategist/components/PoliticalStrategist";
import { useFeatureFlag } from "../features/strategist/hooks/useStrategist";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

function normalizeWard(label) {
  if (!label) return "";
  let s = String(label);
  s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
  s = s.replace(/^ward\s*\d+\s*/i, "");
  s = s.replace(/^\d+\s*-\s*/i, "");
  s = s.replace(/^\d+\s+/i, "");
  return s.replace(/\s+/g, " ").trim();
}

function buildWardMeta() {
  const meta = new Map();
  Object.entries(wardDataRaw || {}).forEach(([k, v]) => {
    meta.set(normalizeWard(k), {
      voters: v.voters ?? v.electors ?? null,
      turnout: v.turnout ?? v.turnoutPct ?? null,
      winner: v.winnerParty ?? v.lastWinner ?? null,
    });
  });
  Object.entries(wardVotersRaw || {}).forEach(([k, v]) => {
    const key = normalizeWard(k);
    const prev = meta.get(key) || {};
    meta.set(key, {
      voters: prev.voters ?? v.electors ?? null,
      turnout: prev.turnout ?? v.turnoutPct ?? null,
      winner: prev.winner ?? v.winnerParty ?? null,
    });
  });
  return meta;
}
const WARD_META = buildWardMeta();

const STOP = new Set(
  "the a an and or but of to in for on with at from by this that is are am be as it its was were will we our you your they their he she his her them us i about into after before over under again more most very can cannot could would should has have had do does did not no yes"
    .split(" ")
);

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[#@]|https?:\/\/\S+|[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && !STOP.has(t));
}

// Legacy Strategic Summary Component
function LegacyStrategicSummary({ selectedWard = "All" }) {
  const [wardInput, setWardInput] = useState(selectedWard);
  const [briefing, setBriefing] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setWardInput(selectedWard), [selectedWard]);

  const meta = useMemo(() => {
    const key = normalizeWard(wardInput);
    return WARD_META.get(key) || {};
  }, [wardInput]);

  async function fetchPulse(ward) {
    const url = `${apiBase}/api/v1/pulse/${encodeURIComponent(ward)}?days=14`;
    const res = await axios.get(url, { withCredentials: true });
    const data = res?.data || {};
    return data?.briefing ? data : null;
  }

  async function buildLocalBriefing(ward) {
    try {
      const res = await axios.get(
        `${apiBase}/api/v1/posts?city=${encodeURIComponent(ward)}`,
        { withCredentials: true }
      );
      const items = Array.isArray(res.data)
        ? res.data
        : (res.data?.items || []);

      if (!items.length) {
        setStatus(`No recent posts found for ${ward} (last 14 days).`);
        setBriefing(null);
        return;
      }

      const bag = new Map();
      items.slice(0, 200).forEach((p) => {
        (tokens(p.text || p.content || "")).forEach((t) =>
          bag.set(t, (bag.get(t) || 0) + 1)
        );
      });

      const keywords = Array.from(bag.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k]) => k);

      const key_issue = keywords.length
        ? `Local sentiment centers on: ${keywords.slice(0, 3).join(", ")}.`
        : "Local sentiment is diffuse without a single dominant topic.";

      const our_angle =
        `We position our candidate as the proactive problem-solver in ${ward}, focusing on ${keywords.slice(0,2).join(" & ") || "pressing civic issues"}, with clear delivery milestones, public progress checks, and responsive grievance handling.`;

      const opposition_weakness =
        `Opposition narratives show gaps on execution and consistency in ${ward}. We contrast their reactive posture with our measurable plan and transparent delivery.`;

      const recommended_actions = [
        { action: "Micro-townhalls", timeline: "72h", details: `Run 3 meets in ${ward} on top concerns (${keywords.slice(0,3).join(", ") || "roads, drainage, services"}).` },
        { action: "Before/After proof", timeline: "7 days", details: "Publish evidence of solved complaints; open issues board with 48h SLA." },
        { action: "Narrative contrast", timeline: "48h", details: "Release a short video on execution vs. reactive stance." },
      ];

      setBriefing({ key_issue, our_angle, opposition_weakness, recommended_actions });
      setStatus("");
    } catch {
      setStatus(`No recent posts found for ${ward} (last 14 days).`);
      setBriefing(null);
    }
  }

  async function loadSummary(ward) {
    const wardClean = normalizeWard(ward);
    setStatus("");
    setBriefing(null);

    try {
      const pulse = await fetchPulse(wardClean);
      if (pulse?.briefing) {
        setBriefing(pulse.briefing);
        return;
      }
    } catch { /* fall back */ }

    await buildLocalBriefing(wardClean);
  }

  async function handlePulse() {
    const wardClean = normalizeWard(wardInput);
    setIsLoading(true);
    setStatus("");
    try {
      await loadSummary(wardClean);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="border rounded-md p-2 flex-1"
          value={wardInput}
          onChange={(e) => setWardInput(e.target.value)}
          placeholder="Ward name"
        />
        <button
          onClick={handlePulse}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Analyzing…" : "Area Pulse"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs px-2 py-1 bg-gray-100 rounded">Voters: {meta?.voters ?? "—"}</span>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded">Turnout: {meta?.turnout != null ? `${meta.turnout}%` : "—"}</span>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded">Last Winner: {meta?.winner ?? "—"}</span>
      </div>

      {status && <div className="text-sm text-gray-500">{status}</div>}

      {briefing && (
        <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {briefing.key_issue && <p className="italic text-gray-600">"{briefing.key_issue}"</p>}
            {briefing.our_angle && (
              <div>
                <div className="font-semibold mb-1">Our Angle (The Narrative)</div>
                <p className="text-gray-700">{briefing.our_angle}</p>
              </div>
            )}
            {briefing.opposition_weakness && (
              <div>
                <div className="font-semibold mb-1">Opposition's Weakness</div>
                <p className="text-gray-700">{briefing.opposition_weakness}</p>
              </div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="font-semibold text-blue-800 mb-2">Recommended Actions (Next 24h)</div>
            <ol className="list-decimal ml-5 space-y-2">
              {(briefing.recommended_actions || []).map((a, i) => (
                <li key={i}>
                  <span className="font-semibold">{a.action}</span> — {a.details}
                  {a.timeline ? <span className="text-xs text-gray-500"> (Within {a.timeline})</span> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Strategic Summary Component with AI Integration
export default function StrategicSummary({ selectedWard = "All" }) {
  const useAIMode = useFeatureFlag('ai-strategist') && selectedWard !== 'All';
  
  if (useAIMode) {
    return <PoliticalStrategist selectedWard={selectedWard} />;
  }
  
  return <LegacyStrategicSummary selectedWard={selectedWard} />;
}
