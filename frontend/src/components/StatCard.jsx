/**
 * StatCard — glassmorphism overview card used on the Dashboard.
 *
 * Props:
 *   title    — label string
 *   value    — big number / string to display
 *   icon     — React element (react-icons)
 *   color    — Tailwind color key: 'sky' | 'rose' | 'orange' | 'yellow' | 'slate' | 'emerald'
 *   trend    — optional { value: number, positive: bool } for a small trend indicator
 *   loading  — show skeleton if true
 */

import LoadingSpinner from './LoadingSpinner'

const COLOR_MAP = {
  sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     icon: 'text-sky-400',     value: 'text-sky-300'     },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: 'text-rose-400',    value: 'text-rose-300'    },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: 'text-orange-400',  value: 'text-orange-300'  },
  yellow:  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  icon: 'text-yellow-400',  value: 'text-yellow-300'  },
  slate:   { bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   icon: 'text-slate-400',   value: 'text-slate-300'   },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', value: 'text-emerald-300' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: 'text-purple-400',  value: 'text-purple-300'  },
}

export default function StatCard({ title, value, icon, color = 'sky', trend, loading = false }) {
  const c = COLOR_MAP[color] || COLOR_MAP.sky

  return (
    <div className={`glass-card p-5 border ${c.border} hover:border-opacity-40 transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <span className={`${c.icon} text-xl`}>{icon}</span>
        </div>

        {/* Trend badge */}
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trend.positive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}>
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-slate-500 text-sm">Loading…</span>
          </div>
        ) : (
          <p className={`text-3xl font-bold ${c.value} tracking-tight`}>
            {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
          </p>
        )}
        <p className="text-sm text-slate-400 mt-1">{title}</p>
      </div>
    </div>
  )
}

