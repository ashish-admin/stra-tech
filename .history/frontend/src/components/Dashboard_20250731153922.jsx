import EmotionChart from './EmotionChart';
import LocationMap from './LocationMap';
import DataTable from './DataTable';

function Dashboard({ data, allData, filters, setFilters }) {
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

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map takes up 2/3 of the width on large screens */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Posts Map (Telangana)</h3>
          <LocationMap data={data} />
        </div>
        
        {/* Chart takes up 1/3 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Emotion Distribution</h3>
          <EmotionChart data={data} />
        </div>

        {/* Table takes up the full width on the next row */}
        <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Data View</h3>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;