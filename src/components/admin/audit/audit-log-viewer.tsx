'use client'

import { useRouter, usePathname } from 'next/navigation'
import { formatDate, cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'

type Log = {
  id: string; type: string; quantity: number; before: number; after: number
  reason: string; workOrderId: string | null; createdAt: string
  storeName: string; productName: string; productSku: string; productUnit: string
}
type Store   = { id: string; name: string }
type Product = { id: string; name: string; sku: string }

const TYPE_COLORS: Record<string, string> = {
  STOCK_IN:        'bg-green-500/20 text-green-400 border-green-500/30',
  STOCK_OUT:       'bg-red-500/20   text-red-400   border-red-500/30',
  ADJUSTMENT:      'bg-blue-500/20  text-blue-400  border-blue-500/30',
  DAMAGE_WRITE_OFF:'bg-orange-500/20 text-orange-400 border-orange-500/30',
  add:             'bg-green-500/20 text-green-400 border-green-500/30',
  set:             'bg-blue-500/20  text-blue-400  border-blue-500/30',
  remove:          'bg-red-500/20   text-red-400   border-red-500/30',
}

const selectCls = `bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 outline-none focus:border-amber-500 transition-colors`

interface Props {
  logs: Log[]; total: number; page: number; perPage: number
  stores: Store[]; products: Product[]
  filters: { storeId: string; productId: string; type: string; from: string; to: string }
}

export function AuditLogViewer({ logs, total, page, perPage, stores, products, filters }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const pages    = Math.ceil(total / perPage)

  function push(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      storeId:   filters.storeId,
      productId: filters.productId,
      type:      filters.type,
      from:      filters.from,
      to:        filters.to,
      page:      '1',
      ...overrides,
    })
    // strip empty
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k)
    router.push(`${pathname}?${p.toString()}`)
  }

  const delta = (l: Log) => l.after - l.before

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString()} inventory change records</p>
        </div>
        <a
          href={`/api/audit/export?storeId=${filters.storeId}&productId=${filters.productId}&type=${filters.type}&from=${filters.from}&to=${filters.to}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                     border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          <FileText className="w-4 h-4" /> Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <select value={filters.storeId} onChange={e => push({ storeId: e.target.value })} className={selectCls}>
          <option value="">All stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select value={filters.productId} onChange={e => push({ productId: e.target.value })} className={selectCls}>
          <option value="">All products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>

        <select value={filters.type} onChange={e => push({ type: e.target.value })} className={selectCls}>
          <option value="">All types</option>
          {['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGE_WRITE_OFF', 'add', 'set', 'remove'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={filters.from} onChange={e => push({ from: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500" />
          <span className="text-gray-600 text-sm">to</span>
          <input type="date" value={filters.to} onChange={e => push({ to: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500" />
        </div>

        {(filters.storeId || filters.productId || filters.type) && (
          <button onClick={() => push({ storeId: '', productId: '', type: '' })}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Time</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Store</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Before</th>
              <th className="text-right px-4 py-3">After</th>
              <th className="text-right px-4 py-3">Change</th>
              <th className="text-left px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No records found.</td>
              </tr>
            )}
            {logs.map(log => {
              const d = delta(log)
              return (
                <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-[140px]">{log.productName}</p>
                    <p className="text-xs text-gray-500 font-mono">{log.productSku}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.storeName}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', TYPE_COLORS[log.type] ?? 'bg-gray-800 text-gray-400 border-gray-700')}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">{log.before}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{log.after}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-semibold', d > 0 ? 'text-green-400' : d < 0 ? 'text-red-400' : 'text-gray-500')}>
                    {d > 0 ? '+' : ''}{d} {log.productUnit}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[180px]">
                    {log.reason}
                    {log.workOrderId && <span className="ml-1 text-amber-500/70">WO</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => push({ page: String(page - 1) })}
              className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => push({ page: String(page + 1) })}
              className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
