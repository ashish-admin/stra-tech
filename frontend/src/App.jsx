import React, { useEffect, useState } from "react";
import "./index.css";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Dashboard from "./components/Dashboard.jsx";
import LoginPage from "./components/LoginPage.jsx";

import { WardProvider } from "./context/WardContext.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { joinApi, fetchJson } from "./lib/api";

// Enhanced error reporting system
import { useErrorReporting, useErrorMetrics } from "./hooks/useErrorReporting.js";

const queryClient = new QueryClient();

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState(null);

  // Initialize error reporting and metrics
  useErrorReporting();
  useErrorMetrics();

  async function checkSession() {
    try {
      const data = await fetchJson("api/v1/status");
      setIsAuthed(!!data?.authenticated);
      setUser(data?.user || null);
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
    await fetchJson("api/v1/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    await checkSession();
  }

  if (!authChecked) {
    return <div className="p-6">Checking session…</div>;
  }

  if (!isAuthed) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WardProvider>
        <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-screen-2xl">
          <header className="py-4">
            <h1 className="text-xl font-semibold">LokDarpan: Political War Room</h1>
            {user && (
              <div className="text-xs text-gray-500 mt-1">
                Signed in as <span className="font-medium">{user.username || "user"}</span>
              </div>
            )}
          </header>
          <ErrorBoundary>
            <Dashboard currentUser={user} />
          </ErrorBoundary>
        </div>
      </WardProvider>
    </QueryClientProvider>
  );
}
