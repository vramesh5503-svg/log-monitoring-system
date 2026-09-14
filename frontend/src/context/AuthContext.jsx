/**
 * AuthContext — global authentication state.
 *
 * Provides:
 *   user        — decoded user object (or null)
 *   token       — raw JWT string (or null)
 *   login(data) — store token + user after successful /auth/login call
 *   logout()    — clear state and redirect to /login
 *   loading     — true while restoring session from localStorage on mount
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)  // true on first paint

  const navigate = useNavigate()

  /* ── Restore session from localStorage on mount ──────────────────────── */
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser  = localStorage.getItem('user')

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(parsedUser)
        // Inject into axios default headers immediately
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  /* ── login ────────────────────────────────────────────────────────────── */
  const login = useCallback(({ access_token, user: userData }) => {
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }, [])

  /* ── logout ───────────────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore errors — we always clear local state
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    toast.success('Logged out successfully.')
    navigate('/login', { replace: true })
  }, [navigate])

  /* ── isAdmin helper ───────────────────────────────────────────────────── */
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Hook — must be used inside <AuthProvider> */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

