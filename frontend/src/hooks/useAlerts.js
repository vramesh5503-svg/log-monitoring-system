/**
 * useAlerts — fetches alert list + summary counts.
 */

import { useState, useEffect, useCallback } from 'react'
import { alertService } from '../services/alertService'
import { getErrorMessage } from '../services/api'

export function useAlerts(pageSize = 50) {
  const [alerts,     setAlerts]     = useState([])
  const [summary,    setSummary]    = useState(null)
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [filters,    setFilters]    = useState({ alert_type: '', severity: '' })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.alert_type) params.alert_type = filters.alert_type
      if (filters.severity)   params.severity   = filters.severity

      const [alertRes, summaryRes] = await Promise.all([
        alertService.getAlerts(params),
        alertService.getSummary(),
      ])

      setAlerts(alertRes.data.items)
      setTotal(alertRes.data.total)
      setTotalPages(alertRes.data.total_pages)
      setSummary(summaryRes.data)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load alerts.'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const updateFilter = useCallback((key, value) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  return {
    alerts, summary, total, totalPages, page, filters, loading, error,
    setPage, updateFilter,
    refresh: fetchData,
  }
}

