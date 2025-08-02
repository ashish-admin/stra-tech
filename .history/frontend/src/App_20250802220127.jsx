import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [allPosts, setAllPosts] = useState([]); // For dropdowns
  const [wards, setWards] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ emotion: 'All', city: 'All', ward: 'All' });
  const [searchTerm, setSearchTerm] = useState('');

  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
  axios.defaults.withCredentials = true;

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoadingAuth(true);
      try {
        const { data } = await axios.get(`${apiUrl}/api/v1/status`);
        setIsLoggedIn(data.logged_in);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setAnalyticsData([]);
      setWards([]);
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const params = { ...filters, searchTerm };
        const [{ data: analytics }, { data: wardsData }] = await Promise.all([
          axios.get(`${apiUrl}/api/v1/analytics`, { params }),
          wards.length <= 1 ? axios.get(`${apiUrl}/api/v1/wards`) : Promise.resolve({ data: wards.slice(1) })
        ]);
        
        setAnalyticsData(analytics);
        if (wards.length <= 1) {
            setWards(['All', ...wardsData]);
            // Set the base data for dropdowns on the first successful load
            const {data: allAnalytics} = await axios.get(`${apiUrl}/api/v1/analytics`, { params: { emotion: 'All', city: 'All', ward: 'All', searchTerm: '' } });
            setAllPosts(allAnalytics);
        }

      } catch (err) {
        setError('Failed to fetch dashboard data.');
        if (err.response?.status === 401) setIsLoggedIn(false);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isLoggedIn, filters, searchTerm]);

  if (loadingAuth) {
    return <div className="text-center text-2xl p-10">Authenticating...</div>;
  }
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

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