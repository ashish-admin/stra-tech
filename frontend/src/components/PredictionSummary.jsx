import React from 'react';
import wardData from '../wardData';
import { partyColors } from '../theme';

/**
 * Computes simple win probability estimates for each competitor (party)
 * based on sentiment data.  The probability is proportional to the
 * product of the competitor's positive sentiment ratio and their share
 * of voice (total posts) for the selected ward.  Because we lack
 * sophisticated polling or vote history, this heuristic offers a rough
 * indicator of momentum.  The component also displays the actual
 * winning party from the 2020 GHMC election for comparison.  If
 * analysisData is empty, nothing is rendered.
 */
const PredictionSummary = ({ analysisData, selectedWard }) => {
  if (!analysisData || Object.keys(analysisData).length === 0) {
    return null;
  }

  // Define positive and negative emotion sets for scoring
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

  // Compute scores for each competitor
  const scores = {};
  let totalScore = 0;
  Object.entries(analysisData).forEach(([party, counts]) => {
    let pos = 0;
    let neg = 0;
    let total = 0;
    Object.entries(counts).forEach(([emotion, count]) => {
      total += count;
      if (positiveEmotions.some((p) => emotion.toLowerCase().includes(p.toLowerCase()))) {
        pos += count;
      } else if (negativeEmotions.some((n) => emotion.toLowerCase().includes(n.toLowerCase()))) {
        neg += count;
      }
    });
    const ratio = total > 0 ? pos / (pos + neg) : 0;
    const score = ratio * total;
    scores[party] = { ratio, total, score };
    totalScore += score;
  });

  // Derive probabilities (percentages) from scores
  const probabilities = Object.keys(scores).map((party) => {
    const { score } = scores[party];
    const prob = totalScore > 0 ? (score / totalScore) * 100 : 0;
    return { party, prob };
  });
  // Sort descending by probability
  probabilities.sort((a, b) => b.prob - a.prob);

  // Look up the actual winner from 2020 for context
  const wardName = selectedWard && selectedWard.toLowerCase() !== 'all'
    ? selectedWard.replace(/^\s*Ward\s*\d+\s+/i, '').trim()
    : null;
  const actualInfo = wardName && wardData[wardName];
  const actualWinner = actualInfo ? actualInfo.winnerParty : null;

  return (
    <div className="space-y-2 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h4 className="font-semibold text-green-800">Predicted Win Probabilities</h4>
      <ul className="space-y-1">
        {probabilities.map(({ party, prob }) => (
          <li key={party} className="flex justify-between items-center">
            <span className="flex items-center">
              {/* Colour indicator */}
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: partyColors[party] || '#6B7280' }}
              ></span>
              {party}
              {actualWinner && actualWinner.toLowerCase() === party.toLowerCase() && (
                <span className="text-xs bg-blue-100 text-blue-700 ml-2 px-1 rounded">2020 Winner</span>
              )}
            </span>
            <span>{prob.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      {actualWinner && (
        <div className="text-xs text-gray-600 mt-2">Actual winner in 2020: {actualWinner}</div>
      )}
    </div>
  );
};

export default PredictionSummary;