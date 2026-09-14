/**
 * SeverityPieChart — donut chart showing log distribution by severity.
 * Uses Recharts PieChart.
 */

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = {
  CRITICAL: '#f43f5e',
  HIGH:     '#f97316',
  MEDIUM:   '#fbbf24',
  LOW:      '#38bdf8',
  INFO:     '#64748b',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="glass-card px-3 py-2 text-sm">
      <p className="font-semibold text-white">{name}</p>
      <p className="text-slate-300">{value.toLocaleString()} logs</p>
    </div>
  )
}

const CustomLegend = ({ payload }) => (
  <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
    {payload.map((entry) => (
      <li key={entry.value} className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
        {entry.value}
      </li>
    ))}
  </ul>
)

export default function SeverityPieChart({ data = [] }) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.severity, value: d.count }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={COLORS[entry.name] || '#64748b'}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

