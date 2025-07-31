import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function EmotionChart({ data }) {
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
          'rgba(26, 188, 156, 0.7)', // Hope (Teal)
          'rgba(231, 76, 60, 0.7)',  // Anger (Red)
          'rgba(52, 152, 219, 0.7)', // Joy (Blue)
          'rgba(241, 196, 15, 0.7)', // Anxiety (Yellow)
          'rgba(155, 89, 182, 0.7)', // Sadness (Purple)
          'rgba(149, 165, 166, 0.7)' // Neutral (Grey)
        ],
        borderColor: [
          'rgba(22, 160, 133, 1)',
          'rgba(192, 57, 43, 1)',
          'rgba(41, 128, 185, 1)',
          'rgba(243, 156, 18, 1)',
          'rgba(142, 68, 173, 1)',
          'rgba(127, 140, 141, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true, // This makes the chart responsive
    maintainAspectRatio: true, // Maintains aspect ratio while resizing
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
}

export default EmotionChart;