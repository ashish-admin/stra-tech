import React, { useState } from 'react';
import axios from 'axios';

/**
 * Simple login page component.  It sends a username and password to the
 * `/api/v1/login` endpoint.  On successful authentication it calls
 * `setIsLoggedIn(true)` on the parent.  Errors are displayed to the user.
 */
const LoginPage = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      const res = await axios.post(`${apiUrl}/api/v1/login`, {
        username,
        password
      });
      if (res.status === 200) {
        setIsLoggedIn(true);
      }
    } catch (err) {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 border rounded-md mt-12">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md">Log In</button>
      </form>
    </div>
  );
};

export default LoginPage;