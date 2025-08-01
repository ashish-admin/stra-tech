import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';

function App() {
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    emotion: 'All',
    city: 'All',
  });
  
  // New state for the search term
  const [searchTerm, setSearchTerm] = useState('');

  const [filteredData, setFilteredData] = useState([]);

 // Fetch data on initial load
  useEffect(() => {
    const fetchData = async () => {
      // Use the production URL from the environment variable, or an empty string for local dev
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      try {
        const response = await axios.get(`${apiUrl}/api/v1/analytics`);
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

  // Updated logic to apply all filters, including search
  useEffect(() => {
    let data = [...analyticsData];

    // Apply dropdown filters
    if (filters.emotion !== 'All') {
      data = data.filter(item => item.emotion === filters.emotion);
    }
    if (filters.city !== 'All') {
      data = data.filter(item => item.city === filters.city);
    }

    // Apply search term filter
    if (searchTerm) {
      data = data.filter(item =>
        item.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredData(data);
  }, [filters, searchTerm, analyticsData]);


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
          <Dashboard 
            data={filteredData} 
            allData={analyticsData}
            filters={filters}
            setFilters={setFilters}
            // Pass down search state and setter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
      </main>
    </div>
  );
}

export default App;