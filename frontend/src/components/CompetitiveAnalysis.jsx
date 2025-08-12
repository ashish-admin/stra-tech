// frontend/src/components/CompetitiveAnalysis.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CompetitiveAnalysis = () => {
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
            try {
                const response = await axios.get(`${apiUrl}/api/v1/competitive-analysis`);
                const data = response.data;

                // Format the data for Chart.js
                setChartData({
                    labels: data.map(item => item.source),
                    datasets: [{
                        label: 'Volume of Mentions by Source',
                        data: data.map(item => item.count),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                    }]
                });
            } catch (err) {
                console.error("Failed to fetch competitive analysis data:", err);
                setError("Could not load competitive analysis.");
            }
        };

        fetchData();
    }, []);

    if (error) {
        return <div className="p-4 text-red-500 bg-red-100 rounded-md">{error}</div>;
    }

    if (!chartData) {
        return <div className="p-4 text-center text-gray-500">Loading analysis...</div>;
    }

    const options = {
        indexAxis: 'y', // Makes the bar chart horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default CompetitiveAnalysis;