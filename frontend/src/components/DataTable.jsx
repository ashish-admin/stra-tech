import React from 'react';

const DataTable = ({ posts, onRowClick, selectedWard }) => {
  const filteredPosts = selectedWard ? posts.filter(p => p.ward === selectedWard) : posts;

  return (
    <div className="bg-white p-4 shadow rounded-lg overflow-auto h-full">
      <h2 className="text-xl font-bold mb-4">{selectedWard ? `Posts for ${selectedWard}` : 'All Posts'}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Ward</th>
              <th scope="col" className="px-6 py-3">Author</th>
              <th scope="col" className="px-6 py-3">Content</th>
              <th scope="col" className="px-6 py-3">Emotion</th>
              <th scope="col" className="px-6 py-3">Emotion Drivers</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map(post => (
              <tr 
                key={post.id} 
                className="bg-white border-b hover:bg-gray-50 cursor-pointer" 
                // --- FIX IS HERE: Corrected the typo from onRowCick to onRowClick ---
                onClick={() => onRowClick(post.ward)}
              >
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{post.ward}</td>
                <td className="px-6 py-4">{post.author}</td>
                <td className="px-6 py-4">{post.content}</td>
                <td className="px-6 py-4">{post.emotion}</td>
                <td className="px-6 py-4">
                  {post.drivers && post.drivers.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;