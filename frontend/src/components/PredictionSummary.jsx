import React, { useMemo } from "react";
import { useOptimizedPrediction } from "../hooks/useOptimizedAPI";

export default function PredictionSummary({ ward = "All" }) {
  // Handle the "All" case with a specific message
  if (ward === "All") {
    return (
      <div className="text-sm text-gray-500">
        Select a specific ward to view electoral predictions. Predictions are ward-specific and require detailed local analysis.
      </div>
    );
  }

  // Use the ward name directly as ward_id (per Dashboard.jsx pattern)
  const { data: prediction, isLoading, isError, error } = useOptimizedPrediction(ward);

  // Loading state
  if (isLoading) {
    return (
      <div className="text-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-sm text-red-600">
        <div className="mb-2">
          Unable to load prediction data for {ward}.
        </div>
        <div className="text-xs text-gray-500">
          {error?.message || "Please try again later."}
        </div>
      </div>
    );
  }

  // No data or invalid data structure
  if (!prediction?.scores || typeof prediction.scores !== 'object') {
    return (
      <div className="text-sm text-gray-500">
        Prediction data not available for {ward}. This may be due to insufficient data or ongoing analysis.
      </div>
    );
  }

  // Process the scores from API
  const rows = useMemo(() => {
    const scores = prediction.scores || {};
    const parties = Object.entries(scores)
      .map(([party, score]) => ({
        party: party.toUpperCase(),
        score: Number(score) || 0
      }))
      .sort((a, b) => b.score - a.score); // Sort by score descending
    
    return parties;
  }, [prediction.scores]);

  if (!rows.length) {
    return (
      <div className="text-sm text-gray-500">
        No prediction data available for {ward}.
      </div>
    );
  }

  const leader = rows[0];
  const confidence = prediction.confidence ? Math.round(prediction.confidence * 100) : null;

  return (
    <div className="text-sm">
      <div className="mb-2">
        If the election were held today in <span className="font-semibold">{ward}</span>, the model
        indicates a leading chance for <span className="font-semibold">{leader.party}</span>{" "}
        with {Math.round(leader.score)}% support.
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Party</th>
              <th className="py-1">Support %</th>
              <th className="py-1">Win Prob.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.party} className="border-t">
                <td className="py-1">{r.party}</td>
                <td className="py-1">{Math.round(r.score * 10) / 10}%</td>
                <td className="py-1">
                  {r === leader ? "Leading" : r.score >= 30 ? "Competitive" : "Trailing"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {confidence && (
        <div className="text-xs text-gray-600 mt-2">
          Model Confidence: {confidence}%
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-1">
        *Predictions based on AI analysis of local political intelligence. Results are estimates and should be interpreted with local knowledge.
      </div>
    </div>
  );
}
