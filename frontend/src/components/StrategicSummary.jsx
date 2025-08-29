import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import wardDataRaw from "../data/wardData.js";
import wardVotersRaw from "../data/wardVoters.js"; // keep as empty {} if not used

// Political Strategist components
import PoliticalStrategist from "../features/strategist/components/PoliticalStrategist";
import { useFeatureFlag } from "../features/strategist/hooks/useStrategist";
import { useEnhancedSSE, useConfidenceScore } from "../features/strategist/hooks/useEnhancedSSE";
import { ConfidenceScoreIndicator, ConnectionStatusIndicator } from "../features/strategist/components/ProgressIndicators";

// Error boundary integration
import { ProductionErrorBoundary } from "../shared/error/ProductionErrorBoundary.jsx";
import { featureFlagManager } from "../config/features.js";

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

// Strategic Summary Component with Error Boundary Protection
function StrategicSummaryCore({ selectedWard = "All" }) {
  const useAIMode = useFeatureFlag('ai-strategist') && selectedWard !== 'All';
  
  // Stream A's enhanced SSE integration
  const { 
    connectionState, 
    isConnected, 
    briefing, 
    confidence 
  } = useEnhancedSSE(selectedWard, { 
    priority: 'all',
    includeConfidence: true 
  });
  
  // Confidence score monitoring
  const confidenceData = useConfidenceScore(selectedWard);
  
  if (useAIMode) {
    return (
      <div className="space-y-3">
        {/* Stream A Integration Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">AI Strategic Analysis</h3>
            <ConnectionStatusIndicator 
              connectionState={connectionState} 
              className="text-xs"
            />
          </div>
          
          {/* Real-time confidence indicator */}
          {confidenceData.current && (
            <ConfidenceScoreIndicator 
              confidenceData={confidenceData}
              className="text-xs"
            />
          )}
        </div>
        
        {/* Enhanced Political Strategist with Stream A data */}
        <PoliticalStrategist 
          selectedWard={selectedWard}
          enhancedData={{
            briefing,
            confidence: confidenceData,
            isConnected,
            connectionState
          }}
        />
        
        {/* Stream A Analysis Quality Indicator */}
        {briefing && (
          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-700">
                Multi-Model Analysis • Sources: {briefing.sources || 'N/A'}
              </span>
              <span className="text-purple-600 font-medium">
                Quality: {briefing.analysisQuality ? Math.round(briefing.analysisQuality * 100) : '--'}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return <LegacyStrategicSummary selectedWard={selectedWard} />;
}

// Enhanced Strategic Summary with Error Boundary Integration
export default function StrategicSummary({ selectedWard = "All", onError, onDataRefetch }) {
  const errorBoundariesEnabled = featureFlagManager.isEnabled('enableComponentErrorBoundaries');
  const sseErrorBoundariesEnabled = featureFlagManager.isEnabled('enableSSEErrorBoundaries');
  
  // Political context for error reporting
  const politicalContext = {
    ward: selectedWard,
    component: 'StrategicSummary',
    operationType: selectedWard === 'All' ? 'legacy_analysis' : 'ai_strategic_analysis',
    campaignCritical: true,
    hasSSE: selectedWard !== 'All',
    hasAI: selectedWard !== 'All'
  };
  
  // Strategic Summary error context
  const strategicErrorContext = {
    ...politicalContext,
    dataTypes: ['briefing', 'political_intelligence', 'strategic_recommendations'],
    fallbackOptions: ['local_briefing', 'basic_analysis', 'cached_data'],
    recoveryStrategies: ['api_retry', 'sse_reconnect', 'fallback_mode']
  };
  
  // Fallback component for strategic analysis failures
  const StrategicSummaryFallback = ({ error, errorId, retryCount, onRetry }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Strategic Analysis</h3>
        <span className="text-xs text-red-500">Analysis Service Unavailable</span>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800">
              Strategic Intelligence Temporarily Unavailable
            </h4>
            <p className="mt-1 text-sm text-yellow-700">
              The AI strategic analysis system is currently experiencing issues for ward "{selectedWard}". 
              Campaign teams can continue with basic analysis or retry the connection.
            </p>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={onRetry}
                disabled={retryCount >= 3}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 disabled:opacity-50"
              >
                {retryCount >= 3 ? 'Max Retries Reached' : `Retry Analysis (${retryCount}/3)`}
              </button>
              {onDataRefetch && (
                <button
                  onClick={() => onDataRefetch('strategic_analysis')}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  Switch to Basic Mode
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Emergency basic strategic information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="font-semibold text-blue-800 mb-2">Basic Strategic Context</div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Ward: {selectedWard}</p>
          <p>• Status: AI analysis unavailable, using basic mode</p>
          <p>• Campaign Impact: Strategic recommendations temporarily limited</p>
          <p>• Suggested Action: Monitor for service restoration or contact technical team</p>
        </div>
      </div>
    </div>
  );
  
  // Recovery strategies for strategic analysis
  const recoveryStrategies = {
    ai_service_error: async (context) => {
      // Try to reconnect SSE or fallback to legacy mode
      if (context.hasSSE) {
        // Force SSE reconnection
        window.dispatchEvent(new CustomEvent('sse_reconnect', { detail: { ward: selectedWard } }));
      }
      return { success: true, action: 'sse_reconnect' };
    },
    api_timeout: async (context) => {
      // Retry with shorter timeout
      try {
        const response = await axios.get(`${apiBase}/api/v1/pulse/${encodeURIComponent(selectedWard)}?days=7`, {
          withCredentials: true,
          timeout: 5000
        });
        return { success: true, data: response.data, action: 'quick_retry' };
      } catch (error) {
        return { success: false, action: 'fallback_mode' };
      }
    },
    data_validation_error: async (context) => {
      // Switch to legacy mode
      return { success: true, action: 'fallback_legacy' };
    }
  };
  
  if (!errorBoundariesEnabled && !sseErrorBoundariesEnabled) {
    return <StrategicSummaryCore selectedWard={selectedWard} />;
  }
  
  return (
    <ProductionErrorBoundary
      context={strategicErrorContext}
      fallbackComponent={StrategicSummaryFallback}
      recoveryStrategies={recoveryStrategies}
      onError={(error, errorId, context) => {
        if (onError) onError(error, errorId, context);
        console.warn(`StrategicSummary Error [${errorId}]:`, error, context);
      }}
      enableTelemetry={featureFlagManager.isEnabled('enableErrorTelemetry')}
    >
      <StrategicSummaryCore 
        selectedWard={selectedWard}
        onError={onError}
        onDataRefetch={onDataRefetch}
      />
    </ProductionErrorBoundary>
  );
}
