/**
 * TopIPsChart — horizontal bar chart of the top attacker IP addresses.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-sm">
      <p className="font-mono text-sky-300 text-xs mb-1">{label}</p>
      <p className="font-semibold text-white">{payload[0].value.toLocaleString()} events</p>
    </div>
  )
}

// Gradient from rose (most active) to sky (least active)
const BAR_COLORS = ['#f43f5e', '#f97316', '#fbbf24', '#38bdf8', '#a78bfa',
                    '#22d3ee', '#34d399', '#60a5fa', '#f472b6', '#818cf8']

export default function TopIPsChart({ data = [] }) {
  const chartData = data.map((d) => ({
    ip:    d.source_ip,
    count: d.count,
  }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No attacker IPs detected
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ip"
          tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={800}>
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

