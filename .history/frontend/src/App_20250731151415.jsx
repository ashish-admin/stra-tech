import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';

function App() {
  // Existing state for data
  const [analyticsData, setAnalyticsData] = useState([]);
  
  // New state variables to track loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Updated logic to fetch data and manage state
  useEffect(() => {
    const fetchData = async () => {
      try {
        // We are using the vite proxy, so we just need the relative path
        const response = await axios.get('/api/v1/analytics');
        setAnalyticsData(response.data);
      } catch (err) {
        // If an error occurs, store the error message
        setError('Failed to fetch data from the backend. Please ensure the backend server is running.');
        console.error(err);
      } finally {
        // Once fetching is done (either success or fail), set loading to false
        setLoading(false);
      }
    };

    fetchData();
  }, []); // The empty dependency array means this effect runs only once on mount

  // Conditional rendering based on the state
  if (loading) {
    return <div className="flex justify-center items-center h-screen text-2xl">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-2xl text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            LokDarpan: Discourse Analytics
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Dashboard data={analyticsData} />
        </div>
      </main>
    </div>
  );
}

export default App;