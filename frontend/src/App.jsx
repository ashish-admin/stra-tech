import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ emotion: 'All', city: 'All' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  // This function now checks the session status
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
  
  // This function fetches the dashboard data
  const fetchData = async () => {
    setLoadingData(true); // Ensure loading state is true before fetching
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    try {
      const response = await axios.get(`${apiUrl}/api/v1/posts`);
      setAnalyticsData(response.data);
      // No longer setting filteredData here to avoid race conditions
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

  // Fetch dashboard data only if the user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);
  
  // --- ENHANCEMENT ---
  // This single, robust useEffect now handles all filtering and data updates.
  useEffect(() => {
    let data = [...analyticsData];
    if (filters.emotion !== 'All') data = data.filter(item => item.emotion === filters.emotion);
    if (filters.city !== 'All') data = data.filter(item => item.city === filters.city);
    if (searchTerm) data = data.filter(item => item.text.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredData(data);
  }, [filters, searchTerm, analyticsData]); // This runs whenever the source data or filters change

  // Handle clicks from the pie chart
  const handleChartClick = (emotion) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      emotion: emotion
    }));
  };

  // Render different components based on the authentication state
  if (loadingAuth) {
    return <div className="flex justify-center items-center h-screen text-2xl">Checking Authentication...</div>;
  }
  
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => {
      setIsLoggedIn(true);
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
            handleChartClick={handleChartClick}
          />
        </div>
      </main>
    </div>
  );
}

export default App;