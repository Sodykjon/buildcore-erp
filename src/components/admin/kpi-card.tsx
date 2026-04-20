import type { ReactNode } from 'react'

const accents = {
  amber: { border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)', text: '#f59e0b' },
  blue:  { border: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa' },
  green: { border: 'rgba(34,197,94,0.3)',   bg: 'rgba(34,197,94,0.1)',   text: '#4ade80' },
  red:   { border: 'rgba(239,68,68,0.3)',   bg: 'rgba(239,68,68,0.1)',   text: '#f87171' },
}

type Props = {
  label:  string
  value:  string | number
  icon:   ReactNode
  accent: keyof typeof accents
}

export function KpiCard({ label, value, icon, accent }: Props) {
  const a = accents[accent]
  return (
    <div className="rounded-xl p-5" style={{ border: `1px solid ${a.border}`, background: a.bg }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70" style={{ color: a.text }}>{label}</span>
        <span style={{ color: a.text }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
