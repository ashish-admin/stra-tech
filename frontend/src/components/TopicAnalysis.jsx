import React, { useMemo } from 'react';

const stopwords = new Set([ /* …stopwords list… */ ]);

const TopicAnalysis = ({ data, numTopics = 5 }) => {
  const topKeywords = useMemo(() => {
    // frequency logic…
  }, [data, numTopics]);

  if (!data || data.length === 0) {
    return null;
  }

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
