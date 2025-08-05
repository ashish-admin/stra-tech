import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MessageSquare, Megaphone, ClipboardCopy, AlertTriangle } from 'lucide-react';

const StrategicSummary = ({ ward }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    if (ward) {
      setLoading(true);
      setError(null);
      setSummaryData(null);
      axios.get(`/api/v1/strategic-summary/${ward}`)
        .then(response => {
          setSummaryData(response.data);
        })
        .catch(err => {
          console.error("Error fetching strategic summary:", err);
          setError(`Failed to generate summary for ${ward}.`);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSummaryData(null);
      setLoading(false);
      setError(null);
    }
  }, [ward]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000); // Reset after 2 seconds
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
    }
    if (error) {
      return <div className="flex flex-col items-center justify-center h-full text-red-500"><AlertTriangle className="h-12 w-12 mb-4" /><p>{error}</p></div>;
    }
    if (!ward) {
        return <div className="flex flex-col items-center justify-center h-full text-gray-500"><Briefcase className="h-12 w-12 mb-4" /><p>Select a ward on the map or table to generate a strategic summary.</p></div>;
    }
    if (!summaryData || summaryData.error) {
        return <div className="flex flex-col items-center justify-center h-full text-gray-500"><p>{summaryData?.error || "No summary data available."}</p></div>;
    }

    return (
      <div className="space-y-6 overflow-y-auto h-full pr-2">
        {/* Candidate Briefing */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-2">
            <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
            Candidate Briefing
          </h3>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
            {summaryData.candidate_briefing}
          </p>
        </div>

        {/* Talking Points */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-2">
            <Megaphone className="h-5 w-5 mr-2 text-green-600" />
            Talking Points
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            {summaryData.talking_points?.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>

        {/* Social Media Drafts */}
        <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-2">
                <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
                Social Media Drafts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryData.social_media_drafts?.map((draft, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase text-gray-500">{draft.platform} - ({draft.tone})</span>
                            <button
                                onClick={() => handleCopy(draft.content, index)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Copy to clipboard"
                            >
                                <ClipboardCopy className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-700 italic">"{draft.content}"</p>
                        {copiedIndex === index && <span className="text-xs text-green-600 mt-2">Copied!</span>}
                    </div>
                ))}
            </div>
        </div>

        {/* Proactive Initiatives */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-2">
            <Megaphone className="h-5 w-5 mr-2 text-orange-600" />
            Proactive Initiatives (Next 48 Hours)
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            {summaryData.proactive_initiatives?.map((initiative, index) => (
              <li key={index}>{initiative}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-4 shadow-inner rounded-lg h-full flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">Strategic Workbench</h2>
        <div className="flex-grow overflow-hidden">
            {renderContent()}
        </div>
    </div>
  );
};

export default StrategicSummary;