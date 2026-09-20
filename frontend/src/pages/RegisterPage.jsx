/**
 * RegisterPage — public route at /register
 *
 * Features:
 *  - Username, email, password, confirm-password fields
 *  - Client-side validation with inline error messages
 *  - Password strength indicator
 *  - Redirects to /dashboard on success
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiShield, FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiCheck,
} from 'react-icons/fi'
import toast from 'react-hot-toast'

import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import { getErrorMessage } from '../services/api'

/* ── Password strength helper ────────────────────────────────────────────── */
function getStrength(pw) {
  let score = 0
  if (pw.length >= 8)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score   // 0-4
}

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['', 'bg-rose-500', 'bg-yellow-500', 'bg-sky-500', 'bg-emerald-500']

export default function RegisterPage() {
  const { login, user }  = useAuth()
  const navigate   = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm: '',
  })
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [errors,      setErrors]      = useState({})

  const strength = getStrength(form.password)

  const handleChange = (e) => {
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim() || form.username.length < 3)
      errs.username = 'Username must be at least 3 characters.'
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = 'Enter a valid email address.'
    if (form.password.length < 8)
      errs.password = 'Password must be at least 8 characters.'
    if (!/[0-9]/.test(form.password))
      errs.password = 'Password must contain at least one digit.'
    if (!/[a-zA-Z]/.test(form.password))
      errs.password = 'Password must contain at least one letter.'
    if (form.password !== form.confirm)
      errs.confirm = 'Passwords do not match.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await authService.register({
        username: form.username,
        email:    form.email,
        password: form.password,
      })
      // Auto-login after successful registration
      const { data } = await authService.login({
        username: form.username,
        password: form.password,
      })
      login(data)
      toast.success('Account created! Welcome aboard.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err, 'Registration failed.')
      toast.error(msg)
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Background decorations */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%2338bdf8%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 mb-4">
            <FiShield className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Join the security monitoring platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-white mb-6">New user registration</h2>

          {errors.general && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 mb-5 text-rose-400 text-sm">
              <FiAlertCircle className="shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Username */}
            <Field
              id="username" label="Username" icon={<FiUser />}
              type="text" autoComplete="username" placeholder="john_doe"
              value={form.username} onChange={handleChange}
              error={errors.username} disabled={loading}
            />

            {/* Email */}
            <Field
              id="email" label="Email address" icon={<FiMail />}
              type="email" autoComplete="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              error={errors.email} disabled={loading}
            />

            {/* Password */}
            <div>
              <Field
                id="password" label="Password" icon={<FiLock />}
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password" placeholder="Min. 8 chars with a digit"
                value={form.password} onChange={handleChange}
                error={errors.password} disabled={loading}
                suffix={
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}>
                    {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                }
              />
              {/* Strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength >= s ? strengthColor[strength] : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Strength: <span className="text-slate-300">{strengthLabel[strength]}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <Field
              id="confirm" label="Confirm password" icon={<FiLock />}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password" placeholder="Repeat your password"
              value={form.confirm} onChange={handleChange}
              error={errors.confirm} disabled={loading}
              suffix={
                form.confirm && form.confirm === form.password
                  ? <FiCheck className="w-4 h-4 text-emerald-400" />
                  : (
                    <button type="button" onClick={() => setShowConfirm((v) => !v)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label="Toggle confirm password visibility">
                      {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  )
              }
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Reusable field component (local to this file) ───────────────────────── */
function Field({ id, label, icon, type, autoComplete, placeholder, value, onChange, error, disabled, suffix }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`input-field pl-10 ${suffix ? 'pr-10' : ''} ${
            error ? 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20' : ''
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
          <FiAlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

