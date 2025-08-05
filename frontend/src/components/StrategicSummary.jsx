import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MessageSquare, Megaphone, ClipboardCopy, AlertTriangle, Zap } from 'lucide-react';

const StrategicSummary = ({ ward, onAnalysisComplete }) => {
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // This effect clears the old summary when the ward changes
    useEffect(() => {
        setSummaryData(null);
        setError(null);
    }, [ward]);

    const handleRunAnalysis = () => {
        if (!ward) return;

        setLoading(true);
        setError(null);
        setSummaryData(null);

        axios.post('/api/v1/proactive-analysis', {
            context_level: 'ward', // For now, we only support 'ward' level analysis
            context_name: ward
        })
        .then(response => {
            // We use the response from this analysis as our "summary"
            setSummaryData(response.data);
            // Notify the parent App component that new alert data is available
            onAnalysisComplete(response.data);
        })
        .catch(err => {
            console.error("Error running proactive analysis:", err);
            setError(`Failed to generate analysis for ${ward}.`);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const renderContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        }
        if (error) {
            return <div className="flex flex-col items-center justify-center h-full text-red-500"><AlertTriangle className="h-12 w-12 mb-4" /><p>{error}</p></div>;
        }
        if (!ward) {
            return <div className="flex flex-col items-center justify-center h-full text-gray-500"><Briefcase className="h-12 w-12 mb-4" /><p>Select a ward to run an analysis.</p></div>;
        }
        if (!summaryData) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold text-gray-700">Analysis for {ward}</h3>
                    <p className="text-gray-500 mb-4">Click the button to generate a new strategic deep-dive.</p>
                    <button onClick={handleRunAnalysis} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center transition-colors">
                        <Zap className="h-5 w-5 mr-2" />
                        Run Deep-Dive Analysis
                    </button>
                </div>
            );
        }

        // Render the analysis results
        return (
            <div className="space-y-4 overflow-y-auto h-full pr-2">
                <div>
                    <h3 className="text-md font-semibold text-gray-800 flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                        Priority Alert
                    </h3>
                    <p className="text-sm text-gray-600 bg-red-50 p-3 rounded-md border border-red-200">
                        {summaryData.priority_alert}
                    </p>
                </div>
                <div>
                    <h3 className="text-md font-semibold text-gray-800 flex items-center mb-2">
                        <Megaphone className="h-5 w-5 mr-2 text-green-600" />
                        Opportunities
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                        {summaryData.opportunities?.map((point, index) => <li key={index}>{point}</li>)}
                    </ul>
                </div>
                 <div>
                    <h3 className="text-md font-semibold text-gray-800 flex items-center mb-2">
                        <ShieldAlert className="h-5 w-5 mr-2 text-yellow-600" />
                        Threats
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                        {summaryData.threats?.map((point, index) => <li key={index}>{point}</li>)}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 p-4 shadow-inner rounded-lg h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">On-Demand Analysis</h2>
            <div className="flex-grow overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
};

export default StrategicSummary;