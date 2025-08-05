import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'tailwindcss/tailwind.css';

import Header from './components/Header';
import LocationMap from './components/LocationMap';
import DataTable from './components/DataTable';
import StrategicSummary from './components/StrategicSummary';
import CompetitiveAnalysis from './components/CompetitiveAnalysis'; // Import the new component

function App() {
  const [posts, setPosts] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);

  useEffect(() => {
    // Fetch all posts on initial load
    axios.get('/api/v1/posts')
      .then(response => {
        setPosts(response.data);
      })
      .catch(error => {
        console.error("There was an error fetching the posts data!", error);
      });
  }, []);

  const handleWardSelect = (ward) => {
    setSelectedWard(ward);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />
      <main className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Row */}
        <div className="h-[60vh]">
          <LocationMap posts={posts} setSelectedWard={handleWardSelect} selectedWard={selectedWard} />
        </div>
        <div className="h-[60vh] flex flex-col gap-4">
          <div className="flex-1">
             {/* New Competitive Analysis Component */}
            <CompetitiveAnalysis />
          </div>
          <div className="flex-1">
            <StrategicSummary ward={selectedWard} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="lg:col-span-2 h-[40vh] mt-4">
          <DataTable posts={posts} onRowClick={handleWardSelect} selectedWard={selectedWard} />
        </div>
      </main>
    </div>
  );
}

export default App;