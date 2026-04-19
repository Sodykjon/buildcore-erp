import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  PAID:      'bg-blue-500/20  text-blue-400',
  PARTIAL:   'bg-amber-500/20 text-amber-400',
  FULFILLED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20   text-red-400',
  PENDING:   'bg-gray-500/20  text-gray-400',
}

export async function RecentOrdersFeed() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take:    10,
    include: { customer: true, store: true },
  })

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-white">Recent Orders</h2>
      </div>
      <div className="divide-y divide-gray-800/50">
        {orders.map(order => (
          <div key={order.id} className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-white">{order.orderNumber}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[order.status])}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">{order.customer?.fullName ?? 'Guest'} · {order.store.name}</p>
            <p className="text-xs text-gray-500">{formatDate(order.createdAt)} · {formatCurrency(Number(order.totalAmount))}</p>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No orders yet.</p>
        )}
      </div>
    </div>
  )
}
