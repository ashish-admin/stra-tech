import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // State for the data currently being displayed (filtered)
  const [analyticsData, setAnalyticsData] = useState([]);
  
  // State for the complete, unfiltered dataset to populate dropdowns
  const [allPosts, setAllPosts] = useState([]); 
  
  const [wards, setWards] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ emotion: 'All', city: 'All', ward: 'All' });
  const [searchTerm, setSearchTerm] = useState('');

  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
  axios.defaults.withCredentials = true;

  // --- This useEffect hook runs ONLY ONCE after login to fetch the master data ---
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchMasterData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        // Fetch the full, unfiltered list of posts for dropdowns
        const allPostsResponse = await axios.get(`${apiUrl}/api/v1/analytics`, { 
            params: { emotion: 'All', city: 'All', ward: 'All', searchTerm: '' } 
        });
        setAllPosts(Array.isArray(allPostsResponse.data) ? allPostsResponse.data : []);
        setAnalyticsData(Array.isArray(allPostsResponse.data) ? allPostsResponse.data : []); // Set initial view to all data

        // Fetch the list of wards for the ward dropdown
        const wardsResponse = await axios.get(`${apiUrl}/api/v1/wards`);
        setWards(['All', ...(Array.isArray(wardsResponse.data) ? wardsResponse.data : [])]);

      } catch (err) {
        setError('Failed to load initial dashboard data.');
        if (err.response?.status === 401) setIsLoggedIn(false);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchMasterData();
  }, [isLoggedIn]); // Depends only on login status

  // --- This useEffect hook runs ONLY when the user changes a filter ---
  useEffect(() => {
    // Don't run this on the initial load; wait for master data to be fetched first.
    if (!isLoggedIn || allPosts.length === 0) return;

    const fetchFilteredData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const response = await axios.get(`${apiUrl}/api/v1/analytics`, { params: { ...filters, searchTerm } });
        setAnalyticsData(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Failed to apply filters.');
        if (err.response?.status === 401) setIsLoggedIn(false);
      } finally {
        setLoadingData(false);
      }
    };

    fetchFilteredData();
  }, [filters, searchTerm]); // Depends only on filter changes

  // --- Authentication and Rendering Logic ---

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoadingAuth(true);
      try {
        const { data } = await axios.get(`${apiUrl}/api/v1/status`);
        setIsLoggedIn(data.logged_in);
      } catch { setIsLoggedIn(false); } 
      finally { setLoadingAuth(false); }
    };
    checkAuthStatus();
  }, []);

  if (loadingAuth) return <div className="text-center text-2xl p-10">Authenticating...</div>;
  if (!isLoggedIn) return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">LokDarpan: Discourse Analytics</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        {loadingData && <div className="text-center p-2">Updating data...</div>}
        {error && <div className="text-center p-2 text-red-500">{error}</div>}
        <Dashboard
          data={analyticsData}
          allPosts={allPosts}
          wards={wards}
          filters={filters}
          setFilters={setFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </main>
    </div>
  );
}

export default App;