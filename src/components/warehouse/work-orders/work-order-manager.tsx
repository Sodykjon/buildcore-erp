'use client'

import { useState, useTransition } from 'react'
import { ClipboardList, Plus, Send, RotateCcw, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { formatDate, cn } from '@/lib/utils'
import {
  createWorkOrderAction, submitWorkOrderAction, resubmitWorkOrderAction,
} from '@/app/actions/work-orders'

type Product = { id: string; name: string; sku: string; unit: string }
type WOItem  = { id: string; productId: string; quantity: number; note: string | null; product: Product }
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

interface Props {
  workOrders: WorkOrder[]
  products:   Product[]
  storeId:    string
}

export function WorkOrderManager({ workOrders: initial, products, storeId }: Props) {
  const [orders, setOrders]       = useState(initial)
  const [newOpen, setNewOpen]     = useState(false)
  const [resubTarget, setResubTarget] = useState<WorkOrder | null>(null)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [, startTrans]            = useTransition()

  function reload() { window.location.reload() }

  async function handleSubmit(id: string) {
    startTrans(async () => {
      try {
        await submitWorkOrderAction(id)
        reload()
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">Submit inventory change requests for admin approval</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                     bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Work Order
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-500">No work orders yet. Create one to request inventory changes.</p>
          </div>
        )}

        {orders.map(wo => (
          <div key={wo.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === wo.id ? null : wo.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expanded === wo.id
                  ? <ChevronDown className="w-4 h-4 text-gray-500" />
                  : <ChevronRight className="w-4 h-4 text-gray-500" />
                }
                <div className="text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-white">{wo.woNumber}</span>
                    <span className="text-xs text-gray-500">{typeLabels[wo.type] ?? wo.type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{wo.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[wo.status])}>
                  {wo.status}
                </span>
                <span className="text-xs text-gray-600">{formatDate(wo.createdAt)}</span>
                {wo.status === 'DRAFT' && (
                  <ActionButton size="sm" variant="primary" onClick={() => handleSubmit(wo.id)}>
                    <Send className="w-3 h-3" /> Submit
                  </ActionButton>
                )}
                {wo.status === 'REJECTED' && (
                  <ActionButton size="sm" variant="ghost" onClick={() => setResubTarget(wo)}>
                    <RotateCcw className="w-3 h-3" /> Resubmit
                  </ActionButton>
                )}
              </div>
            </button>

            {expanded === wo.id && (
              <div className="border-t border-gray-800 p-5 space-y-4">
                {/* Admin rejection note */}
                {wo.status === 'REJECTED' && wo.adminNote && (
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-0.5">Rejected by Admin</p>
                      <p className="text-sm text-red-300">{wo.adminNote}</p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="grid grid-cols-3 gap-2">
                  {wo.items.map(item => (
                    <div key={item.id} className="bg-gray-800 rounded-lg p-3 text-xs">
                      <p className="font-medium text-white truncate">{item.product.name}</p>
                      <p className="text-gray-400 mt-1">
                        Qty: <span className="text-amber-400 font-mono">{item.quantity}</span>
                        {' '}{item.product.unit}
                      </p>
                      {item.note && <p className="text-gray-600 mt-1 italic">{item.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Work Order" size="lg">
        <WorkOrderForm
          products={products}
          storeId={storeId}
          onDone={() => { setNewOpen(false); reload() }}
          setError={setError}
        />
      </Modal>

      <Modal open={!!resubTarget} onClose={() => setResubTarget(null)} title="Resubmit Work Order" size="lg">
        {resubTarget && (
          <ResubmitForm
            wo={resubTarget}
            products={products}
            onDone={() => { setResubTarget(null); reload() }}
            setError={setError}
          />
        )}
      </Modal>
    </div>
  )
}

// ── New WO form ───────────────────────────────────────────────────────────────

function WorkOrderForm({ products, storeId, onDone, setError }: {
  products: Product[]; storeId: string; onDone: () => void; setError: (e: string | null) => void
}) {
  const [pending, startTrans] = useTransition()
  const [lines, setLines]     = useState([{ productId: '', quantity: 1, note: '' }])
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd   = new FormData(e.currentTarget)
    const items = lines.filter(l => l.productId && l.quantity > 0)
      .map(l => ({ productId: l.productId, quantity: l.quantity, note: l.note || undefined }))
    if (items.length === 0) { setErr('Add at least one product'); return }
    fd.set('items',   JSON.stringify(items))
    fd.set('storeId', storeId)

    startTrans(async () => {
      try {
        setErr(null)
        await createWorkOrderAction(fd)
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type *</label>
          <select name="type" required className={inputCls}>
            <option value="STOCK_IN">Stock In (receive goods)</option>
            <option value="STOCK_OUT">Stock Out (issue goods)</option>
            <option value="ADJUSTMENT">Count Adjustment (stocktake)</option>
            <option value="DAMAGE_WRITE_OFF">Damage / Write-off</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reason / Notes *</label>
          <input name="reason" required className={inputCls} placeholder="e.g. Received from supplier ABC" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Products *</p>
          <button type="button" onClick={() => setLines(ls => [...ls, { productId: '', quantity: 1, note: '' }])}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors">+ Add line</button>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 items-center">
            <select
              value={line.productId}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, productId: e.target.value } : l))}
              className={inputCls}
            >
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <input type="number" min="1" value={line.quantity}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, quantity: parseInt(e.target.value) || 1 } : l))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-right outline-none focus:border-amber-500" />
            <input placeholder="Note (optional)" value={line.note}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, note: e.target.value } : l))}
              className={inputCls} />
            {lines.length > 1 && (
              <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none">×</button>
            )}
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={pending}
          className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
          {pending ? 'Creating…' : 'Create & Save as Draft'}
        </button>
      </div>
    </form>
  )
}

// ── Resubmit form ─────────────────────────────────────────────────────────────

function ResubmitForm({ wo, products, onDone, setError }: {
  wo: WorkOrder; products: Product[]; onDone: () => void; setError: (e: string | null) => void
}) {
  const [pending, startTrans] = useTransition()
  const [lines, setLines]     = useState(wo.items.map(i => ({ productId: i.productId, quantity: i.quantity, note: i.note ?? '' })))
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd    = new FormData(e.currentTarget)
    const items = lines.filter(l => l.productId && l.quantity > 0)
      .map(l => ({ productId: l.productId, quantity: l.quantity, note: l.note || undefined }))
    if (items.length === 0) { setErr('Add at least one product'); return }
    fd.set('id',    wo.id)
    fd.set('items', JSON.stringify(items))

    startTrans(async () => {
      try {
        setErr(null)
        await resubmitWorkOrderAction(fd)
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {wo.adminNote && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
          <strong className="text-red-400">Rejected reason: </strong>{wo.adminNote}
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Updated Reason *</label>
        <input name="reason" required defaultValue={wo.reason} className={inputCls} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Products</p>
          <button type="button" onClick={() => setLines(ls => [...ls, { productId: '', quantity: 1, note: '' }])}
            className="text-xs text-amber-400 hover:text-amber-300">+ Add line</button>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 items-center">
            <select value={line.productId}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, productId: e.target.value } : l))}
              className={inputCls}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <input type="number" min="1" value={line.quantity}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, quantity: parseInt(e.target.value) || 1 } : l))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-right outline-none focus:border-amber-500" />
            <input placeholder="Note" value={line.note}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, note: e.target.value } : l))}
              className={inputCls} />
            {lines.length > 1 && (
              <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
            )}
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Resubmitting…' : 'Resubmit for Approval'}
      </button>
    </form>
  )
}
