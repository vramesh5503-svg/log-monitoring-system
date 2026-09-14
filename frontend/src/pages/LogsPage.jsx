/**
 * LogsPage — full-featured log viewer with:
 *  - Search (debounced), severity filter, event-type filter, sort toggle
 *  - Paginated table with row details on click
 *  - Delete (admin only)
 *  - Export handled via Reports page
 */

import { useState } from 'react'
import {
  FiSearch, FiFilter, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiTrash2, FiChevronDown, FiChevronUp, FiArrowUp, FiArrowDown,
} from 'react-icons/fi'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import { useLogs }       from '../hooks/useLogs'
import { useAuth }       from '../context/AuthContext'
import { logService }    from '../services/logService'
import SeverityBadge     from '../components/SeverityBadge'
import LoadingSpinner    from '../components/LoadingSpinner'

const SEVERITIES   = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const EVENT_TYPES  = [
  '', 'FAILED_LOGIN', 'SSH_AUTH_FAILURE', 'SQL_INJECTION', 'XSS',
  'BRUTE_FORCE', 'PORT_SCAN', 'MALWARE', 'SUSPICIOUS_IP', 'UNAUTHORIZED_ACCESS', 'GENERIC',
]

/* ── Row detail expand ───────────────────────────────────────────────────── */
function LogRow({ log, isAdmin, onDelete }) {
  const [open, setOpen] = useState(false)

  const ts = log.timestamp
    ? format(new Date(log.timestamp), 'MMM dd HH:mm:ss')
    : '—'

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{ts}</td>
        <td className="px-4 py-3"><SeverityBadge severity={log.severity} /></td>
        <td className="px-4 py-3 text-xs font-mono text-slate-400">{log.source_ip || '—'}</td>
        <td className="px-4 py-3 text-xs text-slate-500">{log.event_type || '—'}</td>
        <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate">{log.message}</td>
        <td className="px-4 py-3 text-slate-600">
          {open ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {open && (
        <tr className="bg-white/[0.02]">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide">Source</span>
                  <p className="text-slate-300 font-mono text-xs mt-0.5">{log.source || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide">Log ID</span>
                  <p className="text-slate-300 font-mono text-xs mt-0.5">#{log.id}</p>
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Full Message</span>
                <p className="text-slate-200 text-xs mt-0.5 font-mono bg-black/20 rounded p-2 break-all">
                  {log.message}
                </p>
              </div>
              {log.raw_line && log.raw_line !== log.message && (
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide">Raw Line</span>
                  <p className="text-slate-400 text-xs mt-0.5 font-mono bg-black/20 rounded p-2 break-all">
                    {log.raw_line}
                  </p>
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(log.id) }}
                  className="btn-danger text-xs flex items-center gap-1.5 mt-2"
                >
                  <FiTrash2 className="w-3 h-3" /> Delete Log
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LogsPage() {
  const { isAdmin } = useAuth()
  const {
    logs, total, totalPages, page, filters, loading, error,
    setPage, updateFilter, resetFilters, refresh,
  } = useLogs(50)

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete log #${id}? This cannot be undone.`)) return
    try {
      await logService.deleteLog(id)
      toast.success(`Log #${id} deleted.`)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed.')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Log Viewer</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {total.toLocaleString()} total entries
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search messages…"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>

          {/* Severity */}
          <select
            value={filters.severity}
            onChange={(e) => updateFilter('severity', e.target.value)}
            className="input-field text-sm w-36"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s || 'All Severities'}</option>
            ))}
          </select>

          {/* Event type */}
          <select
            value={filters.event_type}
            onChange={(e) => updateFilter('event_type', e.target.value)}
            className="input-field text-sm w-44"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t || 'All Event Types'}</option>
            ))}
          </select>

          {/* Sort */}
          <button
            onClick={() => updateFilter('sort_desc', !filters.sort_desc)}
            className="btn-ghost text-sm flex items-center gap-1.5 shrink-0"
          >
            {filters.sort_desc
              ? <><FiArrowDown className="w-4 h-4" /> Newest first</>
              : <><FiArrowUp className="w-4 h-4" /> Oldest first</>
            }
          </button>

          {/* Reset */}
          <button onClick={resetFilters} className="btn-ghost text-sm flex items-center gap-1.5">
            <FiFilter className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-rose-400">{error}</div>
        ) : loading && !logs.length ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : !logs.length ? (
          <div className="py-16 text-center text-slate-500">No logs match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  {['Timestamp', 'Severity', 'Source IP', 'Event Type', 'Message', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} isAdmin={isAdmin} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total.toLocaleString()} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost p-1.5 disabled:opacity-30"
                aria-label="Previous page"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              {/* Page number pills (show up to 5) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-ghost p-1.5 disabled:opacity-30"
                aria-label="Next page"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

