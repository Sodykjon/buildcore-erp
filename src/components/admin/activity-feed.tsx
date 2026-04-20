import { formatDate, formatCurrency, cn } from '@/lib/utils'

type OrderEvent = {
  id: string; orderNumber: string; status: string; totalAmount: number
  customerName: string; storeName: string; createdAt: string
}
type AdjEvent = {
  id: string; type: string; quantity: number; before: number; after: number
  reason: string; productName: string; storeName: string; createdAt: string
}

const orderStatus: Record<string, string> = {
  PAID:      'text-blue-400',
  PARTIAL:   'text-amber-400',
  FULFILLED: 'text-green-400',
  CANCELLED: 'text-red-400',
}

export function ActivityFeed({ orders, adjustments }: { orders: OrderEvent[]; adjustments: AdjEvent[] }) {
  type Event = { ts: string; kind: 'order' | 'adj'; data: OrderEvent | AdjEvent }
  const events: Event[] = [
    ...orders.map(o => ({ ts: o.createdAt, kind: 'order' as const, data: o })),
    ...adjustments.map(a => ({ ts: a.createdAt, kind: 'adj'   as const, data: a })),
  ].sort((a, b) => b.ts.localeCompare(a.ts))

  return (
    <div className="rounded-xl flex flex-col h-full" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Feed</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Orders & stock changes today</p>
      </div>
      <div className="overflow-y-auto max-h-[520px]">
        {events.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No activity today yet.</p>
        )}
        {events.map(ev => {
          if (ev.kind === 'order') {
            const o = ev.data as OrderEvent
            return (
              <div key={o.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{o.orderNumber}</span>
                  <span className={cn('text-xs font-medium', orderStatus[o.status] ?? '')} style={!orderStatus[o.status] ? { color: 'var(--text-secondary)' } : {}}>{o.status}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{o.customerName} · {o.storeName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(o.createdAt)} · {formatCurrency(o.totalAmount)}</p>
              </div>
            )
          } else {
            const a = ev.data as AdjEvent
            const delta = a.after - a.before
            return (
              <div key={a.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{a.productName}</span>
                  <span className={cn('text-xs font-mono font-semibold', delta >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{a.storeName} · {a.before} → {a.after}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{formatDate(a.createdAt)} · {a.reason}</p>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
