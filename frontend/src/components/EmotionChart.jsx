// frontend/src/components/EmotionChart.jsx

import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const EmotionChart = ({ data, handleChartClick }) => {
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
                // FIX: New, more insightful color palette
                backgroundColor: [
                    '#10B981', // Green: Joy/Positivity
                    '#EF4444', // Red: Anger/Frustration
                    '#3B82F6', // Blue: Sadness
                    '#8B5CF6', // Purple: Fear
                    '#F59E0B', // Amber: Surprise
                    '#6B7280', // Gray: Neutral
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