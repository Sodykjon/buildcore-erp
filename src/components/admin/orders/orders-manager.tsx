'use client'

import { useState, useTransition } from 'react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { cancelOrderAction, refundOrderAction } from '@/app/actions/orders'
import { useRouter } from 'next/navigation'

type OrderItem = {
  id: string; productName: string; unit: string; unitPrice: number
  quantityOrdered: number; quantityPickedUp: number
}
type Order = {
  id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string
  customer: { fullName: string; phone: string }
  store:    { name: string }
  items:    OrderItem[]
}

const statusColors: Record<string, string> = {
  PAID:      'bg-blue-500/20   text-blue-400   border-blue-500/30',
  PARTIAL:   'bg-amber-500/20  text-amber-400  border-amber-500/30',
  FULFILLED: 'bg-green-500/20  text-green-400  border-green-500/30',
  CANCELLED: 'bg-red-500/20    text-red-400    border-red-500/30',
  PENDING:   'bg-gray-500/20   text-gray-400   border-gray-500/30',
  REFUNDED:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const statuses = ['PAID', 'PARTIAL', 'FULFILLED', 'CANCELLED', 'REFUNDED']

export function OrdersManager({ orders: initial, currentStatus, currentSearch }: {
  orders: Order[]
  currentStatus?: string
  currentSearch?: string
}) {
  const router = useRouter()
  const [orders, setOrders]       = useState(initial)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [search, setSearch]       = useState(currentSearch ?? '')
  const [statusFilter, setStatus] = useState(currentStatus ?? '')
  const [error, setError]         = useState<string | null>(null)
  const [, startTrans]            = useTransition()

  const visible = orders.filter(o =>
    (statusFilter === '' || o.status === statusFilter) &&
    (search === '' ||
     o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
     (o.customer.fullName ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  async function handleCancel(orderId: string) {
    if (!confirm('Cancel this order? Reserved inventory will be released.')) return
    startTrans(async () => {
      try {
        await cancelOrderAction(orderId)
        setOrders(os => os.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  async function handleRefund(orderId: string) {
    const reason = prompt('Reason for refund:')
    if (reason === null) return
    if (!reason.trim()) { setError('Reason is required'); return }
    startTrans(async () => {
      try {
        await refundOrderAction(orderId, reason.trim())
        setOrders(os => os.map(o => o.id === orderId ? { ...o, status: 'REFUNDED' } : o))
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{visible.length} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Order # or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
                       text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 w-52"
          />
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
                       text-gray-300 outline-none focus:border-amber-500"
          >
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Order</th>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Store</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-right px-4 py-3 font-medium">Items</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {visible.map(order => (
              <tr key={order.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDetailOrder(order)}
                    className="font-mono text-amber-400 hover:text-amber-300 text-xs transition-colors"
                  >
                    {order.orderNumber}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-300">{order.customer.fullName}</td>
                <td className="px-4 py-3 text-gray-400">{order.store.name}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[order.status])}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">{order.items.length}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {(order.status === 'PAID' || order.status === 'PARTIAL') && (
                      <ActionButton variant="danger" size="sm" onClick={() => handleCancel(order.id)}>
                        Cancel
                      </ActionButton>
                    )}
                    {(order.status === 'PAID' || order.status === 'PARTIAL' || order.status === 'FULFILLED') && (
                      <ActionButton variant="ghost" size="sm" onClick={() => handleRefund(order.id)}>
                        Refund
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={detailOrder?.orderNumber ?? ''} size="md">
        {detailOrder && <OrderDetail order={detailOrder} />}
      </Modal>
    </div>
  )
}

function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-1">Customer</p>
          <p className="text-white">{order.customer.fullName}</p>
          <p className="text-gray-400 text-xs">{order.customer.phone}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Store</p>
          <p className="text-white">{order.store.name}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Status</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[order.status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30')}>
            {order.status}
          </span>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Date</p>
          <p className="text-white text-xs">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items</p>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
              <div>
                <p className="text-white">{item.productName}</p>
                <p className="text-xs text-gray-500">
                  {item.quantityPickedUp}/{item.quantityOrdered} {item.unit} picked up
                </p>
              </div>
              <p className="text-gray-300 font-mono">{formatCurrency(item.unitPrice * item.quantityOrdered)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
        <span className="text-gray-400 font-medium">Total</span>
        <span className="text-white font-bold font-mono text-lg">{formatCurrency(order.totalAmount)}</span>
      </div>
    </div>
  )
}
