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

                const labels = Object.keys(data);
                const emotions = ['Joy', 'Anger', 'Sadness', 'Fear', 'Surprise', 'Neutral'];
                const colors = {
                    'Joy': '#10B981',
                    'Anger': '#EF4444',
                    'Sadness': '#3B82F6',
                    'Fear': '#8B5CF6',
                    'Surprise': '#F59E0B',
                    'Neutral': '#6B7280',
                };

                setChartData({
                    labels,
                    datasets: emotions.map(emotion => ({
                        label: emotion,
                        data: labels.map(label => data[label][emotion] || 0),
                        backgroundColor: colors[emotion],
                    })),
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
        indexAxis: 'y',
        plugins: {
            title: { display: false },
            legend: { position: 'bottom', labels: { boxWidth: 12 } },
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } },
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default CompetitiveAnalysis;