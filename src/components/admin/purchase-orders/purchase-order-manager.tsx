'use client'

import { useState, useTransition } from 'react'
import { Plus, ChevronDown, ChevronRight, Send, PackageCheck, XCircle, Building2, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { formatDate, cn } from '@/lib/utils'
import {
  createSupplierAction, updateSupplierAction,
  createPurchaseOrderAction, submitPurchaseOrderAction,
  receivePurchaseOrderAction, cancelPurchaseOrderAction,
} from '@/app/actions/purchase-orders'
import { toast } from 'sonner'

type Supplier = { id: string; name: string; contact: string | null; phone: string | null; email: string | null; address: string | null }
type Product  = { id: string; name: string; sku: string; unit: string; costPrice: number }
type Store    = { id: string; name: string }
type POItem   = { id: string; productId: string; quantityOrdered: number; quantityReceived: number; unitCost: number; product: Product }
type PO = {
  id: string; poNumber: string; status: string; notes: string | null
  createdAt: string; orderedAt: string | null; receivedAt: string | null
  supplier: Supplier; store: Store; items: POItem[]
}

const statusColors: Record<string, string> = {
  DRAFT:               'bg-gray-500/20  text-gray-400  border-gray-500/30',
  ORDERED:             'bg-blue-500/20  text-blue-400  border-blue-500/30',
  PARTIALLY_RECEIVED:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  RECEIVED:            'bg-green-500/20 text-green-400 border-green-500/30',
  CANCELLED:           'bg-red-500/20   text-red-400   border-red-500/30',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft', ORDERED: 'Ordered',
  PARTIALLY_RECEIVED: 'Partial', RECEIVED: 'Received', CANCELLED: 'Cancelled',
}

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

interface Props { pos: PO[]; suppliers: Supplier[]; products: Product[]; stores: Store[] }

export function PurchaseOrderManager({ pos: initial, suppliers: initSuppliers, products, stores }: Props) {
  const [pos, setPOs]               = useState(initial)
  const [suppliers, setSuppliers]   = useState(initSuppliers)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [newPOOpen, setNewPOOpen]   = useState(false)
  const [receiveTarget, setReceive] = useState<PO | null>(null)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [tab, setTab]               = useState<'pos' | 'suppliers'>('pos')
  const [, startTrans]              = useTransition()

  function reload() { window.location.reload() }

  function handleSubmitPO(id: string) {
    startTrans(async () => {
      try { await submitPurchaseOrderAction(id); toast.success('PO submitted'); reload() }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error submitting PO') }
    })
  }

  function handleCancel(id: string) {
    if (!confirm('Cancel this purchase order?')) return
    startTrans(async () => {
      try { await cancelPurchaseOrderAction(id); toast.success('PO cancelled'); reload() }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error cancelling PO') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">Order stock from suppliers and receive into inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditSupplier(null); setSupplierOpen(true) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                       border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
            <Building2 className="w-4 h-4" /> Suppliers
          </button>
          <button onClick={() => setNewPOOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                       bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors">
            <Plus className="w-4 h-4" /> New PO
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {pos.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <PackageCheck className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-500">No purchase orders yet. Create one to order stock from a supplier.</p>
          </div>
        )}
        {pos.map(po => (
          <div key={po.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === po.id ? null : po.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expanded === po.id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <div className="text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-white">{po.poNumber}</span>
                    <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{po.supplier.name}</span>
                    <span className="text-xs text-gray-600">{po.store.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{po.items.length} item{po.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[po.status])}>
                  {statusLabel[po.status] ?? po.status}
                </span>
                <span className="text-xs text-gray-600">{formatDate(po.createdAt)}</span>
                {po.status === 'DRAFT' && (
                  <ActionButton size="sm" variant="primary" onClick={() => handleSubmitPO(po.id)}>
                    <Send className="w-3 h-3" /> Order
                  </ActionButton>
                )}
                {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                  <ActionButton size="sm" variant="primary" onClick={() => setReceive(po)}>
                    <PackageCheck className="w-3 h-3" /> Receive
                  </ActionButton>
                )}
                {(po.status === 'DRAFT' || po.status === 'ORDERED') && (
                  <ActionButton size="sm" variant="ghost" onClick={() => handleCancel(po.id)}>
                    <XCircle className="w-3 h-3" /> Cancel
                  </ActionButton>
                )}
              </div>
            </button>

            {expanded === po.id && (
              <div className="border-t border-gray-800 p-5 space-y-3">
                {po.notes && <p className="text-xs text-amber-400/80 italic">{po.notes}</p>}
                <div className="grid grid-cols-3 gap-2">
                  {po.items.map(item => {
                    const pct = item.quantityOrdered > 0 ? item.quantityReceived / item.quantityOrdered : 0
                    return (
                      <div key={item.id} className="bg-gray-800 rounded-lg p-3 text-xs">
                        <p className="font-medium text-white truncate">{item.product.name}</p>
                        <p className="text-gray-500 font-mono mt-0.5">{item.product.sku}</p>
                        <p className="text-gray-400 mt-1">
                          Ordered: <span className="font-mono text-white">{item.quantityOrdered}</span> {item.product.unit}
                        </p>
                        <p className="text-gray-400">
                          Received: <span className={cn('font-mono', pct >= 1 ? 'text-green-400' : pct > 0 ? 'text-amber-400' : 'text-gray-500')}>
                            {item.quantityReceived}
                          </span>
                        </p>
                        <p className="text-gray-500 mt-1">Cost: ${Number(item.unitCost).toFixed(2)}/{item.product.unit}</p>
                      </div>
                    )
                  })}
                </div>
                {po.orderedAt  && <p className="text-xs text-gray-600">Ordered: {formatDate(po.orderedAt)}</p>}
                {po.receivedAt && <p className="text-xs text-gray-600">Received: {formatDate(po.receivedAt)}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New PO modal */}
      <Modal open={newPOOpen} onClose={() => setNewPOOpen(false)} title="New Purchase Order" size="lg">
        <NewPOForm suppliers={suppliers} products={products} stores={stores}
          onDone={() => { setNewPOOpen(false); reload() }} />
      </Modal>

      {/* Receive modal */}
      <Modal open={!!receiveTarget} onClose={() => setReceive(null)} title="Receive Stock" size="md">
        {receiveTarget && (
          <ReceiveForm po={receiveTarget} onDone={() => { setReceive(null); reload() }} />
        )}
      </Modal>

      {/* Supplier modal */}
      <Modal open={supplierOpen} onClose={() => setSupplierOpen(false)}
        title={editSupplier ? 'Edit Supplier' : 'Suppliers'} size="md">
        <SupplierPanel suppliers={suppliers} editTarget={editSupplier}
          setEditTarget={setEditSupplier}
          onDone={() => { setSupplierOpen(false); reload() }} />
      </Modal>
    </div>
  )
}

// ── New PO Form ───────────────────────────────────────────────────────────────

function NewPOForm({ suppliers, products, stores, onDone }: {
  suppliers: Supplier[]; products: Product[]; stores: Store[]
  onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [lines, setLines]     = useState([{ productId: '', quantityOrdered: 1, unitCost: '' }])
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd    = new FormData(e.currentTarget)
    const items = lines.filter(l => l.productId && l.quantityOrdered > 0)
      .map(l => ({ productId: l.productId, quantityOrdered: l.quantityOrdered, unitCost: parseFloat(l.unitCost) || 0 }))
    if (items.length === 0) { setErr('Add at least one product'); return }
    fd.set('items', JSON.stringify(items))

    startTrans(async () => {
      try { setErr(null); await createPurchaseOrderAction(fd); toast.success('Purchase order created'); onDone() }
      catch (ex: unknown) { const msg = ex instanceof Error ? ex.message : 'Error'; setErr(msg); toast.error(msg) }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Supplier *</label>
          <select name="supplierId" required className={inputCls}>
            <option value="">Select supplier…</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Deliver to Store *</label>
          <select name="storeId" required className={inputCls}>
            <option value="">Select store…</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes</label>
        <input name="notes" className={inputCls} placeholder="Optional notes or reference number" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Items *</p>
          <button type="button" onClick={() => setLines(ls => [...ls, { productId: '', quantityOrdered: 1, unitCost: '' }])}
            className="text-xs text-amber-400 hover:text-amber-300">+ Add line</button>
        </div>
        <div className="grid grid-cols-[1fr_70px_90px_24px] gap-1 px-1 mb-1">
          {['Product', 'Qty', 'Unit Cost', ''].map(h => (
            <p key={h} className="text-xs text-gray-600">{h}</p>
          ))}
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_90px_24px] gap-2 items-center">
            <select value={line.productId}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, productId: e.target.value,
                unitCost: products.find(p => p.id === e.target.value)?.costPrice?.toString() ?? '' } : l))}
              className={inputCls}>
              <option value="">Select…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <input type="number" min="1" value={line.quantityOrdered}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, quantityOrdered: parseInt(e.target.value) || 1 } : l))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-right outline-none focus:border-amber-500 [appearance:textfield]" />
            <input type="number" min="0" step="0.01" value={line.unitCost} placeholder="0.00"
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, unitCost: e.target.value } : l))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-right outline-none focus:border-amber-500 [appearance:textfield]" />
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
        {pending ? 'Creating…' : 'Create Purchase Order'}
      </button>
    </form>
  )
}

