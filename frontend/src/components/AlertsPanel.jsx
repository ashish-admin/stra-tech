import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// Error boundary integration
import { ProductionErrorBoundary } from "../shared/error/ProductionErrorBoundary.jsx";
import { featureFlagManager } from "../config/features.js";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

// Core AlertsPanel Component
function AlertsPanelCore({ posts = [], ward = "All" }) {
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

// Enhanced AlertsPanel with Error Boundary Integration
export default function AlertsPanel({ posts = [], ward = "All", onError, onDataRefetch }) {
  const errorBoundariesEnabled = featureFlagManager.isEnabled('enableComponentErrorBoundaries');
  
  // Political context for error reporting
  const politicalContext = {
    ward: ward,
    component: 'AlertsPanel',
    operationType: ward === 'All' ? 'general_alerts' : 'ward_specific_alerts',
    campaignCritical: true,
    hasProactiveAlerts: ward !== 'All',
    postsCount: posts?.length || 0
  };
  
  // AlertsPanel error context
  const alertsErrorContext = {
    ...politicalContext,
    dataTypes: ['proactive_alerts', 'intelligence_feed', 'recommended_actions'],
    fallbackOptions: ['cached_alerts', 'basic_feed', 'static_intelligence'],
    recoveryStrategies: ['api_retry', 'cache_fallback', 'simplified_view']
  };
  
  // Fallback component for alerts failures
  const AlertsPanelFallback = ({ error, errorId, retryCount, onRetry }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Intelligence Alerts</h3>
        <span className="text-xs text-red-500">Service Temporarily Unavailable</span>
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
              Alert System Temporarily Unavailable
            </h4>
            <p className="mt-1 text-sm text-yellow-700">
              The political intelligence alert system is experiencing issues for ward "{ward}". 
              Campaign teams can continue monitoring through other dashboard components.
            </p>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={onRetry}
                disabled={retryCount >= 3}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 disabled:opacity-50"
              >
                {retryCount >= 3 ? 'Max Retries Reached' : `Retry Connection (${retryCount}/3)`}
              </button>
              {onDataRefetch && (
                <button
                  onClick={() => onDataRefetch('basic_alerts')}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  View Basic Intelligence Feed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency basic alerts information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="font-semibold text-blue-800 mb-2">Basic Alert Status</div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Ward: {ward}</p>
          <p>• Posts Available: {posts?.length || 0} intelligence items</p>
          <p>• Status: Proactive alerts unavailable, basic feed accessible</p>
          <p>• Campaign Impact: Strategic recommendations temporarily limited</p>
          <p>• Fallback: Continue using other dashboard components for intelligence</p>
        </div>
      </div>
      
      {/* Show basic intelligence feed if posts are available */}
      {posts && posts.length > 0 && (
        <div className="border-t pt-3">
          <div className="font-semibold text-gray-800 mb-2">Emergency Intelligence Feed</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">Recent Intelligence</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2">Context</th>
                </tr>
              </thead>
              <tbody>
                {posts.slice(0, 5).map((p, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-2 pr-3">{(p.text || '').substring(0, 100)}...</td>
                    <td className="py-2 pr-3">{p.author || "Unknown"}</td>
                    <td className="py-2">{p.emotion || p.city || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
  
  // Recovery strategies for alerts
  const recoveryStrategies = {
    api_timeout: async (context) => {
      // Retry with shorter timeout for alerts
      try {
        const response = await axios.get(
          `${apiBase}/api/v1/pulse/${encodeURIComponent(ward)}?days=7`,
          { 
            withCredentials: true,
            timeout: 3000 // Shorter timeout for alerts
          }
        );
        return { success: true, data: response.data, action: 'quick_retry' };
      } catch (error) {
        return { success: false, action: 'basic_feed_only' };
      }
    },
    network_error: async (context) => {
      // Use cached posts if available
      if (context.postsCount > 0) {
        return { success: true, action: 'use_cached_posts' };
      }
      return { success: false, action: 'no_data_available' };
    },
    data_validation_error: async (context) => {
      // Provide basic alert functionality
      return { success: true, action: 'basic_functionality' };
    }
  };
  
  if (!errorBoundariesEnabled) {
    return <AlertsPanelCore posts={posts} ward={ward} />;
  }
  
  return (
    <ProductionErrorBoundary
      context={alertsErrorContext}
      fallbackComponent={AlertsPanelFallback}
      recoveryStrategies={recoveryStrategies}
      onError={(error, errorId, context) => {
        if (onError) onError(error, errorId, context);
        console.warn(`AlertsPanel Error [${errorId}]:`, error, context);
      }}
      enableTelemetry={featureFlagManager.isEnabled('enableErrorTelemetry')}
    >
      <AlertsPanelCore 
        posts={posts} 
        ward={ward}
        onError={onError}
        onDataRefetch={onDataRefetch}
      />
    </ProductionErrorBoundary>
  );
}
