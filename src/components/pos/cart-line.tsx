'use client'

import { useState, useEffect } from 'react'
import { Minus, Plus, X, Pencil, Check } from 'lucide-react'

export type CartItem = {
  productId:     string
  barcode:       string
  name:          string
  unit:          string
  unitPrice:     number   // original sell price
  overridePrice: number   // effective price (may equal unitPrice)
  discountPct:   number   // 0–100
  quantity:      number
  maxStock:      number
}

type Props = {
  item:             CartItem
  onQuantityChange: (qty: number) => void
  onPriceChange:    (overridePrice: number, discountPct: number) => void
  onRemove:         () => void
}

export function CartLine({ item, onQuantityChange, onPriceChange, onRemove }: Props) {
  const [editing, setEditing] = useState(false)
  const [draftPrice, setDraftPrice] = useState(String(item.overridePrice.toFixed(2)))
  const [draftDisc,  setDraftDisc]  = useState(String(item.discountPct))
  const [draftQty,   setDraftQty]   = useState(String(item.quantity))
  useEffect(() => { setDraftQty(String(item.quantity)) }, [item.quantity])

  const lineTotal = item.overridePrice * item.quantity

  function commitEdit() {
    const price = parseFloat(draftPrice)
    const disc  = Math.min(100, Math.max(0, parseFloat(draftDisc) || 0))
    if (!isNaN(price) && price >= 0) {
      onPriceChange(price, disc)
    }
    setEditing(false)
  }

  function applyDiscount(pct: number) {
    const disc  = Math.min(100, Math.max(0, pct))
    const price = parseFloat((item.unitPrice * (1 - disc / 100)).toFixed(2))
    setDraftDisc(String(disc))
    setDraftPrice(String(price.toFixed(2)))
    onPriceChange(price, disc)
  }

  return (
    <div className="bg-gray-800/60 rounded-xl px-4 py-3 group">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.discountPct > 0 ? (
              <>
                <span className="text-xs text-gray-500 line-through">${item.unitPrice.toFixed(2)}</span>
                <span className="text-xs text-green-400 font-semibold">-{item.discountPct}%</span>
                <span className="text-xs text-gray-400">${item.overridePrice.toFixed(2)} / {item.unit}</span>
              </>
            ) : item.overridePrice !== item.unitPrice ? (
              <>
                <span className="text-xs text-gray-500 line-through">${item.unitPrice.toFixed(2)}</span>
                <span className="text-xs text-amber-400">${item.overridePrice.toFixed(2)} / {item.unit}</span>
              </>
            ) : (
              <span className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} / {item.unit}</span>
            )}
            <button
              onClick={() => { setDraftPrice(item.overridePrice.toFixed(2)); setDraftDisc(String(item.discountPct)); setEditing(e => !e) }}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-amber-400 transition-all"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { const q = item.quantity - 1; if (q >= 1) { setDraftQty(String(q)); onQuantityChange(q) } }}
            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number" value={draftQty} min={1} max={item.maxStock}
            onChange={e => setDraftQty(e.target.value)}
            onBlur={() => {
              const n = parseInt(draftQty, 10)
              const clamped = isNaN(n) || n < 1 ? 1 : Math.min(n, item.maxStock)
              setDraftQty(String(clamped))
              onQuantityChange(clamped)
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="w-14 text-center bg-gray-700 border border-gray-600 rounded-lg
                       py-1 text-sm font-mono text-white outline-none focus:border-amber-500 [appearance:textfield]"
          />
          <button
            onClick={() => { const q = item.quantity + 1; if (q <= item.maxStock) { setDraftQty(String(q)); onQuantityChange(q) } }}
            disabled={item.quantity >= item.maxStock}
            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <span className="w-20 text-right font-mono font-semibold text-white text-sm">
          ${lineTotal.toFixed(2)}
        </span>

        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-end gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Unit Price</p>
            <input
              type="number" min="0" step="0.01" value={draftPrice}
              onChange={e => { setDraftPrice(e.target.value); setDraftDisc('0') }}
              className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-amber-500 [appearance:textfield]"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Discount %</p>
            <input
              type="number" min="0" max="100" step="1" value={draftDisc}
              onChange={e => {
                const pct = parseFloat(e.target.value) || 0
                setDraftDisc(e.target.value)
                setDraftPrice((item.unitPrice * (1 - pct / 100)).toFixed(2))
              }}
              className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-amber-500 [appearance:textfield]"
            />
          </div>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map(p => (
              <button key={p} type="button" onClick={() => applyDiscount(p)}
                className="px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-amber-500/20 hover:text-amber-400 text-xs text-gray-400 transition-colors">
                {p}%
              </button>
            ))}
          </div>
          <button onClick={commitEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-bold transition-colors">
            <Check className="w-3 h-3" /> Apply
          </button>
        </div>
      )}
    </div>
  )
}
