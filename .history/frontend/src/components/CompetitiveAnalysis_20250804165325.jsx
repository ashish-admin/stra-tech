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
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/v1/competitive-analysis');
        const data = response.data;

        // Process data for the chart
        const allEmotions = new Set([
          ...Object.keys(data.Client.emotions),
          ...Object.keys(data.Opposition.emotions)
        ]);
        const labels = Array.from(allEmotions);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Client',
              data: labels.map(emotion => data.Client.emotions[emotion] || 0),
              backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
            {
              label: 'Opposition',
              data: labels.map(emotion => data.Opposition.emotions[emotion] || 0),
              backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
            }
          ]
        });
      } catch (err) {
        setError('Failed to load competitive analysis data.');
        console.error(err);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Competitive Analysis: Emotion Distribution by Affiliation',
        font: {
          size: 18
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

  return (
    <div className="bg-white p-6 shadow rounded-lg h-full">
      {error && <p className="text-red-500">{error}</p>}
      {!chartData && !error && <p>Loading analysis...</p>}
      {chartData && (
        <div style={{ height: '400px' }}>
            <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
};

export default CompetitiveAnalysis;