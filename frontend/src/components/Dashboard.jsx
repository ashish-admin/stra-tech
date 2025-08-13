import React from 'react';
import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import DataTable from './DataTable';
import StrategicSummary from './StrategicSummary';
import CompetitiveAnalysis from './CompetitiveAnalysis';

/**
 * Presents the core dashboard layout, including filter controls
 * (emotion, ward, keyword), the map, the Area Pulse panel,
 * the sentiment overview pie chart, competitive analysis bar chart,
 * and the actionable intelligence feed.
 */
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
  const emotions = ['All', ...new Set(allData.map((item) => item.emotion))];
  const cities = ['All', ...new Set(allData.map((item) => item.city))];

  const handleFilterChange = (e) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Emotion</label>
          <select
            name="emotion"
            value={filters.emotion}
            onChange={handleFilterChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {emotions.map((e, idx) => (
              <option key={idx} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ward</label>
          <select
            name="city"
            value={filters.city}
            onChange={handleFilterChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {cities.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Keyword Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g., roads, festival"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geospatial Intelligence */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Geospatial Intelligence</h2>
          <LocationMap geoJsonData={geoJsonData} setFilters={setFilters} />
        </div>
        {/* On‑Demand Strategic Summary */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">On‑Demand Strategic Summary</h2>
          <StrategicSummary />
        </div>
      </div>

      {/* Sentiment Overview and Competitive Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Sentiment Overview</h2>
          <div style={{ height: '300px' }}>
            <EmotionChart data={filteredData} handleChartClick={handleChartClick} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Competitive Analysis</h2>
          <div style={{ height: '300px' }}>
            <CompetitiveAnalysis analysisData={competitiveData} handleCompetitorClick={(label) => setFilters((prev) => ({ ...prev, competitor: label }))} />
          </div>
        </div>
      </div>

      {/* Actionable Intelligence Feed */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Actionable Intelligence Feed</h2>
        <DataTable data={filteredData} />
      </div>
    </div>
  );
}

export default Dashboard;