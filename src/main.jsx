import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/public-redesign.css'
import '@/desktop.css'
import '@/mobile-music.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Deliver the replacement worker to installs that still have the old offline page.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}