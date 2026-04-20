'use client'

import { useState, useEffect } from 'react'
import { Minus, Plus, X, Pencil, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export type CartItem = {
  productId:     string
  barcode:       string
  name:          string
  unit:          string
  unitPrice:     number
  overridePrice: number
  discountPct:   number
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
  const [draftPrice, setDraftPrice] = useState(String(item.overridePrice.toFixed(0)))
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
    const price = parseFloat((item.unitPrice * (1 - disc / 100)).toFixed(0))
    setDraftDisc(String(disc))
    setDraftPrice(String(price))
    onPriceChange(price, disc)
  }

  const INP = { background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const

  return (
    <div className="rounded-xl px-4 py-3 group" style={{ background: 'var(--bg-elevated)' }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.discountPct > 0 ? (
              <>
                <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.unitPrice)}</span>
                <span className="text-xs text-green-400 font-semibold">-{item.discountPct}%</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.overridePrice)} / {item.unit}</span>
              </>
            ) : item.overridePrice !== item.unitPrice ? (
              <>
                <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.unitPrice)}</span>
                <span className="text-xs text-amber-400">{formatCurrency(item.overridePrice)} / {item.unit}</span>
              </>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.unitPrice)} / {item.unit}</span>
            )}
            <button
              onClick={() => { setDraftPrice(String(item.overridePrice.toFixed(0))); setDraftDisc(String(item.discountPct)); setEditing(e => !e) }}
              className="opacity-0 group-hover:opacity-100 transition-all"
              style={{ color: 'var(--text-muted)' }}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { const q = item.quantity - 1; if (q >= 1) { setDraftQty(String(q)); onQuantityChange(q) } }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-muted)' }}
          >
            <Minus className="w-3 h-3" style={{ color: 'var(--text-primary)' }} />
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
            className="w-14 text-center rounded-lg py-1 text-sm font-mono outline-none [appearance:textfield]"
            style={INP}
          />
          <button
            onClick={() => { const q = item.quantity + 1; if (q <= item.maxStock) { setDraftQty(String(q)); onQuantityChange(q) } }}
            disabled={item.quantity >= item.maxStock}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ background: 'var(--bg-muted)' }}
          >
            <Plus className="w-3 h-3" style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>

        <span className="w-24 text-right font-mono font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(lineTotal)}
        </span>

        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400" style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {editing && (
        <div className="mt-3 pt-3 flex flex-wrap items-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Unit Price (UZS)</p>
            <input
              type="number" min="0" step="1" value={draftPrice}
              onChange={e => { setDraftPrice(e.target.value); setDraftDisc('0') }}
              className="w-32 rounded-lg px-2 py-1.5 text-sm outline-none [appearance:textfield]" style={INP}
            />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Discount %</p>
            <input
              type="number" min="0" max="100" step="1" value={draftDisc}
              onChange={e => {
                const pct = parseFloat(e.target.value) || 0
                setDraftDisc(e.target.value)
                setDraftPrice(String((item.unitPrice * (1 - pct / 100)).toFixed(0)))
              }}
              className="w-20 rounded-lg px-2 py-1.5 text-sm outline-none [appearance:textfield]" style={INP}
            />
          </div>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map(p => (
              <button key={p} type="button" onClick={() => applyDiscount(p)}
                className="px-2 py-1.5 rounded-lg text-xs transition-colors"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                {p}%
              </button>
            ))}
          </div>
          <button onClick={commitEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            <Check className="w-3 h-3" /> Apply
          </button>
        </div>
      )}
    </div>
  )
}
