'use client'

import { useState } from 'react'
import type { GlobalStockRow } from '@/lib/inventory'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function GlobalStockTable({ rows }: { rows: GlobalStockRow[] }) {
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = rows.filter(r =>
    r.productName.toLowerCase().includes(search.toLowerCase()) ||
    r.barcode.includes(search)
  )

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-white">Global Stock</h2>
        <input
          type="search"
          placeholder="Search product or barcode…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm
                     text-gray-200 placeholder:text-gray-500 outline-none
                     focus:border-amber-500 w-56 transition-colors"
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
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 font-medium" />
            <th className="text-left px-4 py-3 font-medium">Product</th>
            <th className="text-right px-4 py-3 font-medium">On Hand</th>
            <th className="text-right px-4 py-3 font-medium">Reserved</th>
            <th className="text-right px-4 py-3 font-medium text-green-400">Available</th>
            <th className="text-left px-4 py-3 font-medium">Unit</th>
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
          <tbody className="divide-y divide-gray-800/50">
            {filtered.map(row => (
              <>
                <tr
                  key={row.productId}
                  onClick={() => setExpanded(expanded === row.productId ? null : row.productId)}
                  className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500 w-8">
                    {expanded === row.productId
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.productName}</p>
                    <p className="text-xs text-gray-500 font-mono">{row.barcode}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">
                    {row.totalOnHand.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-400">
                    {row.totalReserved.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-400">
                    {row.totalAvailable.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{row.unit}</td>
                </tr>

                {expanded === row.productId && (
                  <tr key={`${row.productId}-detail`} className="bg-gray-800/30">
                    <td />
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid grid-cols-4 gap-2">
                        {row.perStore.map(s => (
                          <div key={s.storeId} className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                            <p className="font-medium text-gray-300 truncate">{s.storeName}</p>
                            <p className="text-gray-500">On hand: <span className="text-white font-mono">{s.onHand}</span></p>
                            <p className="text-gray-500">Available: <span className="text-green-400 font-mono">{s.available}</span></p>
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                  {search ? 'No products match your search.' : 'No stock data yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
