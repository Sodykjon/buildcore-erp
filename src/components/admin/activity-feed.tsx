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
    <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 shrink-0">
        <h2 className="font-semibold text-white">Activity Feed</h2>
        <p className="text-xs text-gray-500 mt-0.5">Orders & stock changes today</p>
      </div>
      <div className="overflow-y-auto divide-y divide-gray-800/50 max-h-[520px]">
        {events.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No activity today yet.</p>
        )}
        {events.map(ev => {
          if (ev.kind === 'order') {
            const o = ev.data as OrderEvent
            return (
              <div key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-white">{o.orderNumber}</span>
                  <span className={cn('text-xs font-medium', orderStatus[o.status] ?? 'text-gray-400')}>{o.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{o.customerName} · {o.storeName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(o.createdAt)} · {formatCurrency(o.totalAmount)}</p>
              </div>
            )
          } else {
            const a = ev.data as AdjEvent
            const delta = a.after - a.before
            return (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white truncate max-w-[140px]">{a.productName}</span>
                  <span className={cn('text-xs font-mono font-semibold', delta >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{a.storeName} · {a.before} → {a.after}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{formatDate(a.createdAt)} · {a.reason}</p>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
