'use client'

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fulfillOrderAction } from '@/app/actions/fulfillment'
import { Loader2, Package, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type FulfillmentStatus = {
  orderNumber: string
  status:      string
  customer:    string
  items: {
    orderItemId:       string
    product:           string
    unit:              string
    quantityOrdered:   number
    quantityPickedUp:  number
    quantityRemaining: number
  }[]
}

export function FulfillmentCard({ orderId }: { orderId: string }) {
  const [pickups, setPickups] = useState<Record<string, number>>({})
  const [isPending, startTrans] = useTransition()
  const [done, setDone] = useState(false)

  const { data: order } = useQuery<FulfillmentStatus>({
    queryKey: ['fulfillment', orderId],
    queryFn:  () => fetch(`/api/orders/${orderId}/fulfillment`).then(r => r.json()),
  })

  if (!order) return null

  function handleProcess() {
    const pickupList = Object.entries(pickups)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, quantityTaken]) => ({ orderItemId, quantityTaken }))
    if (pickupList.length === 0) return
    startTrans(async () => {
      const fd = new FormData()
      fd.set('orderId', orderId)
      fd.set('pickups', JSON.stringify(pickupList))
      await fulfillOrderAction(fd)
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="rounded-xl p-6 flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(34,197,94,0.3)' }}>
        <CheckCircle className="w-6 h-6 text-green-400" />
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{order.orderNumber}</p>
          <p className="text-sm text-green-400">Pickup processed</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{order.orderNumber}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{order.customer}</p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
          order.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400')}>
          {order.status}
        </span>
      </div>

      <div className="space-y-3">
        {order.items.map(item => (
          <div key={item.orderItemId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.product}</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {item.quantityPickedUp}/{item.quantityOrdered} {item.unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full h-1.5" style={{ background: 'var(--bg-elevated)' }}>
                <div className="bg-amber-500 h-1.5 rounded-full transition-all"
                     style={{ width: `${(item.quantityPickedUp / item.quantityOrdered) * 100}%` }} />
              </div>
              <span className="text-xs w-16 text-right" style={{ color: 'var(--text-muted)' }}>{item.quantityRemaining} left</span>
            </div>
            {item.quantityRemaining > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Pick up now:</label>
                <input
                  type="number" min={0} max={item.quantityRemaining}
                  value={pickups[item.orderItemId] ?? 0}
                  onChange={e => setPickups(p => ({ ...p, [item.orderItemId]: Number(e.target.value) }))}
                  className="w-20 rounded-lg px-2 py-1 text-sm font-mono outline-none text-center [appearance:textfield]"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.unit}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleProcess}
        disabled={isPending || Object.values(pickups).every(v => v === 0)}
        className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
        {isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          : <><Package className="w-4 h-4" /> Process Pickup</>}
      </button>
    </div>
  )
}
