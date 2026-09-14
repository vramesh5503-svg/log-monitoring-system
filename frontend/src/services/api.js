/**
 * Axios instance pre-configured for the FastAPI backend.
 *
 * - baseURL points to /api/v1 (Vite proxy forwards to localhost:8000)
 * - Request interceptor injects the stored JWT on every call
 * - Response interceptor globally handles 401 (token expired → logout)
 */

import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,   // 30 s — generous for large file uploads
  headers: {
    'Content-Type': 'application/json',
  },
})

/* ── Request interceptor — attach Bearer token ────────────────────────── */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/* ── Response interceptor — handle 401 globally ──────────────────────── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and reload to /login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Avoid importing useNavigate here (hooks can't run outside React tree)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

