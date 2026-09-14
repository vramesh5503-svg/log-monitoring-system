/** Log API calls. */
import api from './api'

export const logService = {
  /** GET /logs — paginated + filtered list */
  getLogs: (params = {}) => api.get('/logs', { params }),

  /** GET /logs/stats — dashboard statistics */
  getStats: () => api.get('/logs/stats'),

  /** GET /logs/:id — single log detail */
  getLog: (id) => api.get(`/logs/${id}`),

  /** DELETE /logs/:id — admin only */
  deleteLog: (id) => api.delete(`/logs/${id}`),
}

