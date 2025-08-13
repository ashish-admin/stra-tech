import React, { useState, useEffect } from 'react';
import axios from 'axios';
import wardDemographics from '../wardDemographics';

/**
 * Provides the on‑demand "Area Pulse" feature.  Users can enter a ward name
 * and request a real‑time analysis.  The component displays the most
 * recent briefing if one exists, otherwise it allows triggering a new
 * analysis.  It polls the server until results are ready.
 */
const StrategicSummary = ({ selectedWard }) => {
  // The currently selected ward.  Default to the selectedWard prop if
  // provided, otherwise use a sensible default.  When selectedWard changes
  // (e.g. via the map), this state is synchronised via the effect below.
  const [ward, setWard] = useState(selectedWard && selectedWard !== 'All' ? selectedWard : 'Jubilee Hills');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [briefing, setBriefing] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  // Whenever the selectedWard prop changes, update the local ward state
  // unless the user has manually entered a different ward.  Ignore "All".
  useEffect(() => {
    if (selectedWard && selectedWard !== 'All' && selectedWard !== ward) {
      setWard(selectedWard);
    }
  }, [selectedWard]);

  useEffect(() => {
    const fetchLatestBriefing = async () => {
      if (!ward) return;
      setIsFetching(true);
      setBriefing(null);
      setStatusMessage('');
      setError('');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      try {
        const res = await axios.get(`${apiUrl}/api/v1/alerts/${ward}`);
        if (res.status === 200 && res.data && res.data.opportunities) {
          const result = JSON.parse(res.data.opportunities);
          if (result.briefing) {
            setBriefing(result.briefing);
          } else {
            setStatusMessage(result.status || 'No recent briefing available. Generate one now.');
          }
        } else {
          setStatusMessage('No briefing has been generated for this ward yet.');
        }
      } catch (err) {
        setStatusMessage('No briefing has been generated for this ward yet.');
      } finally {
        setIsFetching(false);
      }
    };
    fetchLatestBriefing();
  }, [ward]);

  const handleTriggerAnalysis = async () => {
    setIsLoading(true);
    setError('');
    setBriefing(null);
    setStatusMessage('');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    try {
      await axios.post(`${apiUrl}/api/v1/trigger_analysis`, { ward });
      let attempts = 0;
      const interval = setInterval(async () => {
        if (attempts >= 20) {
          setError('Analysis is taking longer than expected. Please try again.');
          setIsLoading(false);
          clearInterval(interval);
          return;
        }
        try {
          const res = await axios.get(`${apiUrl}/api/v1/alerts/${ward}`);
          if (res.status === 200 && res.data && res.data.opportunities) {
            const result = JSON.parse(res.data.opportunities);
            if (result.briefing) {
              setBriefing(result.briefing);
            } else {
              setStatusMessage(result.status);
            }
            setIsLoading(false);
            clearInterval(interval);
          }
        } catch (pollError) {
          if (pollError.response?.status !== 404) {
            setError('An error occurred while fetching results.');
            setIsLoading(false);
            clearInterval(interval);
          }
        }
        attempts++;
      }, 3000);
    } catch (err) {
      setError('Failed to trigger analysis.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          placeholder="Enter Ward Name"
          className="p-2 border rounded-md w-full md:w-1/3"
        />
        <button
          onClick={handleTriggerAnalysis}
          disabled={!ward || isLoading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          {isLoading ? 'Analyzing...' : 'Area Pulse'}
        </button>
      </div>
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      {isLoading && <div>Briefing in progress...</div>}
      {isFetching && !isLoading && <div>Loading latest briefing...</div>}
      {!isFetching && statusMessage && !briefing && <div>{statusMessage}</div>}
      {!isFetching && briefing && (
        <div className="space-y-2 border rounded-md p-4 bg-gray-50">
          <h3 className="text-xl font-bold">Candidate Briefing: {ward}</h3>
          {/* Display demographic/voter information if available for this ward.  We
              normalise the ward name in the same way as the map so that
              "Ward 8 Habsiguda" maps to "Habsiguda". */}
          {(() => {
            // Normalise the ward to look up demographics: remove "Ward X " prefix
            const normalised = ward.replace(/^\s*Ward\s*\d+\s+/i, '').trim();
            const info = wardDemographics[normalised];
            if (info) {
              return (
                <div className="text-sm text-gray-700">
                  <strong>Registered Voters (est.):</strong> {info.voters.toLocaleString()} &ndash; {info.description}
                </div>
              );
            }
            return null;
          })()}
          {briefing.key_issue && (
            <div>
              <strong>Key Issue:</strong> {briefing.key_issue}
            </div>
          )}
          {briefing.our_angle && (
            <div>
              <strong>Our Angle (The Narrative):</strong> {briefing.our_angle}
            </div>
          )}
          {briefing.opposition_weakness && (
            <div>
              <strong>Opposition's Weakness:</strong> {briefing.opposition_weakness}
            </div>
          )}
          <div>
            <strong>Recommended Actions (Next 24h):</strong>
            {/* Safely render the recommended actions list. Each item can be a string or an object. */}
            {Array.isArray(briefing.recommended_actions) && (
              <ul className="list-decimal list-outside ml-5 mt-2 space-y-2 text-blue-900">
                {briefing.recommended_actions.map((item, index) => {
                  // If the item is a plain string, render it directly
                  if (typeof item === 'string') {
                    return <li key={index}>{item}</li>;
                  }
                  // If it's an object, display the action and optional timeline
                  if (item && typeof item === 'object') {
                    return (
                      <li key={index}>
                        <strong>{item.action ?? 'Action'}</strong>
                        {item.timeline ? ` – ${item.timeline}` : null}
                      </li>
                    );
                  }
                  // Otherwise render nothing
                  return null;
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategicSummary;