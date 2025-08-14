import React, { useEffect, useState } from "react";
import axios from "axios";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Dashboard from "./components/Dashboard.jsx";
import LoginPage from "./components/LoginPage.jsx";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState(null);

  async function checkSession() {
    try {
      const r = await axios.get(`${apiBase}/api/v1/status`, { withCredentials: true });
      setIsAuthed(!!r.data?.authenticated);
      setUser(r.data?.user || null);
    } catch {
      setIsAuthed(false);
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin({ username, password }) {
    await axios.post(
      `${apiBase}/api/v1/login`,
      { username, password },
      { withCredentials: true }
    );
    await checkSession();
  }

  if (!authChecked) {
    return <div className="p-6">Checking session…</div>;
  }

  if (!isAuthed) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">LokDarpan: Political War Room</h1>
      <ErrorBoundary>
        <Dashboard currentUser={user} />
      </ErrorBoundary>
    </div>
  );
}
