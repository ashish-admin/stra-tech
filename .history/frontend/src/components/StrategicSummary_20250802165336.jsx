import { useState, useEffect } from 'react';
import axios from 'axios';

// The component now receives the filters and searchTerm as props
function StrategicSummary({ filters, searchTerm }) { 
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This useEffect hook will now re-run whenever the filters or searchTerm change
  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true); // Show loading spinner on every new request
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      try {
        axios.defaults.withCredentials = true;
        // The filters are now passed as query parameters in the API call
        const response = await axios.get(`${apiUrl}/api/v1/strategic-summary`, {
          params: { 
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
  }, [filters, searchTerm]); // Dependency array ensures this re-runs on filter change

  if (loading) {
    return <div className="text-gray-500">🧠 Generating AI strategic briefing...</div>;
  }

  if (error || summary?.error) {
    return <div className="text-red-500">{error || summary.error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-green-600">📈 Strategic Opportunity</h4>
          <p className="text-gray-700">{summary?.opportunity}</p>
        </div>
        <div>
          <h4 className="font-semibold text-red-600">⚠️ Strategic Threat</h4>
          <p className="text-gray-700">{summary?.threat}</p>
        </div>
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