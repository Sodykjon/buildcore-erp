'use client'

import { useState, useTransition } from 'react'
import { Warehouse, ChevronDown, ChevronRight, Plus, Minus, Hash } from 'lucide-react'
import { adjustInventoryAction, updateLowStockThresholdAction } from '@/app/actions/inventory'
import { Modal } from '@/components/ui/modal'

type StoreRow = { storeId: string; storeName: string; onHand: number; reserved: number; threshold: number }
type ProductRow = {
  id: string; name: string; sku: string; unit: string; category: string
  stores: StoreRow[]
}

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

export function StockManager({ products }: { products: ProductRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<{ product: ProductRow; store: StoreRow } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible = products.filter(p =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Adjustment</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage per-store inventory levels</p>
        </div>
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
                     text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 w-52"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {visible.map(product => {
          const totalOnHand = product.stores.reduce((s, r) => s + r.onHand, 0)
          const isExpanded = expanded === product.id
          const isLow = product.stores.some(s => s.onHand <= s.threshold)

          return (
            <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : product.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <div className="text-left">
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku} · {product.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {isLow && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Low Stock</span>}
                  <div className="text-right">
                    <p className={`text-lg font-mono font-bold ${isLow ? 'text-red-400' : 'text-green-400'}`}>{totalOnHand}</p>
                    <p className="text-xs text-gray-500">{product.unit} total</p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-800 p-5">
                  <div className="grid grid-cols-1 gap-3">
                    {product.stores.map(store => (
                      <StoreInventoryRow
                        key={store.storeId}
                        product={product}
                        store={store}
                        onAdjust={() => setAdjustTarget({ product, store })}
                        setError={setError}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {visible.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Warehouse className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-500">No products found.</p>
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
            setError={setError}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Per-store row ─────────────────────────────────────────────────────────────

function StoreInventoryRow({
  product, store, onAdjust, setError,
}: {
  product: ProductRow
  store: StoreRow
  onAdjust: () => void
  setError: (e: string | null) => void
}) {
  const available = store.onHand - store.reserved
  const isLow = store.onHand <= store.threshold

  return (
    <div className={`flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 ${isLow ? 'ring-1 ring-red-500/30' : ''}`}>
      <div>
        <p className="text-sm font-medium text-white">{store.storeName}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          On hand: <span className={`font-mono ${isLow ? 'text-red-400' : 'text-white'}`}>{store.onHand}</span>
          {' · '}Reserved: <span className="font-mono text-amber-400">{store.reserved}</span>
          {' · '}Available: <span className="font-mono text-green-400">{available}</span>
          {' · '}Threshold: <span className="font-mono text-gray-400">{store.threshold}</span>
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
  product, store, onDone, setError,
}: {
  product: ProductRow
  store: StoreRow
  onDone: () => void
  setError: (e: string | null) => void
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
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setLocalErr(msg)
        setError(msg)
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
        onDone()
      } catch (ex: unknown) {
        setLocalErr(ex instanceof Error ? ex.message : 'Error')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm">
        <p className="text-gray-400">{product.name}</p>
        <p className="text-white font-medium mt-0.5">
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
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {t === 'add' ? '+ Add' : t === 'set' ? '= Set' : '− Remove'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {type === 'add' ? 'Quantity to add' : type === 'set' ? 'Set quantity to' : 'Quantity to remove'}
          </label>
          <input
            name="quantity"
            type="number"
            min="0"
            required
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reason *</label>
          <input
            name="reason"
            type="text"
            required
            className={inputCls}
            placeholder="e.g. Stocktake correction, Damaged goods…"
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

      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500 mb-2">Low stock threshold</p>
        <form onSubmit={handleThreshold} className="flex gap-2">
          <input
            name="threshold"
            type="number"
            min="0"
            defaultValue={store.threshold}
            className={`${inputCls} flex-1`}
          />
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
          >
            Set
          </button>
        </form>
      </div>
    </div>
  )
}
