/**
 * HourlyEventsChart — area chart showing events per hour over the last 24 h.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-sm">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="font-semibold text-sky-300">{payload[0].value.toLocaleString()} events</p>
    </div>
  )
}

export default function HourlyEventsChart({ data = [] }) {
  const chartData = data.map((d) => ({
    hour:  d.hour ? format(parseISO(d.hour), 'HH:00') : d.hour,
    count: d.count,
  }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No events in the last 24 hours
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="hour"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={35}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#eventsGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

