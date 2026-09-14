/**
 * DashboardPage — main overview with:
 *  - 7 stat cards (total logs, critical, high, medium, low, info, today)
 *  - 4 charts (severity pie, hourly area, top IPs bar, attack categories bar)
 *  - Real-time WebSocket alert feed in a live ticker
 *  - Auto-refresh every 30 s
 */

import { useState, useCallback } from 'react'
import {
  FiDatabase, FiAlertOctagon, FiAlertTriangle, FiAlertCircle,
  FiInfo, FiActivity, FiRefreshCw, FiWifi, FiWifiOff, FiShield,
} from 'react-icons/fi'
import toast from 'react-hot-toast'

import { useDashboard }          from '../hooks/useDashboard'
import { useWebSocket }          from '../hooks/useWebSocket'
import StatCard                  from '../components/StatCard'
import SeverityPieChart          from '../charts/SeverityPieChart'
import HourlyEventsChart         from '../charts/HourlyEventsChart'
import TopIPsChart                from '../charts/TopIPsChart'
import AttackCategoriesChart     from '../charts/AttackCategoriesChart'
import LoadingSpinner            from '../components/LoadingSpinner'
import SeverityBadge             from '../components/SeverityBadge'

/* ── Live alert ticker item ──────────────────────────────────────────────── */
function LiveAlert({ msg }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 animate-fade-in">
      <SeverityBadge severity={msg.severity} />
      <span className="text-xs font-mono text-slate-400 shrink-0">{msg.source_ip || '—'}</span>
      <span className="text-xs text-slate-300 truncate">{msg.message}</span>
    </div>
  )
}

/* ── Chart section wrapper ────────────────────────────────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div className="glass-card p-5">
      <h3 className="section-title mb-4">{title}</h3>
      {children}
    </div>
  )
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { stats, loading, error, refresh } = useDashboard(30_000)

  // Live alerts from WebSocket
  const [liveAlerts, setLiveAlerts] = useState([])
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'new_alert') {
      setLiveAlerts((prev) => [msg, ...prev].slice(0, 20))  // keep last 20
      if (msg.severity === 'CRITICAL') {
        toast.error(`CRITICAL: ${msg.event_type} from ${msg.source_ip || 'unknown'}`, {
          duration: 8000,
          icon: '🚨',
        })
      }
    }
  }, [])
  const { connected } = useWebSocket(handleWsMessage)

  /* ── Error state ──────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FiAlertCircle className="w-12 h-12 text-rose-400" />
        <p className="text-slate-400">{error}</p>
        <button onClick={refresh} className="btn-ghost text-sm">Try Again</button>
      </div>
    )
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiShield className="text-sky-400" />
            Security Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time threat monitoring overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* WS status pill */}
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
          }`}>
            {connected
              ? <><FiWifi className="w-3 h-3" /> Live</>
              : <><FiWifiOff className="w-3 h-3" /> Offline</>
            }
          </span>

          <button
            onClick={refresh}
            disabled={loading}
            className="btn-ghost text-sm flex items-center gap-2"
            aria-label="Refresh dashboard"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-4">
        <StatCard title="Total Logs"     value={stats?.total_logs}     icon={<FiDatabase />}      color="sky"     loading={loading} />
        <StatCard title="Critical"       value={stats?.critical}       icon={<FiAlertOctagon />}  color="rose"    loading={loading} />
        <StatCard title="High"           value={stats?.high}           icon={<FiAlertTriangle />} color="orange"  loading={loading} />
        <StatCard title="Medium"         value={stats?.medium}         icon={<FiAlertCircle />}   color="yellow"  loading={loading} />
        <StatCard title="Low"            value={stats?.low}            icon={<FiInfo />}          color="sky"     loading={loading} />
        <StatCard title="Info"           value={stats?.info}           icon={<FiInfo />}          color="slate"   loading={loading} />
        <StatCard title="Today's Events" value={stats?.today_events}   icon={<FiActivity />}      color="emerald" loading={loading} />
      </div>

      {/* ── Charts row 1: pie + hourly ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Severity Distribution">
          {loading
            ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            : <SeverityPieChart data={stats?.severity_distribution || []} />
          }
        </ChartCard>

        <ChartCard title="Events Per Hour (last 24 h)">
          {loading
            ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            : <HourlyEventsChart data={stats?.hourly_events || []} />
          }
        </ChartCard>
      </div>

      {/* ── Charts row 2: top IPs + attack categories ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top Attacker IPs">
          {loading
            ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            : <TopIPsChart data={stats?.top_ips || []} />
          }
        </ChartCard>

        <ChartCard title="Attack Categories">
          {loading
            ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            : <AttackCategoriesChart data={stats?.attack_categories || []} />
          }
        </ChartCard>
      </div>

      {/* ── Live alert feed ─────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            Live Alert Feed
          </h3>
          {liveAlerts.length > 0 && (
            <button
              onClick={() => setLiveAlerts([])}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {liveAlerts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            {connected ? 'Waiting for alerts…' : 'WebSocket disconnected — attempting to reconnect…'}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-1">
            {liveAlerts.map((msg, i) => (
              <LiveAlert key={i} msg={msg} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

