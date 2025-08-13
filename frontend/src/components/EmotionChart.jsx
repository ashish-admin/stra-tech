import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import emotionColors from '../theme';

// Register required chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Renders a pie chart summarising the distribution of emotions.
 * The colours for each emotion are pulled from a central theme file,
 * ensuring consistency across the application.  An optional
 * `handleChartClick` callback can be supplied to update filters when
 * a segment is clicked.
 */
const EmotionChart = ({ data, handleChartClick }) => {
  // If there is no data to display for the selected ward, show a friendly
  // message instead of an infinite loading spinner.  This avoids confusing
  // the user when a ward has no posts.
  if (!data || data.length === 0) {
    return <div>No sentiment data available for the selected ward.</div>;
  }

  // Compute counts per emotion
  const emotionCounts = data.reduce((acc, item) => {
    acc[item.emotion] = (acc[item.emotion] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(emotionCounts);
  const counts = Object.values(emotionCounts);

  const chartData = {
    labels,
    datasets: [
      {
        label: '# of Posts',
        data: counts,
        backgroundColor: labels.map(label => emotionColors[label] || emotionColors.Neutral),
        borderWidth: 1
      }
    ]
  };

  const options = {
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const chartElement = elements[0];
        const label = chartData.labels[chartElement.index];
        if (handleChartClick) handleChartClick(label);
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default EmotionChart;