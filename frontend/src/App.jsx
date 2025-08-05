import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'tailwindcss/tailwind.css';

// Import all components
import LocationMap from './components/LocationMap';
import DataTable from './components/DataTable';
import StrategicSummary from './components/StrategicSummary';
import CompetitiveAnalysis from './components/CompetitiveAnalysis';
import AlertsPanel from './components/AlertsPanel'; // Import the new panel

function App() {
    const [posts, setPosts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedWard, setSelectedWard] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis'); // For the new tabbed view
    const [newAlert, setNewAlert] = useState(null); // To trigger alert refetching

    useEffect(() => {
        axios.get('/api/v1/posts')
            .then(response => setPosts(response.data))
            .catch(error => {
                console.error("Error fetching posts data!", error);
                setPosts([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleWardSelect = (ward) => {
        setSelectedWard(ward);
    };

    const handleAnalysisComplete = (alertData) => {
        // This function will be called from the summary component
        // to signal that a new alert was created and the panel should refresh.
        setNewAlert(alertData);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
                    <h2 className="text-2xl font-semibold mt-6 text-gray-700">Loading LokDarpan Dashboard...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-center text-gray-800 p-4 bg-white shadow-md">LokDarpan Dashboard</h1>
            <main className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="h-[60vh]">
                    <LocationMap posts={posts || []} setSelectedWard={handleWardSelect} selectedWard={selectedWard} />
                </div>
                
                {/* Right Column */}
                <div className="h-[60vh] flex flex-col gap-4">
                    {/* Top Right: Tabbed View */}
                    <div className="bg-white rounded-lg shadow flex-1 flex flex-col">
                        <div className="flex border-b">
                            <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'analysis' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Competitive Analysis</button>
                            <button onClick={() => setActiveTab('alerts')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'alerts' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Proactive Alerts</button>
                        </div>
                        <div className="flex-grow p-4 overflow-hidden">
                            {activeTab === 'analysis' && <CompetitiveAnalysis />}
                            {activeTab === 'alerts' && <AlertsPanel newAlert={newAlert} />}
                        </div>
                    </div>
                    {/* Bottom Right: Strategic Summary */}
                    <div className="flex-1">
                        <StrategicSummary ward={selectedWard} onAnalysisComplete={handleAnalysisComplete} />
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="lg:col-span-2 h-[40vh] mt-4">
                    <DataTable posts={posts || []} onRowClick={handleWardSelect} selectedWard={selectedWard} />
                </div>
            </main>
        </div>
    );
}

export default App;