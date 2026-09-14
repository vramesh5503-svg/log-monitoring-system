/** Alert API calls. */
import api from './api'

export const alertService = {
  /** GET /alerts — paginated + filtered list */
  getAlerts:   (params = {}) => api.get('/alerts', { params }),

  /** GET /alerts/summary — counts by type */
  getSummary:  () => api.get('/alerts/summary'),

  /** GET /alerts/critical — latest CRITICAL alerts */
  getCritical: (limit = 50) => api.get('/alerts/critical', { params: { limit } }),
}

