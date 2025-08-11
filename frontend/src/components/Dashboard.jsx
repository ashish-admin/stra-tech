import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import DataTable from './DataTable';
import StrategicSummary from './StrategicSummary'; // Your new component
import { useState } from 'react'; // Import useState

function Dashboard({ data, allData, filters, setFilters, searchTerm, setSearchTerm, handleChartClick }) {

  const [selectedWard, setSelectedWard] = useState(null); // State to track the clicked ward

  const emotions = ['All', ...new Set(allData.map(item => item.emotion))];
  const cities = ['All', ...new Set(allData.map(item => item.city))];

  const handleFilterChange = (e) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [e.target.name]: e.target.value
    }));
  };

  const onChartClick = (emotion) => {
    handleChartClick(emotion);
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls Section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        {/* ... (filter controls remain the same) ... */}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Granular Emotion Map (GHMC Wards)</h3>
          {/* The map now receives a function to update the selected ward */}
          <LocationMap onWardClick={setSelectedWard} />
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Emotion Distribution</h3>
          <EmotionChart data={data} onChartClick={onChartClick} />
        </div>

        {/* NEW On-Demand Analysis Widget */}
        <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md min-h-[250px]">
          {/* Pass the selected ward to your new component */}
          <StrategicSummary ward={selectedWard} onAnalysisComplete={() => { /* Can be used to update alerts */ }} />
        </div>

        <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Data View ({data.length} results)</h3>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;