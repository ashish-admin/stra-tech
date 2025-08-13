import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { partyColors } from '../theme';

// Register Chart.js bar components.  Without these registrations the
// benchmark chart will not render.
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Renders a horizontal bar chart indicating the proportion of positive
 * sentiment for each competitor.  Positive sentiment is defined as
 * the sum of counts for Joy, Positive, Hope and related emotions.
 * Negative sentiment includes Anger, Frustration, Sadness, Fear and
 * related categories.  The chart displays the percentage of
 * positive posts out of all sentiment‑bearing posts for each
 * competitor.  If no competitive data exists for the selected city,
 * the component returns null.
 */
const CompetitorBenchmark = ({ analysisData }) => {
  if (!analysisData || Object.keys(analysisData).length === 0) {
    return null;
  }

  // Define which emotion labels count as positive or negative.  This
  // simple classification can be refined as more granular sentiment
  // categories are introduced.
  const positiveEmotions = [
    'Joy',
    'Positive',
    'Hope',
    'Pride/Positive affirmation',
    'Hopeful/Optimistic',
    'Confidence/Assurance',
    'Pride/Approval'
  ];
  const negativeEmotions = [
    'Anger',
    'Frustration',
    'Sadness',
    'Fear',
    'Disappointment',
    'Confusion',
    'Defensiveness'
  ];

  const labels = Object.keys(analysisData);
  // Compute positive ratio for each competitor
  const ratios = labels.map((label) => {
    const counts = analysisData[label];
    let pos = 0;
    let neg = 0;
    Object.entries(counts).forEach(([emotion, count]) => {
      // Check if the emotion name contains any positive category
      if (positiveEmotions.some((posLabel) => emotion.toLowerCase().includes(posLabel.toLowerCase()))) {
        pos += count;
      } else if (negativeEmotions.some((negLabel) => emotion.toLowerCase().includes(negLabel.toLowerCase()))) {
        neg += count;
      }
    });
    const total = pos + neg;
    const ratio = total > 0 ? (pos / total) * 100 : 0;
    return { label, ratio };
  });

  const chartData = {
    labels: ratios.map((r) => r.label),
    datasets: [
      {
        label: 'Positive Sentiment (%)',
        data: ratios.map((r) => r.ratio),
        backgroundColor: ratios.map((r) => partyColors[r.label] || '#6366F1')
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    scales: {
      x: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Positive Sentiment (%)'
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.x.toFixed(1)}% positive`
        }
      },
      title: {
        display: true,
        text: 'Competitor Benchmark (Positive Sentiment Ratio)'
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div style={{ height: '250px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CompetitorBenchmark;