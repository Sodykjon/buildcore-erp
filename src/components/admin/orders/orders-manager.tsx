'use client'

import { useState, useTransition } from 'react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { cancelOrderAction, refundOrderAction } from '@/app/actions/orders'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
        toast.success('Order cancelled')
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error cancelling order') }
    })
  }

  async function handleRefund(orderId: string) {
    const reason = prompt('Reason for refund:')
    if (reason === null) return
    if (!reason.trim()) { toast.error('Reason is required'); return }
    startTrans(async () => {
      try {
        await refundOrderAction(orderId, reason.trim())
        setOrders(os => os.map(o => o.id === orderId ? { ...o, status: 'REFUNDED' } : o))
        toast.success('Order refunded')
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error processing refund') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{visible.length} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Order # or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 w-52"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
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
          <tbody>
            {visible.map(order => (
              <tr key={order.id} className="hover:bg-gray-800/40 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDetailOrder(order)}
                    className="font-mono text-amber-400 hover:text-amber-300 text-xs transition-colors"
                  >
                    {order.orderNumber}
                  </button>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{order.customer.fullName}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{order.store.name}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[order.status])}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{order.items.length}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(order.createdAt)}</td>
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
                <td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>No orders found.</td>
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
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Customer</p>
          <p style={{ color: 'var(--text-primary)' }}>{order.customer.fullName}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{order.customer.phone}</p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Store</p>
          <p style={{ color: 'var(--text-primary)' }}>{order.store.name}</p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[order.status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30')}>
            {order.status}
          </span>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Date</p>
          <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Items</p>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
              <div>
                <p style={{ color: 'var(--text-primary)' }}>{item.productName}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.quantityPickedUp}/{item.quantityOrdered} {item.unit} picked up
                </p>
              </div>
              <p className="font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.unitPrice * item.quantityOrdered)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Total</span>
        <span className="font-bold font-mono text-lg" style={{ color: 'var(--text-primary)' }}>{formatCurrency(order.totalAmount)}</span>
      </div>
    </div>
  )
}
