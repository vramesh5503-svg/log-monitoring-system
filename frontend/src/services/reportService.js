/** Report and export API calls. */
import api from './api'

export const reportService = {
  /** GET /report?period=daily|weekly|monthly */
  getReport: (period = 'daily') => api.get('/report', { params: { period } }),

  /** Download CSV — returns raw blob */
  exportCsv: (period = 'daily') =>
    api.get('/export/csv', { params: { period }, responseType: 'blob' }),

  /** Download JSON — returns raw blob */
  exportJson: (period = 'daily') =>
    api.get('/export/json', { params: { period }, responseType: 'blob' }),

  /** Download PDF — returns raw blob */
  exportPdf: (period = 'daily') =>
    api.get('/export/pdf', { params: { period }, responseType: 'blob' }),
}

/** Trigger a browser download from an axios blob response. */
export function downloadBlob(response, filename) {
  const url  = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href  = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

