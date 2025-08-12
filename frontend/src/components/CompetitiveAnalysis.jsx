import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CompetitiveAnalysis = ({ analysisData, handleCompetitorClick }) => {
    if (!analysisData || Object.keys(analysisData).length === 0) {
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
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const chartElement = elements[0];
                const label = labels[chartElement.index];
                handleCompetitorClick(label);
            }
        }
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default CompetitiveAnalysis;