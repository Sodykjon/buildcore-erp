import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const accents = {
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  blue:  'border-blue-500/30  bg-blue-500/10  text-blue-400',
  green: 'border-green-500/30 bg-green-500/10 text-green-400',
  red:   'border-red-500/30   bg-red-500/10   text-red-400',
}

type Props = {
  label:  string
  value:  string | number
  icon:   ReactNode
  accent: keyof typeof accents
}

export function KpiCard({ label, value, icon, accent }: Props) {
  return (
    <div className={cn('rounded-xl border p-5', accents[accent])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
