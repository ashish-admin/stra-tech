// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// (optional) devtools
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Component failure testing tools (development only)
import { addFailureControls } from "./utils/componentFailureSimulator.js";
if (import.meta.env.DEV) {
  addFailureControls();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // feel free to tweak later
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  </React.StrictMode>
);
