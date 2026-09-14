/**
 * useMonitor — wraps monitoring start/stop/status API calls
 * and exposes upload progress state.
 */

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { monitorService } from '../services/monitorService'

export function useMonitor() {
  const [status,   setStatus]   = useState({ is_running: false, watch_path: null })
  const [loading,  setLoading]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  /* ── Fetch current status on mount ────────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await monitorService.status()
      setStatus(data)
    } catch {
      // Not critical — silently ignore
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  /* ── Start monitoring ─────────────────────────────────────────────────── */
  const startMonitoring = useCallback(async (payload) => {
    setLoading(true)
    try {
      const { data } = await monitorService.start(payload)
      setStatus(data)
      toast.success('Monitoring started.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start monitoring.')
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Stop monitoring ──────────────────────────────────────────────────── */
  const stopMonitoring = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await monitorService.stop()
      setStatus(data)
      toast.success('Monitoring stopped.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to stop monitoring.')
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Upload log file ──────────────────────────────────────────────────── */
  const uploadLogFile = useCallback(async (file) => {
    setUploading(true)
    setUploadProgress(0)
    try {
      const { data } = await monitorService.uploadLog(file, setUploadProgress)
      toast.success(`${data.message} (${data.detail?.lines_processed ?? 0} lines)`)
      return data
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed.')
      throw err
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [])

  return {
    status, loading, uploading, uploadProgress,
    startMonitoring, stopMonitoring, uploadLogFile, fetchStatus,
  }
}

