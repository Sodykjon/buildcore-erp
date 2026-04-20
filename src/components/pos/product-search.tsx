'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type ProductResult = {
  productId: string; name: string; sku: string; unit: string
  unitPrice: number; barcode: string; onHand: number; reserved: number
}

export function ProductSearch({ storeId, onAdd }: { storeId: string; onAdd: (p: ProductResult) => void }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: results } = useQuery<ProductResult[]>({
    queryKey: ['product-search', storeId, query],
    enabled:  query.length >= 2,
    staleTime: 10_000,
    queryFn:  () => fetch(`/api/products/search?q=${encodeURIComponent(query)}&storeId=${storeId}`).then(r => r.json()),
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(p: ProductResult) { onAdd(p); setQuery(''); setOpen(false); inputRef.current?.focus() }
  const available = (p: ProductResult) => p.onHand - p.reserved

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search product by name or SKU…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2 rounded-xl text-sm outline-none transition-colors"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 w-full rounded-xl shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {!results?.length
            ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No products found</p>
            : results.map(p => {
                const avail = available(p)
                return (
                  <button key={p.productId} onClick={() => avail > 0 && pick(p)} disabled={avail <= 0}
                    className="w-full text-left px-4 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => { if (avail > 0) (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)' }}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.sku} · {formatCurrency(p.unitPrice)}/{p.unit}</p>
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${avail > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {avail > 0 ? `${avail} avail` : 'Out of stock'}
                      </span>
                    </div>
                  </button>
                )
              })
          }
        </div>
      )}
    </div>
  )
}
