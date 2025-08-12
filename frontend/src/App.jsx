import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        analyticsData: [],
        geoJsonData: null,
        competitiveData: null,
    });
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ city: 'All', emotion: 'All' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState([]);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                axios.defaults.withCredentials = true;
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/status`);
                setIsLoggedIn(response.data.logged_in);
            } catch (err) { setIsLoggedIn(false); }
            finally { setLoadingAuth(false); }
        };
        checkAuthStatus();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            const fetchInitialData = async () => {
                setLoadingData(true);
                const apiUrl = import.meta.env.VITE_API_BASE_URL;
                try {
                    const [postsRes, geoJsonRes] = await Promise.all([
                        axios.get(`${apiUrl}/api/v1/posts`),
                        axios.get(`${apiUrl}/api/v1/geojson`),
                    ]);
                    setDashboardData(prev => ({
                        ...prev,
                        analyticsData: postsRes.data,
                        geoJsonData: geoJsonRes.data,
                    }));
                } catch (err) {
                    setError("Failed to load initial dashboard data.");
                } finally {
                    setLoadingData(false);
                }
            };
            fetchInitialData();
        }
    }, [isLoggedIn]);

    // --- UPGRADE: This hook now makes the competitive analysis interactive ---
    useEffect(() => {
        if (isLoggedIn) {
            const fetchCompetitiveData = async () => {
                const apiUrl = import.meta.env.VITE_API_BASE_URL;
                try {
                    const competitiveRes = await axios.get(`${apiUrl}/api/v1/competitive-analysis`, {
                        params: { city: filters.city } // Pass the current city filter to the backend
                    });
                    setDashboardData(prev => ({ ...prev, competitiveData: competitiveRes.data }));
                } catch (err) {
                    console.error("Failed to fetch competitive analysis data:", err);
                }
            };
            fetchCompetitiveData();
        }
    }, [isLoggedIn, filters.city]); // Re-runs whenever the city filter changes

    useEffect(() => {
        let data = dashboardData.analyticsData ? [...dashboardData.analyticsData] : [];
        if (filters.city !== 'All') data = data.filter(item => item.city === filters.city);
        if (filters.emotion !== 'All') data = data.filter(item => item.emotion === filters.emotion);
        if (searchTerm) data = data.filter(item => item.text.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredData(data);
    }, [filters, searchTerm, dashboardData.analyticsData]);

    const handleChartClick = (emotion) => setFilters(prev => ({ ...prev, emotion }));

    if (loadingAuth || (isLoggedIn && loadingData)) {
        return <div className="flex justify-center items-center h-screen text-2xl">Loading Political War Room...</div>;
    }
    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
    }
    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <header className="bg-white shadow"><div className="max-w-7xl mx-auto py-6 px-4"><h1 className="text-3xl font-bold text-gray-900">LokDarpan: Political War Room</h1></div></header>
            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <Dashboard
                        filteredData={filteredData}
                        allData={dashboardData.analyticsData}
                        geoJsonData={dashboardData.geoJsonData}
                        competitiveData={dashboardData.competitiveData}
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