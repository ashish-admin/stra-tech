import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';

function App() {
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New state for filters
  const [filters, setFilters] = useState({
    emotion: 'All',
    city: 'All',
  });
  
  // New state for filtered data
  const [filteredData, setFilteredData] = useState([]);

  // Fetch data on initial load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/v1/analytics');
        setAnalyticsData(response.data);
        setFilteredData(response.data); // Initially, filtered data is all data
      } catch (err) {
        setError('Failed to fetch data from the backend. Please ensure the backend server is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // New logic to apply filters whenever the filters or original data change
  useEffect(() => {
    let data = [...analyticsData];

    if (filters.emotion !== 'All') {
      data = data.filter(item => item.emotion === filters.emotion);
    }

    if (filters.city !== 'All') {
      data = data.filter(item => item.city === filters.city);
    }

    setFilteredData(data);
  }, [filters, analyticsData]);


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
          {/* We now pass down the filtered data and filter controls */}
          <Dashboard 
            data={filteredData} 
            allData={analyticsData}
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      </main>
    </div>
  );
}

export default App;