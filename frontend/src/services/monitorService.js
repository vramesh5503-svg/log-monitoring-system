/** Monitoring control + file upload API calls. */
import api from './api'

export const monitorService = {
  /** POST /monitor/start */
  start: (payload) => api.post('/monitor/start', payload),

  /** POST /monitor/stop */
  stop: () => api.post('/monitor/stop'),

  /** GET /monitor/status */
  status: () => api.get('/monitor/status'),

  /**
   * POST /upload-log — multipart form upload
   * @param {File} file
   * @param {Function} onProgress — called with 0-100 percent
   */
  uploadLog: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/upload-log', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
  },
}

