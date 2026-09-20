/**
 * Axios instance pre-configured for the FastAPI backend.
 *
 * - baseURL points to /api/v1 (Vite proxy forwards to localhost:8000)
 * - Request interceptor injects the stored JWT on every call
 * - Response interceptor globally handles 401 (token expired → logout)
 */

import axios from 'axios'

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (!envUrl || typeof envUrl !== 'string') return '/api/v1'
  let url = envUrl.trim().replace(/^['"]|['"]$/g, '')
  if (!url || url === '/api/v1') return '/api/v1'

  // If user pasted placeholder with brackets, fallback safely
  if (url.includes('<') || url.includes('>')) {
    console.warn('VITE_API_BASE_URL contains placeholder brackets "< >". Falling back to /api/v1.')
    return '/api/v1'
  }

  // Prepend https:// if protocol is missing
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = 'https://' + url
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '')

  // If user provided origin without /api/v1, auto-append /api/v1
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`
  }

  // Validate URL structure
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url)
    }
  } catch (e) {
    console.warn('Invalid VITE_API_BASE_URL provided:', url, e)
    return '/api/v1'
  }

  return url
}

const BASE_URL = resolveBaseUrl()

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

export function getErrorMessage(err, fallback = 'An unexpected error occurred.') {
  if (err?.response?.status === 404 || err?.response?.data?.detail === 'Not Found') {
    return 'Backend endpoint not found (404). Please ensure VITE_API_BASE_URL ends with /api/v1 (e.g. https://your-backend.onrender.com/api/v1).'
  }
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
      .join(', ')
  }
  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail)
  }
  if (!err?.response && (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK')) {
    return 'Unable to connect to the backend server. Please verify the API is running.'
  }
  if (err?.message?.includes("Failed to construct 'URL'") || err?.message?.includes('Invalid URL')) {
    return "Invalid backend URL in Vercel. In your Vercel Settings -> Environment Variables, replace '<your-backend>' with your actual Render service URL (e.g. https://your-backend-name.onrender.com/api/v1) without '<' or '>' brackets."
  }
  if (err?.response?.status === 405) {
    return 'Backend API is not reachable (HTTP 405). Please set VITE_API_BASE_URL in your Vercel project environment variables to point to your backend API.'
  }
  if (err?.message) return err.message
  return fallback
}

export default api

