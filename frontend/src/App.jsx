/**
 * Root application component.
 *
 * Defines the full route tree:
 *   /login          — public
 *   /register       — public
 *   /               — protected, redirects to /dashboard
 *   /dashboard      — protected
 *   /logs           — protected
 *   /alerts         — protected
 *   /reports        — protected
 *   /settings       — protected (admin)
 *
 * ProtectedRoute renders children only when the user is authenticated;
 * otherwise it redirects to /login, preserving the intended destination
 * in the location state so the login page can redirect back after auth.
 */

import { Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './context/AuthContext'
import Layout      from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Pages (lazy imports reduce initial bundle size)
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import LogsPage     from './pages/LogsPage'
import AlertsPage   from './pages/AlertsPage'
import ReportsPage  from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

/* ── Guard ────────────────────────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cyber-bg">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

/* ── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — wrapped in the shared Layout (sidebar + topbar) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Default → dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="logs"      element={<LogsPage />} />
        <Route path="alerts"    element={<AlertsPage />} />
        <Route path="reports"   element={<ReportsPage />} />
        <Route path="settings"  element={<SettingsPage />} />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

