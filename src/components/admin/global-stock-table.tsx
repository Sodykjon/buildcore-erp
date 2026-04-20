'use client'

import { useState } from 'react'
import type { GlobalStockRow } from '@/lib/inventory'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useLang } from '@/i18n/context'

export function GlobalStockTable({ rows }: { rows: GlobalStockRow[] }) {
  const { t } = useLang()
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = rows.filter(r =>
    r.productName.toLowerCase().includes(search.toLowerCase()) ||
    r.barcode.includes(search)
  )

  return (
    <div className="rounded-xl flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="p-4 flex items-center justify-between shrink-0 flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.inventory.globalStock}</h2>
        <input
          type="search"
          placeholder={`${t.inventory.searchProducts}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm outline-none transition-colors w-full sm:w-56"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Fixed header */}
      <table className="w-full text-sm table-fixed shrink-0">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-16" />
        </colgroup>
        <thead>
          <tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <th className="px-4 py-3 font-medium" />
            <th className="text-left px-4 py-3 font-medium">{t.products.productName}</th>
            <th className="text-right px-4 py-3 font-medium">{t.inventory.quantityOnHand}</th>
            <th className="text-right px-4 py-3 font-medium">{t.products.reserved}</th>
            <th className="text-right px-4 py-3 font-medium text-green-400">{t.products.available}</th>
            <th className="text-left px-4 py-3 font-medium">{t.common.unit}</th>
          </tr>
        </thead>
      </table>

      {/* Scrollable body */}
      <div className="overflow-y-auto max-h-[480px]">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-16" />
          </colgroup>
          <tbody>
            {filtered.map(row => (
              <>
                <tr
                  key={row.productId}
                  onClick={() => setExpanded(expanded === row.productId ? null : row.productId)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <td className="px-4 py-3 w-8" style={{ color: 'var(--text-muted)' }}>
                    {expanded === row.productId
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.productName}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.barcode}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {row.totalOnHand.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-400">
                    {row.totalReserved.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-400">
                    {row.totalAvailable.toLocaleString()}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{row.unit}</td>
                </tr>

                {expanded === row.productId && (
                  <tr key={`${row.productId}-detail`} style={{ background: 'var(--bg-elevated)' }}>
                    <td />
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {row.perStore.map(s => (
                          <div key={s.storeId} className="rounded-lg p-3 text-xs space-y-1" style={{ background: 'var(--bg-muted)' }}>
                            <p className="font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{s.storeName}</p>
                            <p style={{ color: 'var(--text-muted)' }}>{t.products.onHand}: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{s.onHand}</span></p>
                            <p style={{ color: 'var(--text-muted)' }}>{t.products.available}: <span className="font-mono text-green-400">{s.available}</span></p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {search ? t.common.noResults : 'No stock data yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