// ── Receive Form ──────────────────────────────────────────────────────────────

function ReceiveForm({ po, onDone }: {
  po: PO; onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(po.items.map(i => [i.id, i.quantityOrdered - i.quantityReceived]))
  )
  const [err, setErr] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const items = po.items.map(i => ({
      purchaseOrderItemId: i.id,
      productId:           i.productId,
      quantityReceived:    qtys[i.id] ?? 0,
    }))
    const fd = new FormData()
    fd.set('id', po.id)
    fd.set('items', JSON.stringify(items))

    startTrans(async () => {
      try { setErr(null); await receivePurchaseOrderAction(fd); toast.success('Stock received'); onDone() }
      catch (ex: unknown) { const msg = ex instanceof Error ? ex.message : 'Error'; setErr(msg); toast.error(msg) }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm">
        <p className="font-mono font-semibold text-white">{po.poNumber}</p>
        <p className="text-xs text-gray-400 mt-0.5">{po.supplier.name} → {po.store.name}</p>
      </div>

      <div className="space-y-3">
        {po.items.map(item => {
          const remaining = item.quantityOrdered - item.quantityReceived
          return (
            <div key={item.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                <p className="text-xs text-gray-500">
                  Ordered {item.quantityOrdered} · Already received {item.quantityReceived} · Remaining {remaining}
                </p>
              </div>
              <input type="number" min="0" max={remaining} value={qtys[item.id] ?? 0}
                onChange={e => setQtys(q => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))}
                disabled={remaining <= 0}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white
                           text-right outline-none focus:border-amber-500 disabled:opacity-40 [appearance:textfield]" />
              <span className="text-xs text-gray-500 w-10">{item.product.unit}</span>
            </div>
          )
        })}
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Receiving…' : 'Confirm Receipt & Update Stock'}
      </button>
    </form>
  )
}

// ── Supplier Panel ────────────────────────────────────────────────────────────

function SupplierPanel({ suppliers, editTarget, setEditTarget, onDone }: {
  suppliers: Supplier[]; editTarget: Supplier | null
  setEditTarget: (s: Supplier | null) => void
  onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editTarget) fd.set('id', editTarget.id)

    startTrans(async () => {
      try {
        setErr(null)
        if (editTarget) { await updateSupplierAction(fd); toast.success('Supplier updated') }
        else { await createSupplierAction(fd); toast.success('Supplier created') }
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'; setErr(msg); toast.error(msg)
      }
    })
  }

  if (showForm || editTarget) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm font-semibold text-white">{editTarget ? 'Edit Supplier' : 'New Supplier'}</p>
        {[
          { name: 'name',    label: 'Name *',    required: true,  placeholder: 'Supplier Co.' },
          { name: 'contact', label: 'Contact',   required: false, placeholder: 'Contact person' },
          { name: 'phone',   label: 'Phone',     required: false, placeholder: '+1 234 567 8900' },
          { name: 'email',   label: 'Email',     required: false, placeholder: 'orders@supplier.com' },
          { name: 'address', label: 'Address',   required: false, placeholder: '123 Main St' },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <input name={f.name} required={f.required} placeholder={f.placeholder}
              defaultValue={editTarget ? (editTarget as Record<string, string | null>)[f.name] ?? '' : ''}
              className={inputCls} />
          </div>
        ))}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setShowForm(false); setEditTarget(null) }}
            className="flex-1 py-2 rounded-lg border border-gray-600 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={pending}
            className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
            {pending ? 'Saving…' : editTarget ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed
                   border-gray-700 text-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">
        <Plus className="w-4 h-4" /> Add Supplier
      </button>
      {suppliers.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No suppliers yet.</p>}
      <div className="space-y-2">
        {suppliers.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{s.name}</p>
              {s.contact && <p className="text-xs text-gray-500">{s.contact}</p>}
              {(s.phone || s.email) && (
                <p className="text-xs text-gray-500">{[s.phone, s.email].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            <button onClick={() => setEditTarget(s)}
              className="text-gray-600 hover:text-amber-400 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
