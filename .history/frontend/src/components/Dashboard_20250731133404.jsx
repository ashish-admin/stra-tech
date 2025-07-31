import React from "react";
import EmotionChart from "./EmotionChart";
import LocationMap from "./LocationMap";
import DataTable from "./DataTable";

const Dashboard = ({ data }) => {
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700">
        LokDarpan: Discourse Analytics
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <EmotionChart data={data} />
        <LocationMap data={data} />
      </div>
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Raw Data</h2>
        <DataTable data={data} />
      </div>
    </div>
  );
};

export default Dashboard;