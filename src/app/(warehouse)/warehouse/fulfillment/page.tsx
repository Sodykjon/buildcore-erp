'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FulfillmentCard } from '@/components/warehouse/fulfillment-card'

type Order = { id: string; orderNumber: string; customer: { fullName: string } }

export default function FulfillmentPage() {
  const [search, setSearch] = useState('')

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey:        ['partial-orders'],
    queryFn:         () => fetch('/api/orders?status=PAID,PARTIAL').then(r => r.json()),
    refetchInterval: 30_000,
  })

  const filtered = orders.filter(o =>
    o.orderNumber.includes(search) ||
    (o.customer?.fullName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fulfillment</h1>
          <p className="text-sm text-gray-400">Process partial and pending pickups</p>
        </div>
        <input
          type="search"
          placeholder="Order # or customer name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm
                     text-gray-200 placeholder:text-gray-500 outline-none
                     focus:border-amber-500 w-72 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No pending pickups.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(order => (
            <FulfillmentCard key={order.id} orderId={order.id} />
          ))}
        </div>
      )}
    </div>
  )
}
