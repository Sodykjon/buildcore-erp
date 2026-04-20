'use client'

import { useState, useTransition } from 'react'
import { Truck, Plus, CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { createDeliveryAction, updateDeliveryStatusAction } from '@/app/actions/delivery'
import { toast } from 'sonner'

type PendingOrder = {
  id: string; orderNumber: string; totalAmount: number; createdAt: string
  customerName: string; customerPhone: string; storeName: string
}
type Delivery = {
  id: string; driverName: string; driverPhone: string | null
  status: string; notes: string | null
  scheduledAt: string | null; deliveredAt: string | null; createdAt: string
  order: {
    id: string; orderNumber: string; totalAmount: number
    customer: { fullName: string; phone: string }
    store:    { name: string }
  }
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:          <Clock       className="w-3.5 h-3.5" />,
  OUT_FOR_DELIVERY: <Truck       className="w-3.5 h-3.5" />,
  DELIVERED:        <CheckCircle2 className="w-3.5 h-3.5" />,
  FAILED:           <XCircle     className="w-3.5 h-3.5" />,
}
const STATUS_COLOR: Record<string, string> = {
  PENDING:          'bg-gray-500/20  text-gray-400  border-gray-500/30',
  OUT_FOR_DELIVERY: 'bg-blue-500/20  text-blue-400  border-blue-500/30',
  DELIVERED:        'bg-green-500/20 text-green-400 border-green-500/30',
  FAILED:           'bg-red-500/20   text-red-400   border-red-500/30',
}

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

export function DeliveryManager({ deliveries: initial, pendingOrders }: {
  deliveries: Delivery[]
  pendingOrders: PendingOrder[]
}) {
  const [deliveries, setDeliveries] = useState(initial)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [, startTrans]      = useTransition()

  const visible = deliveries.filter(d => !statusFilter || d.status === statusFilter)

  async function handleCreate(fd: FormData) {
    startTrans(async () => {
      try {
        await createDeliveryAction(fd)
        setDispatchOpen(false)
        toast.success('Delivery dispatched')
        window.location.reload()
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error creating delivery') }
    })
  }

  async function handleStatus(id: string, status: string) {
    const notes = status === 'FAILED' ? prompt('Reason for failure:') ?? undefined : undefined
    startTrans(async () => {
      try {
        await updateDeliveryStatusAction(id, status, notes)
        setDeliveries(ds => ds.map(d => d.id === id ? { ...d, status } : d))
        const label: Record<string, string> = { OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', FAILED: 'Marked as failed' }
        toast.success(label[status] ?? 'Status updated')
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error updating status') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Dispatch</h1>
          <p className="text-sm text-gray-400 mt-0.5">{visible.length} deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
            <option value="">All statuses</option>
            {['PENDING','OUT_FOR_DELIVERY','DELIVERED','FAILED'].map(s =>
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            )}
          </select>
          <button onClick={() => setDispatchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                       bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors">
            <Plus className="w-4 h-4" /> Dispatch Order
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Order</th>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Driver</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {visible.map(d => (
              <tr key={d.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-mono text-amber-400 text-xs">{d.order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{d.order.store.name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-200">{d.order.customer.fullName}</p>
                  <p className="text-xs text-gray-500">{d.order.customer.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-200">{d.driverName}</p>
                  {d.driverPhone && <p className="text-xs text-gray-500">{d.driverPhone}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium w-fit',
                    STATUS_COLOR[d.status])}>
                    {STATUS_ICON[d.status]} {d.status.replace(/_/g,' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {d.scheduledAt ? formatDate(d.scheduledAt) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {d.status === 'PENDING' && (
                      <ActionButton size="sm" variant="primary" onClick={() => handleStatus(d.id, 'OUT_FOR_DELIVERY')}>
                        Dispatch
                      </ActionButton>
                    )}
                    {d.status === 'OUT_FOR_DELIVERY' && (
                      <>
                        <ActionButton size="sm" variant="success" onClick={() => handleStatus(d.id, 'DELIVERED')}>
                          Delivered
                        </ActionButton>
                        <ActionButton size="sm" variant="danger" onClick={() => handleStatus(d.id, 'FAILED')}>
                          Failed
                        </ActionButton>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No deliveries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={dispatchOpen} onClose={() => setDispatchOpen(false)} title="Dispatch Order" size="sm">
        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Order</label>
            <select name="orderId" required className={inputCls}>
              <option value="">Select fulfilled order…</option>
              {pendingOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.customerName} ({o.storeName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Driver Name</label>
            <input name="driverName" required placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Driver Phone</label>
            <input name="driverPhone" placeholder="+1 555 000 0000" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Scheduled Date/Time</label>
            <input name="scheduledAt" type="datetime-local" className={inputCls} />
          </div>
          <button type="submit"
            className="w-full py-2.5 rounded-lg font-bold text-gray-950 bg-amber-500 hover:bg-amber-400 transition-colors">
            Create Delivery
          </button>
        </form>
      </Modal>
    </div>
  )
}
