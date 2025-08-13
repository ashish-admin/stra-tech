import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import emotionColors, { partyColors } from '../theme';

// Register necessary chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Displays a stacked horizontal bar chart showing the sentiment breakdown
 * (share of voice) for each author.  Each bar is stacked by emotion
 * using colours defined in the theme.  Clicking on a bar invokes
 * handleCompetitorClick with the selected author.
 */
const CompetitiveAnalysis = ({ analysisData, handleCompetitorClick }) => {
  // If there is no competitive analysis data for the selected ward,
  // display a message rather than leaving the user waiting.  This
  // typically happens when there are no posts from that ward.
  if (!analysisData || Object.keys(analysisData).length === 0) {
    return <div>No competitive analysis available for the selected ward.</div>;
  }

  const labels = Object.keys(analysisData);
  // Determine the union of all emotions present in the dataset
  const emotions = Array.from(new Set(
    labels.flatMap(label => Object.keys(analysisData[label]))
  ));

  // Construct a dataset for each emotion.  Instead of a single colour for the
  // entire emotion series, we assign a colour per bar using the partyColours
  // mapping.  This way each party's segment is consistently coloured while
  // still showing the sentiment breakdown.
  const chartData = {
    labels,
    datasets: emotions.map((emotion) => ({
      label: emotion,
      data: labels.map((label) => analysisData[label][emotion] || 0),
      // Assign a colour per bar: use the party colour if defined, otherwise
      // fall back to the emotion colour or neutral.
      backgroundColor: labels.map(
        (label) => partyColors[label] || emotionColors[emotion] || emotionColors.Neutral
      )
    }))
  };

  const options = {
    indexAxis: 'y',
    scales: { x: { stacked: true }, y: { stacked: true } },
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const chartElement = elements[0];
        const label = chartData.labels[chartElement.index];
        if (handleCompetitorClick) handleCompetitorClick(label);
      }
    }
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CompetitiveAnalysis;