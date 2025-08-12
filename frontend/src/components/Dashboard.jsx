import React from 'react';
import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import DataTable from './DataTable';
import StrategicSummary from './StrategicSummary';
import CompetitiveAnalysis from './CompetitiveAnalysis';

function Dashboard({
    filteredData,
    allData,
    geoJsonData,
    competitiveData,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    handleChartClick
}) {
    const emotions = ['All', ...new Set(allData.map(item => item.emotion))];
    const cities = ['All', ...new Set(allData.map(item => item.city))];

    const handleFilterChange = (e) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="space-y-6">
            {/* Filter Controls Section */}
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="emotion" className="block text-sm font-medium text-gray-700">Emotion</label>
                        <select
                            id="emotion"
                            name="emotion"
                            value={filters.emotion}
                            onChange={handleFilterChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            {emotions.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ward</label>
                        <select
                            id="city"
                            name="city"
                            value={filters.city}
                            onChange={handleFilterChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2 md:col-span-1">
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700">Keyword Search</label>
                        <input
                            type="text"
                            id="search"
                            name="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="e.g., roads, festival"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Geospatial Intelligence</h3>
                        <LocationMap geoJsonData={geoJsonData} setFilters={setFilters} />
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">On-Demand Strategic Summary</h3>
                        <StrategicSummary />
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Overview</h3>
                        <EmotionChart data={allData} handleChartClick={handleChartClick} />
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Competitive Analysis</h3>
                        <CompetitiveAnalysis analysisData={competitiveData} />
                    </div>
                </div>

                <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Actionable Intelligence Feed</h3>
                    <DataTable data={filteredData} />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;