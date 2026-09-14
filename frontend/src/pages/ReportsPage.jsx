/**
 * ReportsPage — generate and export security reports.
 *
 * Features:
 *  - Period selector: daily / weekly / monthly
 *  - Summary metrics panel
 *  - Export buttons: PDF, CSV, JSON
 *  - Loading / error states with toasts
 */

import { useState, useEffect } from 'react'
import {
  FiFileText, FiDownload, FiBarChart2, FiAlertTriangle,
  FiCalendar, FiRefreshCw,
} from 'react-icons/fi'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import { reportService, downloadBlob } from '../services/reportService'
import LoadingSpinner from '../components/LoadingSpinner'

const PERIODS = [
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
]

/* ── Metric tile ─────────────────────────────────────────────────────────── */
function MetricTile({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</p>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const [period,  setPeriod]  = useState('daily')
  const [report,  setReport]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState('')   // 'csv' | 'json' | 'pdf' | ''

  const fetchReport = async () => {
    setLoading(true)
    try {
      const { data } = await reportService.getReport(period)
      setReport(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [period])

  const handleExport = async (fmt) => {
    setExporting(fmt)
    try {
      let res
      const filename = `report_${period}_${format(new Date(), 'yyyyMMdd_HHmmss')}`
      if (fmt === 'csv') {
        res = await reportService.exportCsv(period)
        downloadBlob(res, `${filename}.csv`)
      } else if (fmt === 'json') {
        res = await reportService.exportJson(period)
        downloadBlob(res, `${filename}.json`)
      } else if (fmt === 'pdf') {
        res = await reportService.exportPdf(period)
        downloadBlob(res, `${filename}.pdf`)
      }
      toast.success(`${fmt.toUpperCase()} exported successfully.`)
    } catch (err) {
      toast.error(`Export failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiFileText className="text-sky-400" /> Reports
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Generate and export security reports</p>
        </div>
        <button onClick={fetchReport} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Period selector + export buttons */}
      <div className="glass-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <FiCalendar className="w-4 h-4" /> Report Period
          </p>
          <div className="flex gap-2">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === value
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          {[
            { fmt: 'pdf',  label: 'PDF',  color: 'text-rose-400'   },
            { fmt: 'csv',  label: 'CSV',  color: 'text-emerald-400' },
            { fmt: 'json', label: 'JSON', color: 'text-sky-400'     },
          ].map(({ fmt, label, color }) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={!!exporting || loading}
              className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {exporting === fmt
                ? <LoadingSpinner size="sm" />
                : <FiDownload className={`w-4 h-4 ${color}`} />
              }
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Report content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : report ? (
        <>
          {/* Meta */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-1">
              {PERIODS.find((p) => p.value === period)?.label} Report
            </h2>
            <p className="text-xs text-slate-500">
              {format(new Date(report.start_date), 'MMM dd, yyyy HH:mm')} →{' '}
              {format(new Date(report.end_date),   'MMM dd, yyyy HH:mm')}
              <span className="ml-3">Generated: {format(new Date(report.generated_at), 'MMM dd HH:mm:ss')}</span>
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricTile label="Total Logs"      value={report.total_logs}      color="text-sky-300"    />
            <MetricTile label="Total Alerts"    value={report.total_alerts}    color="text-slate-200"  />
            <MetricTile label="Critical"        value={report.critical_alerts} color="text-rose-400"   />
            <MetricTile label="High"            value={report.high_alerts}     color="text-orange-400" />
            <MetricTile label="Medium"          value={report.medium_alerts}   color="text-yellow-400" />
            <MetricTile label="Low"             value={report.low_alerts}      color="text-sky-400"    />
          </div>

          {/* Top lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title flex items-center gap-2 mb-4">
                <FiBarChart2 className="text-sky-400" /> Top Event Types
              </h3>
              {report.top_event_types?.length ? (
                <ol className="space-y-2">
                  {report.top_event_types.map((e, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{e.event_type?.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-sky-300">{e.count.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-slate-500 text-sm">No events in this period.</p>}
            </div>

            <div className="glass-card p-5">
              <h3 className="section-title flex items-center gap-2 mb-4">
                <FiAlertTriangle className="text-rose-400" /> Top Source IPs
              </h3>
              {report.top_source_ips?.length ? (
                <ol className="space-y-2">
                  {report.top_source_ips.map((e, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-slate-300">{e.source_ip}</span>
                      <span className="font-mono text-rose-300">{e.count.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-slate-500 text-sm">No attacker IPs in this period.</p>}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

