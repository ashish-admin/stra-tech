import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('[PWA] New content available, please refresh.');
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline.');
    },
    onRegistered(registration) {
      console.log('[PWA] Service worker registered successfully:', registration);
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  });
  
  // Store updateSW function globally for use in PWA context
  window.updateSW = updateSW;
}

// Initialize React app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);