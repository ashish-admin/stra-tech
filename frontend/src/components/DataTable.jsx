import React, { useState } from 'react';

const DataTable = ({ data }) => {
    const [selectedItem, setSelectedItem] = useState(null);

    if (!Array.isArray(data)) return <div>Loading feed...</div>;
    
    // A simple mapping for colors - you can expand this
    const emotionColorMap = {
        'Joy': 'green',
        'Anger': 'red',
        'Sadness': 'blue',
        'Fear': 'purple',
        'Surprise': 'yellow',
        'Neutral': 'gray',
        'Frustration': 'red',
        'Positive': 'green'
    };

    return (
        <div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">News Highlight</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detected Emotion</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => (
                        <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{item.text.substring(0, 100)}...</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.author_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.city}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${emotionColorMap[item.emotion]}-100 text-${emotionColorMap[item.emotion]}-800`}>
                                    {item.emotion}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* A modal for detailed view can be implemented here, triggered by 'selectedItem' */}
        </div>
    );
};

export default DataTable;