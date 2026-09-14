/**
 * useDashboard — fetches aggregated stats for the dashboard overview.
 * Auto-refreshes every 30 seconds while the component is mounted.
 */

import { useState, useEffect, useCallback } from 'react'
import { logService } from '../services/logService'

export function useDashboard(refreshInterval = 30_000) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await logService.getStats()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStats, refreshInterval])

  return { stats, loading, error, refresh: fetchStats }
}

