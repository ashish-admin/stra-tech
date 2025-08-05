import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import 'tailwindcss/tailwind.css';
import { AlertTriangle } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CompetitiveAnalysis = () => {
  const [chartData, setChartData] = useState(null);
  const [apiData, setApiData] = useState(null); // Store raw API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/v1/competitive-analysis');
        setApiData(response.data);
      } catch (err) {
        setError('Failed to load competitive analysis data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // New useEffect to process data only when apiData is available
  useEffect(() => {
    if (apiData) {
      // Process data for the chart
      const allEmotions = new Set([
        ...Object.keys(apiData.Client.emotions),
        ...Object.keys(apiData.Opposition.emotions)
      ]);
      const labels = Array.from(allEmotions);

      setChartData({
        labels,
        datasets: [
          {
            label: 'Client',
            data: labels.map(emotion => apiData.Client.emotions[emotion] || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Opposition',
            data: labels.map(emotion => apiData.Opposition.emotions[emotion] || 0),
            backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          }
        ]
      });
    }
  }, [apiData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Competitive Analysis: Emotion Distribution',
        font: {
          size: 16
        }
      },
    },
    scales: {
        y: {
            beginAtZero: true,
            title: {
                display: true,
                text: 'Number of Posts'
            }
        }
    }
  };
  
  const renderContent = () => {
    if (loading) {
        return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500"></div></div>;
    }
    if (error) {
        return <div className="flex flex-col items-center justify-center h-full text-red-500"><AlertTriangle className="h-10 w-10 mb-2" /><p>{error}</p></div>;
    }
    if (chartData) {
        return <Bar data={chartData} options={options} />;
    }
    return <div className="flex items-center justify-center h-full text-gray-500"><p>No analysis data available.</p></div>;
  }

  return (
    <div className="bg-white p-4 shadow rounded-lg h-full flex flex-col">
       <h2 className="text-xl font-bold mb-2">Competitive Analysis</h2>
       <div className="flex-grow relative" style={{ minHeight: '300px' }}>
            {renderContent()}
       </div>
    </div>
  );
};

export default CompetitiveAnalysis;