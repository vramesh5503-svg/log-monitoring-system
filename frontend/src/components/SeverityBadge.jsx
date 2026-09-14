/**
 * SeverityBadge — coloured pill for INFO / LOW / MEDIUM / HIGH / CRITICAL
 */

const MAP = {
  CRITICAL: 'badge-critical',
  HIGH:     'badge-high',
  MEDIUM:   'badge-medium',
  LOW:      'badge-low',
  INFO:     'badge-info',
}

export default function SeverityBadge({ severity }) {
  const cls = MAP[severity?.toUpperCase()] || 'badge-info'
  return <span className={cls}>{severity}</span>
}

