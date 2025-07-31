import React, { useEffect, useState } from "react";
import axios from "axios";
import Dashboard from "./components/Dashboard";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios
      .get("/api/v1/analytics")
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-xl font-semibold">Loading analytics...</span>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100">
      <Dashboard data={data} />
    </div>
  );
}

export default App;