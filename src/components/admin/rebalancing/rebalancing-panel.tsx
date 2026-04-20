'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, RefreshCw, CheckCircle2, Shuffle } from 'lucide-react'
import { requestTransferAction } from '@/app/actions/transfers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Suggestion = {
  productId:    string
  productName:  string
  sku:          string
  unit:         string
  fromStoreId:  string
  fromStore:    string
  fromOnHand:   number
  toStoreId:    string
  toStore:      string
  toOnHand:     number
  toThreshold:  number
  suggestedQty: number
}

type Store   = { id: string; name: string }
type Product = { id: string; name: string }

interface Props {
  suggestions: Suggestion[]
  stores:      Store[]
  products:    Product[]
}

export function RebalancingPanel({ suggestions, stores, products }: Props) {
  const [created, setCreated]   = useState<Set<string>>(new Set())
  const [errors,  setErrors]    = useState<Record<string, string>>({})
  const [, startTrans]          = useTransition()

  function key(s: Suggestion) {
    return `${s.productId}-${s.fromStoreId}-${s.toStoreId}`
  }

  async function handleCreate(s: Suggestion) {
    const k = key(s)
    startTrans(async () => {
      try {
        const fd = new FormData()
        fd.set('sourceStoreId', s.fromStoreId)
        fd.set('destStoreId',   s.toStoreId)
        fd.set('items', JSON.stringify([{ productId: s.productId, quantityRequested: s.suggestedQty }]))
        await requestTransferAction(fd)
        setCreated(prev => new Set(prev).add(k))
        toast.success(`Transfer created: ${s.productName}`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error'
        setErrors(prev => ({ ...prev, [k]: msg }))
        toast.error(msg)
      }
    })
  }

  async function handleCreateAll() {
    const pending = suggestions.filter(s => !created.has(key(s)))
    for (const s of pending) {
      await handleCreate(s)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Rebalancing</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Suggested transfers — overstocked → understocked stores
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                       bg-gray-800 text-gray-400 border border-gray-700 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={handleCreateAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                         bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
            >
              <Shuffle className="w-4 h-4" /> Create All Transfers
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300">
        <strong>How it works:</strong> Products are flagged when one store has more than 2× its low-stock threshold
        and another store is at or below its threshold. Suggested quantity brings the receiving store to 2× threshold
        while keeping the sending store above its own threshold.
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Stock is well-balanced</p>
          <p className="text-sm text-gray-500 mt-1">
            No products found with significant imbalance across stores. Make sure low-stock thresholds
            are configured in each store's inventory.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">From</th>
                <th className="text-left px-4 py-3 font-medium">To</th>
                <th className="text-right px-4 py-3 font-medium">Transfer Qty</th>
                <th className="text-right px-4 py-3 font-medium">Deficit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {suggestions.map(s => {
                const k       = key(s)
                const done    = created.has(k)
                const err     = errors[k]
                const deficit = s.toThreshold - s.toOnHand
                return (
                  <tr key={k} className={cn('transition-colors', done ? 'opacity-50' : 'hover:bg-gray-800/40')}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.productName}</p>
                      <p className="text-xs text-gray-500">{s.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-200">{s.fromStore}</p>
                      <p className="text-xs text-green-400 font-mono">{s.fromOnHand} {s.unit} on hand</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <div>
                          <p className="text-gray-200">{s.toStore}</p>
                          <p className="text-xs text-red-400 font-mono">{s.toOnHand} {s.unit} on hand</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-semibold text-amber-400">
                        {s.suggestedQty} {s.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-red-400 font-mono">−{deficit}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {done ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Created
                        </span>
                      ) : err ? (
                        <span className="text-xs text-red-400">{err}</span>
                      ) : (
                        <button
                          onClick={() => handleCreate(s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium
                                     bg-amber-500/10 text-amber-400 border border-amber-500/20
                                     hover:bg-amber-500/20 transition-colors"
                        >
                          Create Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600">
        {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} ·
        {' '}{created.size} transfer{created.size !== 1 ? 's' : ''} created this session ·
        Transfers will appear in{' '}
        <a href="/admin/transfers" className="text-amber-500 hover:text-amber-400">Transfers</a> for approval.
      </p>
    </div>
  )
}
