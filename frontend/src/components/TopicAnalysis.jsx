import React, { useMemo } from 'react';

// Simple stopword list to remove common words from trending analysis.  This
// could be expanded or replaced by a more robust NLP library if desired.
const stopwords = new Set([
  'the', 'and', 'to', 'of', 'in', 'for', 'on', 'with', 'a', 'an', 'is', 'are',
  'was', 'were', 'be', 'been', 'at', 'by', 'as', 'that', 'from', 'this',
  'has', 'have', 'had', 'will', 'shall', 'we', 'our', 'your', 'their', 'it',
  'there', 'here', 'which', 'so', 'not'
]);

/**
 * Computes trending keywords from the Actionable Intelligence feed for the
 * selected ward.  It tokenises the `highlight` text of each post, filters
 * stopwords and very short words, counts frequencies and displays the top
 * N keywords.  This component is purely presentational and does not
 * mutate any state.
 */
const TopicAnalysis = ({ data, numTopics = 5 }) => {
  // If data is not an array or has no items, do not render the component.  This
  // prevents errors when computing keywords on undefined or empty data.
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Memoise the frequency computation so it only recalculates when data changes
  const topKeywords = useMemo(() => {
    const counts = {};
    data.forEach((post) => {
      if (post.highlight) {
        post.highlight
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .forEach((word) => {
            if (word.length > 3 && !stopwords.has(word)) {
              counts[word] = (counts[word] || 0) + 1;
            }
          });
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, numTopics);
  }, [data, numTopics]);

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-800 mb-2">Top Topics / Keywords</h4>
      {topKeywords.length === 0 ? (
        <div>No prominent topics detected.</div>
      ) : (
        <ul className="list-decimal list-inside space-y-1 text-blue-700">
          {topKeywords.map(([word, count]) => (
            <li key={word}>
              {word} <span className="text-gray-500">({count})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopicAnalysis;