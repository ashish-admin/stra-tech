import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import emotionColors from '../theme';

// Register Chart.js components for a line chart.  Without registering
// these elements the chart will not render.  We use a line chart
// because it clearly shows sentiment trends over time.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Displays a multi‑line chart showing the trend of post counts by
 * emotion over time.  It accepts an array of posts (filtered by
 * city/emotion/searchTerm in the parent) and groups them by date
 * (YYYY‑MM‑DD) and emotion.  Each line represents an emotion and
 * uses the corresponding colour from the central theme.  If no
 * posts exist for the current filter, a friendly message is
 * displayed instead of a blank or infinite loading state.
 */
const TimeSeriesChart = ({ data }) => {
  // Guard against undefined or empty data
  if (!Array.isArray(data) || data.length === 0) {
    return <div>No historical trend data available for the selected ward.</div>;
  }

  // Aggregate counts of posts by date and emotion
  const dateSet = new Set();
  const series = {};
  data.forEach((post) => {
    // Extract the date part from the created_at timestamp (YYYY‑MM‑DD)
    if (!post.created_at || !post.emotion) return;
    const date = post.created_at.slice(0, 10);
    dateSet.add(date);
    const emotion = post.emotion;
    if (!series[emotion]) series[emotion] = {};
    series[emotion][date] = (series[emotion][date] || 0) + 1;
  });

  // Sort the dates chronologically.  Sorting ensures the x‑axis is
  // ordered correctly rather than by insertion order.
  const dates = Array.from(dateSet).sort();

  // Build datasets for each emotion, mapping dates to counts.  If an
  // emotion has no posts on a particular date, we insert 0 so the
  // line drops to the baseline rather than skipping that date.
  const datasets = Object.keys(series).map((emotion) => ({
    label: emotion,
    data: dates.map((d) => series[emotion][d] || 0),
    borderColor: emotionColors[emotion] || emotionColors.Neutral,
    backgroundColor: 'rgba(0,0,0,0)',
    tension: 0.3
  }));

  const chartData = {
    labels: dates,
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Sentiment Trend Over Time'
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Number of Posts'
        },
        beginAtZero: true
      }
    }
  };

  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TimeSeriesChart;