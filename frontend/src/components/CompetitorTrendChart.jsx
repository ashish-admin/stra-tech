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
import { partyColors } from '../theme';

// Register Chart.js line components.  Without registering these
// elements the competitor trend chart will not render.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Displays a multi‑line chart of daily post counts per competitor
 * (author/party).  Each line represents a competitor and uses the
 * partyColours palette for its colour.  The component expects an
 * array of posts filtered by ward and optionally by emotion and
 * keyword.  If no data exists, a message is shown instead of an
 * empty chart.
 */
const CompetitorTrendChart = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div>No competitor trend data available for the selected ward.</div>;
  }

  // Aggregate counts per date and competitor (author)
  const dateSet = new Set();
  const series = {};
  data.forEach((post) => {
    if (!post.created_at || !post.author) return;
    const date = post.created_at.slice(0, 10);
    dateSet.add(date);
    const author = post.author;
    if (!series[author]) series[author] = {};
    series[author][date] = (series[author][date] || 0) + 1;
  });

  const dates = Array.from(dateSet).sort();
  const datasets = Object.keys(series).map((author) => ({
    label: author,
    data: dates.map((d) => series[author][d] || 0),
    borderColor: partyColors[author] || '#6366F1',
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
      title: { display: true, text: 'Share of Voice Trend' }
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Number of Posts' }, beginAtZero: true }
    }
  };

  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default CompetitorTrendChart;