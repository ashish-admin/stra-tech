import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

function App() {
  // State for authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // State for data displayed in the components (this will be filtered)
  const [analyticsData, setAnalyticsData] = useState([]);
  
  // State for the complete, unfiltered dataset used to populate dropdowns
  const [allPosts, setAllPosts] = useState([]); 
  
  // State for dropdown options and loading/error statuses
  const [wards, setWards] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  // State for user-selected filters
  const [filters, setFilters] = useState({ emotion: 'All', city: 'All', ward: 'All' });
  const [searchTerm, setSearchTerm] = useState('');

  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
  axios.defaults.withCredentials = true;

  // --- This useEffect hook runs ONLY ONCE after login to fetch the master data ---
  useEffect(() => {
    // Don't run if the user is not logged in
    if (!isLoggedIn) return;

    const fetchMasterData = async () => {
      setLoadingData(true);
      setError(null);
      console.log("🚀 Initializing dashboard: Fetching master data...");
      try {
        // Fetch the full, unfiltered list of posts to populate dropdowns
        const allPostsResponse = await axios.get(`${apiUrl}/api/v1/analytics`, { 
            params: { emotion: 'All', city: 'All', ward: 'All', searchTerm: '' } 
        });
        const masterData = Array.isArray(allPostsResponse.data) ? allPostsResponse.data : [];
        setAllPosts(masterData);
        setAnalyticsData(masterData); // The initial view shows all data
        console.log(`✅ Fetched ${masterData.length} total posts for dropdowns.`);

        // Fetch the list of wards for the ward filter dropdown
        const wardsResponse = await axios.get(`${apiUrl}/api/v1/wards`);
        const wardsData = Array.isArray(wardsResponse.data) ? wardsResponse.data : [];
        setWards(['All', ...wardsData]);
        console.log(`✅ Fetched ${wardsData.length} unique wards.`);

      } catch (err) {
        console.error("❌ FRONTEND MASTER FETCH ERROR ❌", err);
        const errorMsg = err.response?.data?.error || err.message;
        setError(`Failed to load initial dashboard data: ${errorMsg}`);
        if (err.response?.status === 401) setIsLoggedIn(false);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchMasterData();
  }, [isLoggedIn]); // This hook depends ONLY on the login status

  // --- This useEffect hook runs ONLY when the user changes a filter ---
  useEffect(() => {
    // Don't run this on the initial load; wait for master data to be fetched first.
    if (!isLoggedIn || allPosts.length === 0) return;

    const fetchFilteredData = async () => {
      setLoadingData(true);
      setError(null);
      console.log("🚀 Filters changed. Fetching filtered data with:", { ...filters, searchTerm });
      try {
        const response = await axios.get(`${apiUrl}/api/v1/analytics`, { params: { ...filters, searchTerm } });
        const filteredData = Array.isArray(response.data) ? response.data : [];
        setAnalyticsData(filteredData);
        console.log(`✅ Fetched ${filteredData.length} filtered posts.`);
      } catch (err) {
        console.error("❌ FRONTEND FILTERED FETCH ERROR ❌", err);
        const errorMsg = err.response?.data?.error || err.message;
        setError(`Failed to apply filters: ${errorMsg}`);
        if (err.response?.status === 401) setIsLoggedIn(false);
      } finally {
        setLoadingData(false);
      }
    };

    // We use a timeout to "debounce" the input, so it doesn't fire an API call on every keystroke
    const handler = setTimeout(() => {
        fetchFilteredData();
    }, 300); // 300ms delay

    return () => {
        clearTimeout(handler); // Cleanup the timeout if the user types again quickly
    };
  }, [filters, searchTerm]); // This hook depends ONLY on filter changes

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
        {error && 
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        }
        {loadingData && <div className="text-center p-2 text-blue-600 font-semibold">Updating data...</div>}
        
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
