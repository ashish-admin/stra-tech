// frontend/src/components/DataTable.jsx

import React from 'react';

const DataTable = ({
    data,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm
}) => {
    // --- THE FIX IS HERE ---
    // This guard clause prevents the component from crashing if the 'data' prop is not yet an array.
    if (!Array.isArray(data)) {
        return <div className="text-center text-gray-500 p-4">Loading data feed...</div>;
    }

    return (
        <div className="flex flex-col">
            {/* Filter and Search Controls can be enhanced here */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search within data feed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="p-2 border rounded w-full"
                />
            </div>
            
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Text
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Emotion
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        City
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Source
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{item.text}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.emotion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.city}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.author_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataTable;