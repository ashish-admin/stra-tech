import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import DataTable from './DataTable';

// The Dashboard now receives more props for filtering
function Dashboard({ data, allData, filters, setFilters }) {

  // Dynamically get unique emotions and cities from the full dataset for the dropdowns
  const emotions = ['All', ...new Set(allData.map(item => item.emotion))];
  const cities = ['All', ...new Set(allData.map(item => item.city))];

  const handleFilterChange = (e) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div>
      {/* New Filter Controls Section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <h3 className="text-lg font-semibold text-gray-800 col-span-1 md:col-span-3">Filters</h3>
          
          {/* Emotion Dropdown */}
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

          {/* City Dropdown */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
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
        </div>
      </div>

      {/* Existing Dashboard Components */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Posts Map (Telangana)</h3>
          <LocationMap data={data} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Emotion Distribution</h3>
          <EmotionChart data={data} />
        </div>
        <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Data View</h3>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;