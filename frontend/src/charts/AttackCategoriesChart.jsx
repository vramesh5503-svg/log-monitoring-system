/**
 * AttackCategoriesChart — vertical bar chart of event type distribution.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-sm">
      <p className="text-slate-400 text-xs mb-1">{label?.replace(/_/g, ' ')}</p>
      <p className="font-semibold text-white">{payload[0].value.toLocaleString()} events</p>
    </div>
  )
}

const COLORS = [
  '#f43f5e', '#f97316', '#fbbf24', '#38bdf8', '#a78bfa',
  '#22d3ee', '#34d399', '#60a5fa', '#f472b6', '#818cf8',
]

export default function AttackCategoriesChart({ data = [] }) {
  const chartData = data.map((d) => ({
    name:  d.event_type?.replace(/_/g, ' ') || 'Unknown',
    count: d.count,
  }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No attack categories detected
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={35}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

