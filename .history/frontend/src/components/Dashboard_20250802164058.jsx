import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import DataTable from './DataTable';
import StrategicSummary from './StrategicSummary';

function Dashboard({ data, allData, filters, setFilters, searchTerm, setSearchTerm }) {

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
      {/* Filter Controls Section (no changes) */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          {/* ... (filter and search inputs remain the same) ... */}
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* The summary now receives filters and searchTerm to become dynamic */}
        <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Strategic Briefing</h3>
          <StrategicSummary filters={filters} searchTerm={searchTerm} />
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Granular Emotion Map (GHMC Wards)</h3>
          <LocationMap />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Emotion Distribution</h3>
          <EmotionChart data={data} />
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