/**
 * Axios instance pre-configured for the FastAPI backend.
 *
 * - baseURL points to /api/v1 (or root fallback)
 * - Request interceptor injects the stored JWT on every call
 * - Response interceptor globally handles 401 (token expired -> logout)
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

  return url
}

const BASE_URL = resolveBaseUrl()

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,   // 60 s - generous for Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
})

/* -- Request interceptor - attach Bearer token -------------------------- */
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

/* -- Response interceptor - handle 401 globally ------------------------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and reload to /login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(err, fallback = 'An unexpected error occurred.') {
  // 1. Render no-server or plain text 404 "Not Found"
  const isPlainTextNotFound =
    typeof err?.response?.data === 'string' &&
    err?.response?.data.trim().toLowerCase() === 'not found'
  const isRenderNoServer = err?.response?.headers?.['x-render-routing'] === 'no-server'

  if (isRenderNoServer || isPlainTextNotFound) {
    return 'Backend service not found on Render (404 Not Found). Please ensure your backend is deployed and active on Render.com, and verify VITE_API_BASE_URL in Vercel settings.'
  }

  // 2. Generic 404 endpoint not found
  if (err?.response?.status === 404 || err?.response?.data?.detail === 'Not Found') {
    return 'Backend endpoint not found (404). Please ensure the backend is running and your API URL is correct.'
  }

  // 3. Render cold-start timeout
  if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase().includes('timeout')) {
    return 'Connection timed out. On Render free tier, the backend spins down after inactivity and takes ~45 seconds to wake up. Please wait a moment and try again.'
  }

  // 4. FastAPI detail response
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

  // 5. Network / CORS error
  if (!err?.response && (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK')) {
    return 'Unable to connect to the backend server. The backend might still be starting up on Render (free tier cold-start takes ~45s), or VITE_API_BASE_URL is unreachable.'
  }

  if (err?.message?.includes("Failed to construct 'URL'") || err?.message?.includes('Invalid URL')) {
    return "Invalid backend URL in Vercel. In Vercel Settings -> Environment Variables, replace '<your-backend>' with your actual Render service URL (e.g. https://log-security-backend.onrender.com/api/v1) without '<' or '>' brackets."
  }

  if (err?.response?.status === 405) {
    return 'Backend API is not reachable (HTTP 405). Please set VITE_API_BASE_URL in your Vercel project environment variables to point to your backend API.'
  }

  if (err?.message) return err.message
  return fallback
}

export default api
