// frontend/src/components/Dashboard.jsx

import React from 'react';

// Import all required intelligence modules
import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import StrategicSummary from './StrategicSummary';
import CompetitiveAnalysis from './CompetitiveAnalysis';
import DataTable from './DataTable';

const Dashboard = ({
    data,
    allData,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    handleChartClick
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Main Visualizations */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-4 shadow rounded-lg">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">Geospatial Intelligence</h2>
                    <LocationMap />
                </div>
                <div className="bg-white p-4 shadow rounded-lg">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">On-Demand Strategic Summary</h2>
                    <StrategicSummary />
                </div>
            </div>

            {/* Right Column: Key Metrics and Competitive View */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-4 shadow rounded-lg">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">Sentiment Overview</h2>
                    <EmotionChart data={allData} handleChartClick={handleChartClick} />
                </div>
                <div className="bg-white p-4 shadow rounded-lg">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">Competitive Analysis</h2>
                    <CompetitiveAnalysis data={allData} />
                </div>
            </div>

            {/* Full Width Bottom Section: Data Table */}
            <div className="lg:col-span-3 bg-white p-4 shadow rounded-lg">
                 <h2 className="text-xl font-semibold mb-2 text-gray-800">Live Data Feed</h2>
                 <DataTable 
                    data={data} 
                    filters={filters}
                    setFilters={setFilters}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
            </div>
        </div>
    );
};

export default Dashboard;