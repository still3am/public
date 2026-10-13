import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import {LanguageProvider} from '@/lib/i18n/LanguageContext'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <LanguageProvider><App /></LanguageProvider>
)

// Register the offline-fallback service worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}