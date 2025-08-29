import React, { useState } from 'react';
import emotionColors from '../theme';

/**
 * Renders a table of raw data entries.  Clicking a row can trigger
 * selection for a modal or deeper view (not implemented here).  Each
 * row shows a truncated text snippet, the source author, the ward,
 * and a coloured tag representing the detected emotion.
 */
const DataTable = ({ data }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  if (!Array.isArray(data)) return <div>Loading feed...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">News Highlight</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detected Emotion</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => setSelectedItem(item)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td className="px-4 py-2 text-sm text-gray-700">
                {item.text && item.text.length > 100
                  ? `${item.text.substring(0, 100)}...`
                  : item.text}
              </td>
              <td className="px-4 py-2 text-sm text-gray-700">{item.author_name}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{item.city}</td>
              <td className="px-4 py-2 text-sm font-semibold">
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: emotionColors[item.emotion] || emotionColors.Neutral,
                    color: '#fff'
                  }}
                >
                  {item.emotion}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* A modal for detailed view can be implemented here, triggered by selectedItem */}
    </div>
  );
};

export default DataTable;