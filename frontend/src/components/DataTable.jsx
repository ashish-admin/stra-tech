import React, { useState } from 'react';

const DataTable = ({ data }) => {
    const [selectedItem, setSelectedItem] = useState(null);

    if (!Array.isArray(data)) return <div>Loading feed...</div>;
    
    // The Modal component for drill-down would be defined here or imported
    // For brevity, we'll just show the logic for selecting an item.

    return (
        <div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {/* More valuable headers */}
                        <th scope="col">News Highlight</th>
                        <th scope="col">Source</th>
                        <th scope="col">Ward</th>
                        <th scope="col">Detected Emotion</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => (
                        <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer hover:bg-gray-50">
                            <td>{item.text.substring(0, 100)}...</td>
                            <td>{item.author_name}</td>
                            <td>{item.city}</td>
                            <td>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${item.emotion}-100 text-${item.emotion}-800`}>
                                    {item.emotion}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Modal would be displayed here when selectedItem is not null */}
        </div>
    );
};

export default DataTable;