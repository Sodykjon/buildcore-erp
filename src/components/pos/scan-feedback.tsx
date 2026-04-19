'use client'

import { Check, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ScanState = 'idle' | 'found' | 'not-found' | 'no-stock'

const config: Record<ScanState, { color: string; icon: React.ElementType | null; label: string }> = {
  idle:        { color: 'text-gray-500',  icon: null,          label: 'Ready to scan'     },
  found:       { color: 'text-green-400', icon: Check,         label: 'Product added'      },
  'not-found': { color: 'text-red-400',   icon: X,             label: 'Barcode not found'  },
  'no-stock':  { color: 'text-amber-400', icon: AlertTriangle, label: 'Out of stock'       },
}

export function ScanFeedback({ state, barcode }: { state: ScanState; barcode: string }) {
  const { color, icon: Icon, label } = config[state]

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', color)}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
      {state !== 'idle' && barcode && (
        <span className="font-mono opacity-60">{barcode}</span>
      )}
    </div>
  )
}
