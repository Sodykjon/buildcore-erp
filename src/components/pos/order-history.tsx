'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, ChevronDown, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type OrderItem = {
  id: string; productId: string; quantityOrdered: number; quantityPickedUp: number
  unitPrice: number; product: { name: string; unit: string }
}
type Order = {
  id: string; orderNumber: string; status: string; totalAmount: number
  notes: string | null; createdAt: string
  customer: { fullName: string; phone: string }
  items: OrderItem[]
}

const statusColors: Record<string, string> = {
  PENDING:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PAID:      'bg-blue-500/20   text-blue-400   border-blue-500/30',
  PARTIAL:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  FULFILLED: 'bg-green-500/20  text-green-400  border-green-500/30',
  CANCELLED: 'bg-gray-500/20   text-gray-500   border-gray-500/30',
}

export function OrderHistory({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['pos-orders', storeId],
    queryFn:  () => fetch(`/api/pos/orders?storeId=${storeId}`).then(r => r.json()),
    refetchInterval: 30_000,
  })

  const todayTotal = orders.filter(o => o.status !== 'CANCELLED')
    .reduce((s, o) => s + o.totalAmount, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h2 className="font-semibold text-white">Today&apos;s Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">{orders.length} orders · ${todayTotal.toFixed(2)} total</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading…</div>
        )}
        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <History className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm">No orders today yet</p>
          </div>
        )}
        <div className="divide-y divide-gray-800">
          {orders.map(o => (
            <div key={o.id}>
              <button
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition-colors text-left"
              >
                {expanded === o.id
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-white">{o.orderNumber}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', statusColors[o.status])}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{o.customer.fullName} · {o.customer.phone}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-white shrink-0">
                  ${o.totalAmount.toFixed(2)}
                </span>
              </button>

              {expanded === o.id && (
                <div className="px-5 pb-4 space-y-2 bg-gray-900/50">
                  {o.notes && (
                    <p className="text-xs text-amber-400/80 italic bg-amber-500/5 rounded px-2 py-1">
                      Note: {o.notes}
                    </p>
                  )}
                  <div className="space-y-1">
                    {o.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 truncate">{item.product.name}</span>
                        <span className="text-gray-500 shrink-0 ml-4">
                          {item.quantityOrdered} × ${item.unitPrice.toFixed(2)}
                          {' = '}
                          <span className="text-white font-mono">
                            ${(item.quantityOrdered * item.unitPrice).toFixed(2)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-semibold border-t border-gray-700 pt-2 mt-1">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white font-mono">${o.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
