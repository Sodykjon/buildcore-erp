'use client'

import { useState, useTransition } from 'react'
import { ClipboardList, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { formatDate, cn } from '@/lib/utils'
import { approveWorkOrderAction, rejectWorkOrderAction } from '@/app/actions/work-orders'
import { toast } from 'sonner'

type Product  = { id: string; name: string; sku: string; unit: string }
type WOItem   = { id: string; productId: string; quantity: number; note: string | null; product: Product }
type WorkOrder = {
  id: string; woNumber: string; type: string; status: string; reason: string
  adminNote: string | null; createdAt: string; submittedAt: string | null; resolvedAt: string | null
  store: { name: string }; items: WOItem[]
}

const statusColors: Record<string, string> = {
  DRAFT:     'bg-gray-500/20  text-gray-400  border-gray-500/30',
  SUBMITTED: 'bg-blue-500/20  text-blue-400  border-blue-500/30',
  APPROVED:  'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED:  'bg-red-500/20   text-red-400   border-red-500/30',
}

const typeLabels: Record<string, string> = {
  STOCK_IN:        'Stock In',
  STOCK_OUT:       'Stock Out',
  ADJUSTMENT:      'Count Adjustment',
  DAMAGE_WRITE_OFF:'Damage / Write-off',
}

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

export function AdminWorkOrderManager({ workOrders: initial }: { workOrders: WorkOrder[] }) {
  const [orders]      = useState(initial)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<WorkOrder | null>(null)
  const [, startTrans]              = useTransition()

  function reload() { window.location.reload() }

  function handleApprove(id: string) {
    startTrans(async () => {
      try {
        await approveWorkOrderAction(id)
        toast.success('Work order approved')
        reload()
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error approving work order') }
    })
  }

  const submitted = orders.filter(o => o.status === 'SUBMITTED')
  const others    = orders.filter(o => o.status !== 'SUBMITTED')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Work Orders</h1>
        <p className="text-sm text-gray-400 mt-0.5">Review and approve inventory change requests</p>
      </div>



      {submitted.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
            Pending Approval ({submitted.length})
          </p>
          <div className="space-y-3">
            {submitted.map(wo => (
              <WOCard key={wo.id} wo={wo} expanded={expanded} setExpanded={setExpanded}
                onApprove={() => handleApprove(wo.id)} onReject={() => setRejectTarget(wo)} />
            ))}
          </div>
        </section>
      )}

      <section>
        {submitted.length > 0 && (
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">History</p>
        )}
        {others.length === 0 && submitted.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-500">No work orders yet.</p>
          </div>
        )}
        <div className="space-y-3">
          {others.map(wo => (
            <WOCard key={wo.id} wo={wo} expanded={expanded} setExpanded={setExpanded} />
          ))}
        </div>
      </section>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Work Order" size="md">
        {rejectTarget && (
          <RejectForm wo={rejectTarget} onDone={() => { setRejectTarget(null); reload() }} />
        )}
      </Modal>
    </div>
  )
}

function WOCard({ wo, expanded, setExpanded, onApprove, onReject }: {
  wo: WorkOrder; expanded: string | null; setExpanded: (id: string | null) => void
  onApprove?: () => void; onReject?: () => void
}) {
  const isOpen = expanded === wo.id
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(isOpen ? null : wo.id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-4">
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <div className="text-left">
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold text-white">{wo.woNumber}</span>
              <span className="text-xs text-gray-500">{typeLabels[wo.type] ?? wo.type}</span>
              <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{wo.store.name}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{wo.reason}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[wo.status])}>
            {wo.status}
          </span>
          <span className="text-xs text-gray-600">{formatDate(wo.createdAt)}</span>
          {wo.status === 'SUBMITTED' && onApprove && onReject && (
            <>
              <ActionButton size="sm" variant="primary" onClick={onApprove}>
                <CheckCircle className="w-3 h-3" /> Approve
              </ActionButton>
              <ActionButton size="sm" variant="ghost" onClick={onReject}>
                <XCircle className="w-3 h-3" /> Reject
              </ActionButton>
            </>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800 p-5 space-y-4">
          {wo.adminNote && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-400 mb-0.5">Rejection reason</p>
                <p className="text-sm text-red-300">{wo.adminNote}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {wo.items.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-lg p-3 text-xs">
                <p className="font-medium text-white truncate">{item.product.name}</p>
                <p className="text-gray-500 font-mono mt-0.5">{item.product.sku}</p>
                <p className="text-gray-400 mt-1">
                  Qty: <span className="text-amber-400 font-mono font-semibold">{item.quantity}</span> {item.product.unit}
                </p>
                {item.note && <p className="text-gray-600 mt-1 italic">{item.note}</p>}
              </div>
            ))}
          </div>
          {wo.submittedAt && <p className="text-xs text-gray-600">Submitted: {formatDate(wo.submittedAt)}</p>}
          {wo.resolvedAt  && <p className="text-xs text-gray-600">Resolved: {formatDate(wo.resolvedAt)}</p>}
        </div>
      )}
    </div>
  )
}

function RejectForm({ wo, onDone }: {
  wo: WorkOrder; onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [note, setNote]       = useState('')
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) { setErr('Rejection reason is required'); return }
    const fd = new FormData()
    fd.set('id', wo.id)
    fd.set('adminNote', note.trim())
    startTrans(async () => {
      try {
        setErr(null)
        await rejectWorkOrderAction(fd)
        toast.success('Work order rejected')
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); toast.error(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-xs text-gray-500 mb-1">Work Order</p>
        <p className="font-mono font-semibold text-white">{wo.woNumber}</p>
        <p className="text-xs text-gray-400 mt-1">{wo.reason}</p>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Rejection Reason *</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} required
          placeholder="Explain why this work order is being rejected…"
          className={inputCls} />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Rejecting…' : 'Reject Work Order'}
      </button>
    </form>
  )
}
