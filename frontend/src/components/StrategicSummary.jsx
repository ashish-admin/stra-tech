// frontend/src/components/StrategicSummary.jsx

import React, { useState } from 'react';
import axios from 'axios';

const StrategicSummary = () => {
    const [ward, setWard] = useState('Jubilee Hills'); // Default ward for demonstration
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);

    const handleTriggerAnalysis = async () => {
        if (!ward) {
            setError('Please specify a ward to analyze.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        try {
            // Step 1: Trigger the background analysis task
            const triggerResponse = await axios.post(`${apiUrl}/api/v1/trigger_analysis`, { ward });
            console.log(triggerResponse.data.message);

            // Step 2: Poll for the results. In a production app, you might use WebSockets or a more robust polling strategy.
            let attempts = 0;
            const interval = setInterval(async () => {
                try {
                    const resultResponse = await axios.get(`${apiUrl}/api/v1/alerts/${ward}`);
                    if (resultResponse.status === 200) {
                        setAnalysisResult(resultResponse.data);
                        setIsLoading(false);
                        clearInterval(interval);
                    }
                } catch (pollError) {
                    if (pollError.response && pollError.response.status !== 404) {
                        setError('An error occurred while fetching analysis results.');
                        setIsLoading(false);
                        clearInterval(interval);
                    }
                }
                attempts++;
                if (attempts > 10) {
                    setError('Analysis is taking longer than expected. Please check back later.');
                    setIsLoading(false);
                    clearInterval(interval);
                }
            }, 3000);

        } catch (err) {
            setError('Failed to trigger analysis. Please check the backend server.');
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="Enter Ward Name (e.g., Jubilee Hills)"
                    className="p-2 border rounded-md w-full md:w-1/3"
                />
                <button
                    onClick={handleTriggerAnalysis}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Analyzing...' : 'Generate Strategic Summary'}
                </button>
            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            {isLoading && (
                <div className="p-3 bg-yellow-100 text-yellow-700 rounded-md">
                    Fetching latest news and running AI analysis... This may take up to 30 seconds.
                </div>
            )}

            {analysisResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <h3 className="font-bold text-green-800 mb-2">Opportunities</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.opportunities}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <h3 className="font-bold text-red-800 mb-2">Threats</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.threats}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <h3 className="font-bold text-blue-800 mb-2">Actionable Alerts (Next 48h)</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.actionable_alerts}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategicSummary;