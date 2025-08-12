import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StrategicSummary = () => {
    const [ward, setWard] = useState('Jubilee Hills');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [briefing, setBriefing] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState('');

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
                        setStatusMessage(result.status || "No recent briefing available. Generate one now.");
                    }
                } else {
                     setStatusMessage("No briefing has been generated for this ward yet.");
                }
            } catch (err) {
                setStatusMessage("No briefing has been generated for this ward yet.");
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
            <div className="flex items-center space-x-4">
                <input type="text" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Enter Ward Name" className="p-2 border rounded-md w-full md:w-1/3" />
                <button onClick={handleTriggerAnalysis} disabled={isLoading || isFetching} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                    {isLoading ? 'Analyzing...' : 'Area Pulse'}
                </button>
            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
            {isLoading && <div className="p-3 bg-yellow-100 text-yellow-700 rounded-md">Briefing in progress...</div>}
            {isFetching && !isLoading && <div className="p-4 text-center text-gray-500">Loading latest briefing...</div>}
            {!isFetching && statusMessage && !briefing && <div className="p-4 bg-gray-100 text-gray-700 rounded-md">{statusMessage}</div>}

            {!isFetching && briefing && (
                <div className="bg-white p-6 rounded-lg border shadow-sm mt-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Candidate Briefing: {ward}</h3>
                    {briefing.key_issue && <p className="text-sm text-gray-500 mb-6 italic">"{briefing.key_issue}"</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {briefing.our_angle && <div>
                                <h4 className="font-semibold text-gray-800">Our Angle (The Narrative)</h4>
                                <p className="text-gray-600">{briefing.our_angle}</p>
                            </div>}
                             {briefing.opposition_weakness && <div>
                                <h4 className="font-semibold text-gray-800">Opposition's Weakness</h4>
                                <p className="text-gray-600">{briefing.opposition_weakness}</p>
                            </div>}
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-800">Recommended Actions (Next 24h)</h4>
                            {/* --- THE FIX IS HERE --- */}
                            {/* We now safely check if the data is an array and then render the specific properties of each object. */}
                            {Array.isArray(briefing.recommended_actions) && (
                                <ul className="list-decimal list-outside ml-5 mt-2 space-y-2 text-blue-900">
                                    {briefing.recommended_actions.map((item, index) => (
                                        <li key={index}>
                                            <span className="font-semibold">{item.action}:</span> {item.details}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategicSummary;
