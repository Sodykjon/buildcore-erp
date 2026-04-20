'use client'

import { useState, useTransition } from 'react'
import { Warehouse, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { adjustInventoryAction, updateLowStockThresholdAction } from '@/app/actions/inventory'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'

type StoreRow = { storeId: string; storeName: string; onHand: number; reserved: number; threshold: number }
type ProductRow = {
  id: string; name: string; sku: string; unit: string; category: string
  stores: StoreRow[]
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors`

export function StockManager({ products }: { products: ProductRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<{ product: ProductRow; store: StoreRow } | null>(null)

  const visible = products.filter(p =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Stock Adjustment</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage per-store inventory levels</p>
        </div>
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 w-52"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>



      <div className="space-y-2">
        {visible.map(product => {
          const totalOnHand = product.stores.reduce((s, r) => s + r.onHand, 0)
          const isExpanded = expanded === product.id
          const isLow = product.stores.some(s => s.onHand <= s.threshold)

          return (
            <div key={product.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setExpanded(isExpanded ? null : product.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <div className="text-left">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.sku} · {product.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {isLow && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Low Stock</span>}
                  <div className="text-right">
                    <p className={`text-lg font-mono font-bold ${isLow ? 'text-red-400' : 'text-green-400'}`}>{totalOnHand}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.unit} total</p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="p-5" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-1 gap-3">
                    {product.stores.map(store => (
                      <StoreInventoryRow
                        key={store.storeId}
                        product={product}
                        store={store}
                        onAdjust={() => setAdjustTarget({ product, store })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {visible.length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <Warehouse className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p style={{ color: 'var(--text-muted)' }}>No products found.</p>
          </div>
        )}
      </div>

      {/* Adjustment modal */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust Stock — ${adjustTarget?.store.storeName}`}
        size="sm"
      >
        {adjustTarget && (
          <AdjustForm
            product={adjustTarget.product}
            store={adjustTarget.store}
            onDone={() => { setAdjustTarget(null); window.location.reload() }}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Per-store row ─────────────────────────────────────────────────────────────

function StoreInventoryRow({
  product, store, onAdjust,
}: {
  product: ProductRow
  store: StoreRow
  onAdjust: () => void
}) {
  const available = store.onHand - store.reserved
  const isLow = store.onHand <= store.threshold

  return (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${isLow ? 'ring-1 ring-red-500/30' : ''}`} style={{ background: 'var(--bg-elevated)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{store.storeName}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          On hand: <span className={`font-mono ${isLow ? 'text-red-400' : ''}`} style={!isLow ? { color: 'var(--text-primary)' } : {}}>{store.onHand}</span>
          {' · '}Reserved: <span className="font-mono text-amber-400">{store.reserved}</span>
          {' · '}Available: <span className="font-mono text-green-400">{available}</span>
          {' · '}Threshold: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{store.threshold}</span>
        </p>
      </div>
      <button
        onClick={onAdjust}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
      >
        <Plus className="w-3 h-3" /> Adjust
      </button>
    </div>
  )
}

// ── Adjust Form ───────────────────────────────────────────────────────────────

function AdjustForm({
  product, store, onDone,
}: {
  product: ProductRow
  store: StoreRow
  onDone: () => void
}) {
  const [type, setType] = useState<'add' | 'set' | 'remove'>('add')
  const [pending, startTrans] = useTransition()
  const [localErr, setLocalErr] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('storeId',   store.storeId)
    fd.set('productId', product.id)
    fd.set('type',      type)

    startTrans(async () => {
      try {
        setLocalErr(null)
        await adjustInventoryAction(fd)
        toast.success('Stock adjusted')
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setLocalErr(msg)
        toast.error(msg)
      }
    })
  }

  async function handleThreshold(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('storeId',   store.storeId)
    fd.set('productId', product.id)
    startTrans(async () => {
      try {
        await updateLowStockThresholdAction(fd)
        toast.success('Threshold updated')
        onDone()
      } catch (ex: unknown) {
        setLocalErr(ex instanceof Error ? ex.message : 'Error')
        toast.error(ex instanceof Error ? ex.message : 'Error updating threshold')
      }
    })
  }

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="space-y-5">
      <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--bg-elevated)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{product.name}</p>
        <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
          Current: <span className="font-mono text-green-400">{store.onHand}</span> {product.unit}
        </p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['add', 'set', 'remove'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              type === t
                ? 'bg-amber-500 text-gray-950'
                : 'hover:text-white'
            }`}
            style={type === t ? {} : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {t === 'add' ? '+ Add' : t === 'set' ? '= Set' : '− Remove'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            {type === 'add' ? 'Quantity to add' : type === 'set' ? 'Set quantity to' : 'Quantity to remove'}
          </label>
          <input
            name="quantity"
            type="number"
            min="0"
            required
            className={inputCls}
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Reason *</label>
          <input
            name="reason"
            type="text"
            required
            className={inputCls}
            placeholder="e.g. Stocktake correction, Damaged goods…"
            style={inputStyle}
          />
        </div>
        {localErr && <p className="text-xs text-red-400">{localErr}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Apply Adjustment'}
        </button>
      </form>

      <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Low stock threshold</p>
        <form onSubmit={handleThreshold} className="flex gap-2">
          <input
            name="threshold"
            type="number"
            min="0"
            defaultValue={store.threshold}
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}
          >
            Set
          </button>
        </form>
      </div>
    </div>
  )
}
