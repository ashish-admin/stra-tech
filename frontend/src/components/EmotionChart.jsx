// frontend/src/components/EmotionChart.jsx

import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const EmotionChart = ({ data, handleChartClick }) => {
    // --- THE FIX IS HERE ---
    // This guard clause prevents the component from crashing if data hasn't loaded yet.
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500">Loading chart data...</div>;
    }

    const emotionCounts = data.reduce((acc, item) => {
        acc[item.emotion] = (acc[item.emotion] || 0) + 1;
        return acc;
    }, {});

    const chartData = {
        labels: Object.keys(emotionCounts),
        datasets: [
            {
                label: '# of Posts',
                data: Object.values(emotionCounts),
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // Joy
                    'rgba(255, 99, 132, 0.6)', // Anger
                    'rgba(255, 206, 86, 0.6)', // Sadness
                    'rgba(153, 102, 255, 0.6)',// Fear
                    'rgba(54, 162, 235, 0.6)', // Surprise
                    'rgba(255, 159, 64, 0.6)'  // Neutral
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const chartElement = elements[0];
                const label = chartData.labels[chartElement.index];
                if(handleChartClick) {
                    handleChartClick(label);
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
    };

    return (
        <div style={{ height: '300px' }}>
            <Pie data={chartData} options={options} />
        </div>
    );
};

export default EmotionChart;