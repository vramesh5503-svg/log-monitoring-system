/**
 * Application entry point.
 * Wraps the app in React Router and the global AuthProvider,
 * then mounts into #root.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* Global toast notifications â€” dark cybersecurity theme */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22d3ee', secondary: '#0f172a' } },
            error:   { iconTheme: { primary: '#f43f5e', secondary: '#0f172a' } },
          }}
        />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)


