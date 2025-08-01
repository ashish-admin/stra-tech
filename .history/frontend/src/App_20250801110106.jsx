import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage'; // New import

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ emotion: 'All', city: 'All' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  const checkAuthStatus = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    try {
      axios.defaults.withCredentials = true;
      const response = await axios.get(`${apiUrl}/api/v1/status`);
      setIsLoggedIn(response.data.logged_in);
    } catch (err) {
      setIsLoggedIn(false);
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchData = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    try {
      const response = await axios.get(`${apiUrl}/api/v1/analytics`);
      setAnalyticsData(response.data);
      setFilteredData(response.data);
    } catch (err) {
      setError('Failed to fetch data. Please check your connection or login status.');
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  // Check auth status on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Fetch main data only if logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  // Handle filtering logic
  useEffect(() => {
    let data = [...analyticsData];
    if (filters.emotion !== 'All') data = data.filter(item => item.emotion === filters.emotion);
    if (filters.city !== 'All') data = data.filter(item => item.city === filters.city);
    if (searchTerm) data = data.filter(item => item.text.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredData(data);
  }, [filters, searchTerm, analyticsData]);


  // Render different components based on state
  if (loadingAuth) {
    return <div className="flex justify-center items-center h-screen text-2xl">Checking Authentication...</div>;
  }

  if (!isLoggedIn) {
    // Show login page if not authenticated
    return <LoginPage onLoginSuccess={() => {
      setIsLoggedIn(true);
      setLoadingData(true); // Show loading while fetching data
    }} />;
  }

  if (loadingData) {
    return <div className="flex justify-center items-center h-screen text-2xl">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-2xl text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">LokDarpan: Discourse Analytics</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Dashboard 
            data={filteredData} 
            allData={analyticsData}
            filters={filters}
            setFilters={setFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
      </main>
    </div>
  );
}

export default App;