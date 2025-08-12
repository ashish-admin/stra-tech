import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CompetitiveAnalysis = ({ analysisData }) => {
    // No internal useEffect for data fetching

    if (!analysisData) {
        return <div className="text-center p-4">Loading analysis...</div>;
    }
    
    const labels = Object.keys(analysisData);
    const emotions = ['Joy', 'Anger', 'Sadness', 'Fear', 'Surprise', 'Neutral'];
    const colors = { /* Your color palette */ };

    const chartData = {
        labels,
        datasets: emotions.map(emotion => ({
            label: emotion,
            data: labels.map(label => analysisData[label][emotion] || 0),
            backgroundColor: colors[emotion],
        })),
    };

    const options = {
        indexAxis: 'y',
        scales: { x: { stacked: true }, y: { stacked: true } },
        responsive: true,
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default CompetitiveAnalysis;