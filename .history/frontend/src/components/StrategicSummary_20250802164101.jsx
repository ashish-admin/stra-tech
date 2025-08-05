import { useState, useEffect } from 'react';
import axios from 'axios';

function StrategicSummary({ filters, searchTerm }) { // Now receives filters
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true); // Set loading to true on each new request
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      try {
        axios.defaults.withCredentials = true;
        const response = await axios.get(`${apiUrl}/api/v1/strategic-summary`, {
          params: { // Pass filters as query parameters
            emotion: filters.emotion,
            city: filters.city,
            searchTerm: searchTerm
          }
        });
        setSummary(response.data);
      } catch (err) {
        console.error("Failed to fetch strategic summary:", err);
        setError("Could not load AI strategic summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [filters, searchTerm]); // Re-fetch when filters change

  if (loading) {
    return <div className="text-gray-500">🧠 Generating AI strategic briefing...</div>;
  }

  if (error || summary?.error) {
    return <div className="text-red-500">{error || summary.error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-green-600">📈 Strategic Opportunity</h4>
        <p className="text-gray-700">{summary?.opportunity}</p>
      </div>
      <div>
        <h4 className="font-semibold text-red-600">⚠️ Strategic Threat</h4>
        <p className="text-gray-700">{summary?.threat}</p>
      </div>
      <hr/>
      <div>
        <h4 className="font-semibold text-blue-600">🎯 Prescriptive Action</h4>
        <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-gray-800 font-medium">{summary?.prescriptive_action}</p>
        </div>
      </div>
    </div>
  );
}

export default StrategicSummary;