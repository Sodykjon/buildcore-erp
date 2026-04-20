'use client'

import { useState, useTransition } from 'react'
import { ArrowLeftRight, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import {
  approveTransferAction, shipTransferAction,
  receiveTransferAction, requestTransferAction,
} from '@/app/actions/transfers'
import { toast } from 'sonner'

type Store   = { id: string; name: string }
type Product = { id: string; name: string; sku: string; unit: string }
type Item    = {
  id: string; productId: string; quantityRequested: number
  quantityShipped: number | null; quantityReceived: number | null
  product: Product
}
type Transfer = {
  id: string; transferNumber: string; status: string; notes: string | null
  requestedAt: string; shippedAt: string | null; receivedAt: string | null
  sourceStore: Store; destStore: Store; items: Item[]
}

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-gray-500/20   text-gray-400   border-gray-500/30',
  APPROVED:  'bg-blue-500/20   text-blue-400   border-blue-500/30',
  SHIPPED:   'bg-amber-500/20  text-amber-400  border-amber-500/30',
  RECEIVED:  'bg-green-500/20  text-green-400  border-green-500/30',
  CANCELLED: 'bg-red-500/20    text-red-400    border-red-500/30',
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors`

interface Props {
  transfers: Transfer[]
  stores:    Store[]
  products:  Product[]
  isAdmin?:  boolean
  storeId?:  string
}

export function TransferManager({ transfers: initial, stores, products, isAdmin = true, storeId }: Props) {
  const [transfers, setTransfers] = useState(initial)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [newOpen, setNewOpen]     = useState(false)
  const [, startTrans]            = useTransition()

  function reload() { window.location.reload() }

  async function handleApprove(transferId: string) {
    try {
      await approveTransferAction(transferId)
      setTransfers(ts => ts.map(t => t.id === transferId ? { ...t, status: 'APPROVED' } : t))
      toast.success('Transfer approved')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error approving transfer') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inter-Store Transfers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{transfers.length} transfers</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                     bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Transfer
        </button>
      </div>

      <div className="space-y-3">
        {transfers.length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No transfers yet.
          </div>
        )}
        {transfers.map(t => (
          <TransferCard
            key={t.id}
            transfer={t}
            expanded={expanded === t.id}
            onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
            onApprove={handleApprove}
            onReload={reload}
            isAdmin={isAdmin}
            myStoreId={storeId}
          />
        ))}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Transfer Request" size="lg">
        <NewTransferForm
          stores={stores}
          products={products}
          defaultSourceStoreId={storeId}
          onDone={() => { setNewOpen(false); reload() }}
        />
      </Modal>
    </div>
  )
}

// ── Transfer Card ─────────────────────────────────────────────────────────────

function TransferCard({ transfer: t, expanded, onToggle, onApprove, onReload, isAdmin, myStoreId }: {
  transfer: Transfer; expanded: boolean
  onToggle: () => void; onApprove: (id: string) => Promise<void>
  onReload: () => void
  isAdmin?: boolean; myStoreId?: string
}) {
  const [shipOpen, setShipOpen]       = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onToggle} className="flex items-center gap-4 flex-1 text-left">
          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{t.transferNumber}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.sourceStore.name} → {t.destStore.name}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </button>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[t.status])}>
            {t.status}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(t.requestedAt)}</span>
          {t.status === 'REQUESTED' && isAdmin && (
            <ActionButton size="sm" variant="success" onClick={() => onApprove(t.id)}>
              Approve
            </ActionButton>
          )}
          {t.status === 'APPROVED' && isAdmin && (
            <ActionButton size="sm" variant="primary" onClick={() => setShipOpen(true)}>
              Ship
            </ActionButton>
          )}
          {t.status === 'SHIPPED' && (isAdmin || myStoreId === t.destStore.id) && (
            <ActionButton size="sm" variant="success" onClick={() => setReceiveOpen(true)}>
              Receive
            </ActionButton>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-5 grid grid-cols-3 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          {t.items.map(item => (
            <div key={item.id} className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg-elevated)' }}>
              <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.product.name}</p>
              <p className="mt-1 space-x-1" style={{ color: 'var(--text-secondary)' }}>
                <span>Req: <span style={{ color: 'var(--text-primary)' }}>{item.quantityRequested}</span></span>
                {item.quantityShipped != null && <span>· Ship: <span className="text-amber-400">{item.quantityShipped}</span></span>}
                {item.quantityReceived != null && <span>· Rcv: <span className="text-green-400">{item.quantityReceived}</span></span>}
                <span style={{ color: 'var(--text-muted)' }}>({item.product.unit})</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Ship modal */}
      <Modal open={shipOpen} onClose={() => setShipOpen(false)} title="Ship Transfer" size="md">
        <ShipForm
          transfer={t}
          onDone={() => { setShipOpen(false); onReload() }}
        />
      </Modal>

      {/* Receive modal */}
      <Modal open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive Transfer" size="md">
        <ReceiveForm
          transfer={t}
          onDone={() => { setReceiveOpen(false); onReload() }}
        />
      </Modal>
    </div>
  )
}

// ── Ship Form ─────────────────────────────────────────────────────────────────

function ShipForm({ transfer, onDone }: {
  transfer: Transfer; onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [qtys, setQtys]       = useState<Record<string, number>>(
    Object.fromEntries(transfer.items.map(i => [i.id, i.quantityRequested]))
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const items = transfer.items.map(i => ({ transferItemId: i.id, quantityShipped: qtys[i.id] ?? 0 }))
    const fd = new FormData()
    fd.set('transferId', transfer.id)
    fd.set('items', JSON.stringify(items))
    startTrans(async () => {
      try {
        await shipTransferAction(fd)
        toast.success('Transfer shipped')
        onDone()
      } catch (ex: unknown) { toast.error(ex instanceof Error ? ex.message : 'Error shipping transfer') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Confirm quantities to ship from <strong style={{ color: 'var(--text-primary)' }}>{transfer.sourceStore.name}</strong>.</p>
      <div className="space-y-2">
        {transfer.items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.product.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requested: {item.quantityRequested} {item.product.unit}</p>
            </div>
            <input
              type="number" min="0" max={item.quantityRequested}
              value={qtys[item.id] ?? item.quantityRequested}
              onChange={e => setQtys(q => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))}
              className="w-24 rounded-lg px-3 py-1.5 text-sm text-right outline-none focus:border-amber-500"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        ))}
      </div>
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Shipping…' : 'Confirm Ship'}
      </button>
    </form>
  )
}

// ── Receive Form ──────────────────────────────────────────────────────────────

function ReceiveForm({ transfer, onDone }: {
  transfer: Transfer; onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [qtys, setQtys]       = useState<Record<string, number>>(
    Object.fromEntries(transfer.items.map(i => [i.id, i.quantityShipped ?? i.quantityRequested]))
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const items = transfer.items.map(i => ({ transferItemId: i.id, quantityReceived: qtys[i.id] ?? 0 }))
    const fd = new FormData()
    fd.set('transferId', transfer.id)
    fd.set('items', JSON.stringify(items))
    startTrans(async () => {
      try {
        await receiveTransferAction(fd)
        toast.success('Transfer received')
        onDone()
      } catch (ex: unknown) { toast.error(ex instanceof Error ? ex.message : 'Error receiving transfer') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Confirm quantities received at <strong style={{ color: 'var(--text-primary)' }}>{transfer.destStore.name}</strong>.</p>
      <div className="space-y-2">
        {transfer.items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.product.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Shipped: {item.quantityShipped ?? '—'} {item.product.unit}</p>
            </div>
            <input
              type="number" min="0" max={item.quantityShipped ?? item.quantityRequested}
              value={qtys[item.id] ?? (item.quantityShipped ?? item.quantityRequested)}
              onChange={e => setQtys(q => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))}
              className="w-24 rounded-lg px-3 py-1.5 text-sm text-right outline-none focus:border-amber-500"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        ))}
      </div>
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Receiving…' : 'Confirm Receive'}
      </button>
    </form>
  )
}

// ── New Transfer Form ─────────────────────────────────────────────────────────

function NewTransferForm({ stores, products, onDone, defaultSourceStoreId }: {
  stores: Store[]; products: Product[]
  onDone: () => void
  defaultSourceStoreId?: string
}) {
  const [pending, startTrans] = useTransition()
  const [lines, setLines]     = useState<{ productId: string; qty: number }[]>([{ productId: '', qty: 1 }])
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const items = lines.filter(l => l.productId).map(l => ({ productId: l.productId, quantityRequested: l.qty }))
    if (items.length === 0) { setErr('Add at least one product'); return }
    fd.set('items', JSON.stringify(items))
    startTrans(async () => {
      try {
        setErr(null)
        await requestTransferAction(fd)
        toast.success('Transfer request submitted')
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); toast.error(msg)
      }
    })
  }

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>From Store *</label>
          {defaultSourceStoreId ? (
            <>
              <input type="hidden" name="sourceStoreId" value={defaultSourceStoreId} />
              <div className={`${inputCls} cursor-not-allowed opacity-70`} style={inputStyle}>
                {stores.find(s => s.id === defaultSourceStoreId)?.name ?? 'Your store'}
              </div>
            </>
          ) : (
            <select name="sourceStoreId" required className={inputCls} style={inputStyle}>
              <option value="">Select source…</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>To Store *</label>
          <select name="destStoreId" required className={inputCls} style={inputStyle}>
            <option value="">Select destination…</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Products</p>
          <button type="button" onClick={() => setLines(ls => [...ls, { productId: '', qty: 1 }])}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
            + Add line
          </button>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={line.productId}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, productId: e.target.value } : l))}
              className={`${inputCls} flex-1`}
              style={inputStyle}
            >
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <input
              type="number" min="1" value={line.qty}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, qty: parseInt(e.target.value) || 1 } : l))}
              className="w-24 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
              style={inputStyle}
            />
            {lines.length > 1 && (
              <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 transition-colors px-2">×</button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
        <input name="notes" className={inputCls} placeholder="Optional notes…" style={inputStyle} />
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Requesting…' : 'Request Transfer'}
      </button>
    </form>
  )
}
