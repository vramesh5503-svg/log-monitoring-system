/**
 * AlertsPage — displays security alerts with:
 *  - Summary cards (total, critical, by type)
 *  - Filterable, paginated alert table
 *  - Expandable rows with detail
 */

import { useState } from 'react'
import {
  FiAlertOctagon, FiAlertTriangle, FiAlertCircle,
  FiShield, FiCode, FiZap, FiServer, FiLock,
  FiChevronLeft, FiChevronRight, FiRefreshCw, FiChevronDown, FiChevronUp,
} from 'react-icons/fi'
import { format } from 'date-fns'

import { useAlerts }     from '../hooks/useAlerts'
import SeverityBadge     from '../components/SeverityBadge'
import LoadingSpinner    from '../components/LoadingSpinner'

/* ── Summary card row ────────────────────────────────────────────────────── */
const SUMMARY_CARDS = [
  { key: 'total',         label: 'Total Alerts',       icon: FiShield,        color: 'text-sky-400',    bg: 'bg-sky-500/10'     },
  { key: 'critical',      label: 'Critical',            icon: FiAlertOctagon,  color: 'text-rose-400',   bg: 'bg-rose-500/10'    },
  { key: 'failed_logins', label: 'Failed Logins',       icon: FiLock,          color: 'text-orange-400', bg: 'bg-orange-500/10'  },
  { key: 'sql_injections',label: 'SQL Injection',       icon: FiCode,          color: 'text-yellow-400', bg: 'bg-yellow-500/10'  },
  { key: 'xss_attacks',   label: 'XSS Attacks',         icon: FiAlertTriangle, color: 'text-purple-400', bg: 'bg-purple-500/10'  },
  { key: 'brute_force',   label: 'Brute Force',         icon: FiZap,           color: 'text-red-400',    bg: 'bg-red-500/10'     },
  { key: 'malware',       label: 'Malware',             icon: FiServer,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10'    },
]

/* ── Alert row ───────────────────────────────────────────────────────────── */
function AlertRow({ alert }) {
  const [open, setOpen] = useState(false)
  const ts = alert.created_at ? format(new Date(alert.created_at), 'MMM dd HH:mm:ss') : '—'

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{ts}</td>
        <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
        <td className="px-4 py-3 text-xs font-semibold text-slate-300">
          {alert.alert_type?.replace(/_/g, ' ')}
        </td>
        <td className="px-4 py-3 text-xs font-mono text-slate-400">{alert.source_ip || '—'}</td>
        <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-xs">{alert.description}</td>
        <td className="px-4 py-3 text-slate-600">
          {open ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </td>
      </tr>
      {open && (
        <tr className="bg-white/[0.02]">
          <td colSpan={6} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wide">Alert ID</span>
                <p className="text-slate-300 font-mono mt-0.5">#{alert.id}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wide">Log Reference</span>
                <p className="text-slate-300 font-mono mt-0.5">Log #{alert.log_id}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wide">Source IP</span>
                <p className="text-slate-300 font-mono mt-0.5">{alert.source_ip || 'N/A'}</p>
              </div>
              <div className="col-span-3">
                <span className="text-slate-500 uppercase tracking-wide">Description</span>
                <p className="text-slate-200 mt-0.5 bg-black/20 rounded p-2">{alert.description || '—'}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
const ALERT_TYPES  = ['', 'FAILED_LOGIN', 'SSH_AUTH_FAILURE', 'SQL_INJECTION', 'XSS',
                       'BRUTE_FORCE', 'PORT_SCAN', 'MALWARE', 'SUSPICIOUS_IP', 'UNAUTHORIZED_ACCESS']
const SEVERITIES   = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

export default function AlertsPage() {
  const {
    alerts, summary, total, totalPages, page, filters, loading, error,
    setPage, updateFilter, refresh,
  } = useAlerts(50)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 text-sm mt-0.5">Security threat alerts and incidents</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {SUMMARY_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
            <div key={key} className="glass-card p-4">
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>
                {(summary[key] ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select
          value={filters.alert_type}
          onChange={(e) => updateFilter('alert_type', e.target.value)}
          className="input-field text-sm w-48"
        >
          {ALERT_TYPES.map((t) => (
            <option key={t} value={t}>{t ? t.replace(/_/g, ' ') : 'All Alert Types'}</option>
          ))}
        </select>

        <select
          value={filters.severity}
          onChange={(e) => updateFilter('severity', e.target.value)}
          className="input-field text-sm w-36"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s || 'All Severities'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-rose-400">{error}</div>
        ) : loading && !alerts.length ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : !alerts.length ? (
          <div className="py-16 text-center text-slate-500">No alerts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  {['Timestamp', 'Severity', 'Type', 'Source IP', 'Description', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-slate-500">Page {page} of {totalPages} · {total.toLocaleString()} alerts</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="btn-ghost p-1.5 disabled:opacity-30"><FiChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="btn-ghost p-1.5 disabled:opacity-30"><FiChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

