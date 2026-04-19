'use client'

import { useState, useTransition } from 'react'
import { Plus, FileText, ArrowRight, Send, CheckCircle2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  createQuotationAction, updateQuotationStatusAction, convertQuotationToOrderAction,
} from '@/app/actions/quotations'

type QItem = { id: string; productId: string; quantity: number; unitPrice: number; product: { name: string; unit: string; sellPrice: number } }
type Quote = {
  id: string; quoteNumber: string; status: string; notes: string | null
  expiresAt: string | null; createdAt: string
  customer: { id: string; fullName: string; phone: string }
  store:    { id: string; name: string }
  staff:    { fullName: string }
  items:    QItem[]
}
type Store    = { id: string; name: string }
type Customer = { id: string; fullName: string; phone: string }
type Product  = { id: string; name: string; unit: string; sellPrice: number }

const STATUS_COLOR: Record<string, string> = {
  DRAFT:     'bg-gray-500/20  text-gray-400  border-gray-500/30',
  SENT:      'bg-blue-500/20  text-blue-400  border-blue-500/30',
  ACCEPTED:  'bg-green-500/20 text-green-400 border-green-500/30',
  EXPIRED:   'bg-red-500/20   text-red-400   border-red-500/30',
  CONVERTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

type LineItem = { productId: string; quantity: number; unitPrice: number }

export function QuotationManager({ quotes: initial, stores, customers, products, storeId, staffId }: {
  quotes:    Quote[]
  stores:    Store[]
  customers: Customer[]
  products:  Product[]
  storeId?:  string
  staffId:   string
}) {
  const [quotes, setQuotes]         = useState(initial)
  const [newOpen, setNewOpen]       = useState(false)
  const [detail, setDetail]         = useState<Quote | null>(null)
  const [statusFilter, setFilter]   = useState('')
  const [lines, setLines]           = useState<LineItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }])
  const [error, setError]           = useState<string | null>(null)
  const [, startTrans]              = useTransition()

  const visible = quotes.filter(q => !statusFilter || q.status === statusFilter)

  function addLine() { setLines(ls => [...ls, { productId: '', quantity: 1, unitPrice: 0 }]) }
  function removeLine(i: number) { setLines(ls => ls.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l
      if (field === 'productId') {
        const p = products.find(p => p.id === val)
        return { ...l, productId: val as string, unitPrice: p?.sellPrice ?? l.unitPrice }
      }
      return { ...l, [field]: val }
    }))
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('items', JSON.stringify(lines.filter(l => l.productId)))
    startTrans(async () => {
      try {
        await createQuotationAction(fd)
        setNewOpen(false)
        setLines([{ productId: '', quantity: 1, unitPrice: 0 }])
        window.location.reload()
      } catch (ex: unknown) { setError(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  async function handleStatusChange(id: string, status: string) {
    startTrans(async () => {
      try {
        await updateQuotationStatusAction(id, status)
        setQuotes(qs => qs.map(q => q.id === id ? { ...q, status } : q))
        if (detail?.id === id) setDetail(d => d ? { ...d, status } : d)
      } catch (ex: unknown) { setError(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  async function handleConvert(id: string) {
    if (!confirm('Convert this quote to an order?')) return
    startTrans(async () => {
      try {
        await convertQuotationToOrderAction(id)
        setQuotes(qs => qs.map(q => q.id === id ? { ...q, status: 'CONVERTED' } : q))
        setDetail(null)
        window.location.reload()
      } catch (ex: unknown) { setError(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{visible.length} quotes</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
            <option value="">All statuses</option>
            {['DRAFT','SENT','ACCEPTED','EXPIRED','CONVERTED'].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
          <button onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                       bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors">
            <Plus className="w-4 h-4" /> New Quote
          </button>
        </div>
      </div>

      {error && <p className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">{error}</p>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Quote #</th>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Store</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-left px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {visible.map(q => {
              const total = q.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
              return (
                <tr key={q.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(q)} className="font-mono text-amber-400 hover:text-amber-300 text-xs">
                      {q.quoteNumber}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{q.customer.fullName}</td>
                  <td className="px-4 py-3 text-gray-400">{q.store.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[q.status])}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">{formatCurrency(total)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {q.expiresAt ? formatDate(q.expiresAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {q.status === 'DRAFT' && (
                        <ActionButton size="sm" variant="ghost" onClick={() => handleStatusChange(q.id, 'SENT')}>
                          <Send className="w-3 h-3 mr-1" /> Send
                        </ActionButton>
                      )}
                      {(q.status === 'SENT' || q.status === 'ACCEPTED') && (
                        <ActionButton size="sm" variant="primary" onClick={() => handleConvert(q.id)}>
                          <ArrowRight className="w-3 h-3 mr-1" /> Convert
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No quotations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New quote modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Quotation" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {storeId ? (
              <input type="hidden" name="storeId" value={storeId} />
            ) : (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Store</label>
                <select name="storeId" required className={inputCls}>
                  <option value="">Select store…</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Customer</label>
              <select name="customerId" required className={inputCls}>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expires At</label>
              <input name="expiresAt" type="date" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input name="notes" placeholder="Optional notes…" className={inputCls} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Line Items</p>
              <button type="button" onClick={addLine}
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors">+ Add Line</button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select value={line.productId} onChange={e => updateLine(i, 'productId', e.target.value)}
                    className={inputCls}>
                    <option value="">Product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" min="1" value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className={inputCls} placeholder="Qty" />
                </div>
                <div className="col-span-3">
                  <input type="number" min="0" step="0.01" value={line.unitPrice}
                    onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className={inputCls} placeholder="Unit price" />
                </div>
                <div className="col-span-1 text-right text-xs text-gray-400 font-mono">
                  {formatCurrency(line.unitPrice * line.quantity)}
                </div>
                <div className="col-span-1 flex justify-center">
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-gray-600 hover:text-red-400">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-bold text-white pt-1 border-t border-gray-800">
              Total: {formatCurrency(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-2.5 rounded-lg font-bold text-gray-950 bg-amber-500 hover:bg-amber-400 transition-colors">
            Create Quotation
          </button>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.quoteNumber ?? ''} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-white">{detail.customer.fullName}</p>
                <p className="text-xs text-gray-400">{detail.customer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Store</p>
                <p className="text-white">{detail.store.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[detail.status])}>
                  {detail.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created by</p>
                <p className="text-white">{detail.staff.fullName}</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-2">
              {detail.items.map(item => (
                <div key={item.id} className="flex justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <p className="text-white">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <p className="font-mono text-gray-300">{formatCurrency(item.quantity * item.unitPrice)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-bold text-white">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(detail.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {detail.status === 'DRAFT' && (
                <button onClick={() => handleStatusChange(detail.id, 'SENT')}
                  className="flex-1 py-2 rounded-lg text-sm font-bold border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
                  Mark Sent
                </button>
              )}
              {detail.status === 'SENT' && (
                <button onClick={() => handleStatusChange(detail.id, 'ACCEPTED')}
                  className="flex-1 py-2 rounded-lg text-sm font-bold border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                  Mark Accepted
                </button>
              )}
              {(detail.status === 'SENT' || detail.status === 'ACCEPTED') && (
                <button onClick={() => handleConvert(detail.id)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors">
                  Convert to Order
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
