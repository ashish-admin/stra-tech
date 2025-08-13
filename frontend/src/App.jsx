import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Root component controlling authentication, initial data loading,
 * filtering logic and error boundary wrapping.  It checks whether
 * the user is logged in, fetches posts, geojson and competitive
 * analysis data on login, and passes everything down to the
 * Dashboard component.
 */
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    analyticsData: [],
    geoJsonData: null,
    competitiveData: null
  });
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ city: 'All', emotion: 'All' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        axios.defaults.withCredentials = true;
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/status`);
        setIsLoggedIn(response.data.logged_in);
      } catch (err) {
        setIsLoggedIn(false);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Fetch posts and geojson once authenticated
  useEffect(() => {
    if (isLoggedIn) {
      const fetchInitialData = async () => {
        setLoadingData(true);
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        try {
          const [postsRes, geoJsonRes] = await Promise.all([
            axios.get(`${apiUrl}/api/v1/posts`),
            axios.get(`${apiUrl}/api/v1/geojson`)
          ]);
          setDashboardData((prev) => ({
            ...prev,
            analyticsData: postsRes.data,
            geoJsonData: geoJsonRes.data
          }));
        } catch (err) {
          setError('Failed to load initial dashboard data.');
        } finally {
          setLoadingData(false);
        }
      };
      fetchInitialData();
    }
  }, [isLoggedIn]);

  // Fetch competitive analysis when city filter changes
  useEffect(() => {
    if (isLoggedIn) {
      const fetchCompetitiveData = async () => {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        try {
          const competitiveRes = await axios.get(`${apiUrl}/api/v1/competitive-analysis`, {
            params: { city: filters.city }
          });
          setDashboardData((prev) => ({ ...prev, competitiveData: competitiveRes.data }));
        } catch (err) {
          console.error('Failed to fetch competitive analysis data:', err);
        }
      };
      fetchCompetitiveData();
    }
  }, [isLoggedIn, filters.city]);

  // Filter analytics data based on selected filters and search term
  useEffect(() => {
    let data = dashboardData.analyticsData ? [...dashboardData.analyticsData] : [];
    if (filters.city !== 'All') data = data.filter((item) => item.city === filters.city);
    if (filters.emotion !== 'All') data = data.filter((item) => item.emotion === filters.emotion);
    if (searchTerm) data = data.filter((item) => item.text.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredData(data);
  }, [filters, searchTerm, dashboardData.analyticsData]);

  const handleChartClick = (emotion) => setFilters((prev) => ({ ...prev, emotion }));

  // Render states
  if (loadingAuth || (isLoggedIn && loadingData)) {
    return <div>Loading Political War Room...</div>;
  }
  if (!isLoggedIn) {
    return <LoginPage setIsLoggedIn={setIsLoggedIn} />;
  }
  if (error) {
    return <div>{error}</div>;
  }
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">LokDarpan: Political War Room</h1>
      <ErrorBoundary>
        <Dashboard
          filteredData={filteredData}
          allData={dashboardData.analyticsData || []}
          geoJsonData={dashboardData.geoJsonData}
          competitiveData={dashboardData.competitiveData}
          filters={filters}
          setFilters={setFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleChartClick={handleChartClick}
        />
      </ErrorBoundary>
    </div>
  );
}

export default App;