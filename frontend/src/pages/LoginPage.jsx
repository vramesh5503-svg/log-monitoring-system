/**
 * LoginPage — public route at /login
 *
 * Features:
 *  - Email/username + password form with validation
 *  - Shows/hides password toggle
 *  - Loading state during API call
 *  - Redirects to /dashboard (or previous location) on success
 *  - Cybersecurity glassmorphism theme with animated background
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiShield, FiUser, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import { getErrorMessage } from '../services/api'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Redirect back to the page that required auth, default → dashboard
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const [form, setForm]         = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleChange = (e) => {
    setError('')
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username/email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await authService.login(form)
      login(data)
      toast.success(`Welcome back, ${data.user.username}!`)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err, 'Login failed. Check your credentials.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center px-4 relative overflow-hidden">

      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%2338bdf8%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Card */}
      <div className="relative w-full max-w-md">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 mb-4">
            <FiShield className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Log Security Monitor</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your security dashboard</p>
        </div>

        {/* Glass card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Welcome back</h2>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 mb-5 text-rose-400 text-sm animate-fade-in">
              <FiAlertCircle className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Username / Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="username">
                Username or Email
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="username or email"
                  value={form.username}
                  onChange={handleChange}
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Credentials hint */}
          <div className="mt-4 p-3 bg-sky-500/5 border border-sky-500/10 rounded-lg space-y-1">
            <p className="text-xs text-slate-400 text-center font-medium">Available Credentials:</p>
            <p className="text-xs text-slate-500 text-center">
              Login ID: <span className="text-sky-400 font-mono">admin</span> &bull; Pass: <span className="text-sky-400 font-mono">Admin@12345</span>
            </p>
            <p className="text-xs text-slate-500 text-center">
              Login ID: <span className="text-sky-400 font-mono">security_admin</span> &bull; Pass: <span className="text-sky-400 font-mono">Admin@2026!</span>
            </p>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

