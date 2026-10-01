import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initErrorCapture } from '@/lib/errorLog'

// Keeps the last uncaught error around so users can attach it to a report.
initErrorCapture()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Register the offline-fallback service worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}