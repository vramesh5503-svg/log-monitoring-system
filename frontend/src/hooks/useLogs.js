/**
 * useLogs — paginated, filtered log list with debounced search.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logService } from '../services/logService'

const DEFAULT_FILTERS = {
  search:     '',
  severity:   '',
  event_type: '',
  source_ip:  '',
  sort_desc:  true,
}

export function useLogs(pageSize = 50) {
  const [logs,       setLogs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Debounce search input — only fire after 400 ms of silence
  const debounceRef = useRef(null)

  const fetchLogs = useCallback(async (currentPage, currentFilters) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        ...currentFilters,
      }
      // Drop empty strings so they don't override server defaults
      Object.keys(params).forEach((k) => {
        if (params[k] === '') delete params[k]
      })
      params.page = currentPage

      const { data } = await logService.getLogs(params)
      setLogs(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load logs.')
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Re-fetch when page or filters change
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchLogs(page, filters)
    }, filters.search ? 400 : 0)

    return () => clearTimeout(debounceRef.current)
  }, [page, filters, fetchLogs])

  const updateFilter = useCallback((key, value) => {
    setPage(1)  // reset to first page on filter change
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setPage(1)
    setFilters(DEFAULT_FILTERS)
  }, [])

  return {
    logs, total, totalPages, page, filters, loading, error,
    setPage, updateFilter, resetFilters,
    refresh: () => fetchLogs(page, filters),
  }
}

