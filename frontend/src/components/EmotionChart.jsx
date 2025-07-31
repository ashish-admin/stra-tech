import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

const EMOTION_COLORS = {
  Hope: "#34d399",
  Anger: "#f87171",
  Anxiety: "#fbbf24",
  Joy: "#60a5fa",
  Sadness: "#a78bfa",
  Neutral: "#d1d5db",
  Unknown: "#6b7280"
};

function countEmotions(data) {
  const counts = {};
  data.forEach((row) => {
    const emotion = row.emotion || "Unknown";
    counts[emotion] = (counts[emotion] || 0) + 1;
  });
  return counts;
}

const EmotionChart = ({ data }) => {
  const counts = countEmotions(data);
  const labels = Object.keys(counts);
  const chartData = {
    labels,
    datasets: [
      {
        label: "Emotion Distribution",
        data: labels.map((e) => counts[e]),
        backgroundColor: labels.map((e) => EMOTION_COLORS[e] || "#6b7280"),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Emotion Distribution</h2>
      <Doughnut data={chartData} />
    </div>
  );
};

export default EmotionChart;