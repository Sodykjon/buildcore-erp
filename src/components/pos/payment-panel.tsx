'use client'

import { useState, useTransition } from 'react'
import { createOrderAction } from '@/app/actions/orders'
import { CreditCard, Banknote, Smartphone, Loader2, Star, ArrowRight, Plus, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem } from './cart-line'
import type { Customer } from './customer-search'
import { ReceiptPrinter } from './receipt-printer'

const METHODS = [
  { id: 'CASH',   label: 'Cash',   icon: Banknote },
  { id: 'CARD',   label: 'Card',   icon: CreditCard },
  { id: 'MOBILE', label: 'Mobile', icon: Smartphone },
  { id: 'CREDIT', label: 'Credit', icon: Clock },
]

const POINT_VALUE = 0.01

type Split = { method: string; amount: string }

type Props = {
  cart:      CartItem[]
  storeId:   string
  staffId:   string
  storeName: string
  customer:  Customer | null
  subtotal:  number
  notes:     string
  onSuccess: () => void
}

export function PaymentPanel({ cart, storeId, staffId, storeName, customer, subtotal, notes, onSuccess }: Props) {
  const [splits,        setSplits]        = useState<Split[]>([{ method: 'CASH', amount: '' }])
  const [pointsToRedeem, setPointsToRedeem] = useState(0)
  const [isPending,     startTrans]       = useTransition()
  const [error,         setError]         = useState<string | null>(null)
  const [orderResult,   setOrderResult]   = useState<{ orderId: string; orderNumber: string; status: string } | null>(null)

  const maxRedeemable = customer ? Math.min(customer.loyaltyPoints, Math.floor(subtotal / POINT_VALUE)) : 0
  const discount      = pointsToRedeem * POINT_VALUE
  const total         = Math.max(0, subtotal - discount)

  // How much is already allocated across splits
  const allocated = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
  const remaining = Math.max(0, total - allocated)

  const disabled = cart.length === 0

  function updateSplit(i: number, field: keyof Split, val: string) {
    setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  function addSplit() {
    setSplits(prev => [...prev, { method: 'CASH', amount: '' }])
  }

  function removeSplit(i: number) {
    setSplits(prev => prev.filter((_, idx) => idx !== i))
  }

  // Fill the last split with remaining amount
  function fillRemaining(i: number) {
    const otherTotal = splits.reduce((s, sp, idx) => idx === i ? s : s + (parseFloat(sp.amount) || 0), 0)
    const fill = Math.max(0, total - otherTotal)
    updateSplit(i, 'amount', fill.toFixed(2))
  }

  async function handleCharge() {
    if (disabled) return
    setError(null)

    // Validate splits sum to total
    const parsedSplits = splits.map(s => ({ method: s.method, amount: parseFloat(s.amount) || 0 }))
      .filter(s => s.amount > 0)
    if (parsedSplits.length === 0) { setError('Enter payment amount'); return }

    const hasCredit = parsedSplits.some(s => s.method === 'CREDIT')
    if (hasCredit && !customer) { setError('Select a customer to use credit'); return }

    const totalParsed = parsedSplits.reduce((s, p) => s + p.amount, 0)
    if (Math.abs(totalParsed - total) > 0.01) {
      setError(`Amounts must add up to $${total.toFixed(2)} (currently $${totalParsed.toFixed(2)})`)
      return
    }

    startTrans(async () => {
      try {
        const fd = new FormData()
        fd.set('storeId',        storeId)
        fd.set('staffId',        staffId)
        if (customer) fd.set('customerId', customer.id)
        fd.set('pointsToRedeem', String(pointsToRedeem))
        fd.set('notes',          notes)
        fd.set('payments',       JSON.stringify(parsedSplits))
        fd.set('items', JSON.stringify(
          cart.map(i => ({ productId: i.productId, quantityOrdered: i.quantity, unitPrice: i.overridePrice }))
        ))
        const result = await createOrderAction(fd)
        setOrderResult(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Payment failed')
      }
    })
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (orderResult) {
    const isCredit  = orderResult.status === 'PENDING'
    const isPartial = orderResult.status === 'PARTIAL'
    return (
      <div className="flex flex-col h-full p-6 gap-4">
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"
              style={{ animationDuration: '1.2s', animationIterationCount: '1' } as React.CSSProperties} />
            <div className={cn(
              'relative w-20 h-20 rounded-full border-2 flex items-center justify-center',
              isCredit  ? 'bg-blue-500/15 border-blue-500/40' :
              isPartial ? 'bg-amber-500/15 border-amber-500/40' :
                          'bg-green-500/15 border-green-500/40'
            )}>
              {isCredit ? (
                <Clock className="w-9 h-9 text-blue-400" />
              ) : (
                <svg className={cn('w-9 h-9', isPartial ? 'text-amber-400' : 'text-green-400')}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {isCredit ? 'Order Saved' : isPartial ? 'Partial Payment' : 'Payment Complete'}
            </p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{orderResult.orderNumber}</p>
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Loyalty discount</span>
              <span className="font-mono">−${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-white text-base">
            <span>Total</span>
            <span className={cn('font-mono', isCredit ? 'text-blue-400' : isPartial ? 'text-amber-400' : 'text-green-400')}>
              ${total.toFixed(2)}
            </span>
          </div>
          {splits.filter(s => parseFloat(s.amount) > 0).map((s, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500">
              <span>{METHODS.find(m => m.id === s.method)?.label ?? s.method}</span>
              <span className="font-mono">${parseFloat(s.amount).toFixed(2)}</span>
            </div>
          ))}
          {customer && <p className="text-xs text-amber-400/80 pt-0.5">{customer.fullName}</p>}
          {isCredit && (
            <p className="text-xs text-blue-400 bg-blue-500/10 rounded-lg px-2 py-1 mt-1">
              Credit balance updated — customer pays later
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <ReceiptPrinter
            orderNumber={orderResult.orderNumber}
            cart={cart} customer={customer} subtotal={subtotal}
            discount={discount} total={total} storeName={storeName}
            paymentMethod={splits.map(s => `${s.method}:${s.amount}`).join('+')}
            fullWidth
          />
          <button
            onClick={() => { setOrderResult(null); setSplits([{ method: 'CASH', amount: '' }]); setPointsToRedeem(0); setError(null); onSuccess() }}
            className="w-full py-3.5 rounded-xl font-bold text-gray-950 bg-amber-500 hover:bg-amber-400
                       active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            New Sale <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Payment form ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-y-auto">
      <h2 className="font-semibold text-white text-lg shrink-0">Payment</h2>

      {/* Totals */}
      <div className="bg-gray-800/50 rounded-xl p-3 space-y-1.5 text-sm shrink-0">
        <div className="flex justify-between text-gray-400">
          <span>Items ({cart.length})</span>
          <span className="font-mono">${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-amber-400">
            <span>Loyalty ({pointsToRedeem} pts)</span>
            <span className="font-mono">−${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-gray-700 pt-1.5 flex justify-between text-lg font-bold text-white">
          <span>Total</span>
          <span className="font-mono">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Loyalty */}
      {customer && customer.loyaltyPoints > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Loyalty Points</span>
            </div>
            <span className="text-xs font-bold text-amber-400 font-mono">{customer.loyaltyPoints} pts</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max={maxRedeemable}
              value={pointsToRedeem || ''}
              onChange={e => { const n = parseInt(e.target.value, 10); setPointsToRedeem(isNaN(n) || n < 0 ? 0 : Math.min(n, maxRedeemable)) }}
              placeholder="0"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white
                         outline-none focus:border-amber-500 transition-colors text-right font-mono"
            />
            <span className="text-xs text-gray-500 whitespace-nowrap">= −${discount.toFixed(2)}</span>
            {maxRedeemable > 0 && (
              <button onClick={() => setPointsToRedeem(maxRedeemable)}
                className="text-xs text-amber-500 hover:text-amber-400 whitespace-nowrap">Max</button>
            )}
          </div>
        </div>
      )}

      {/* Split payments */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Payment splits</p>
          {remaining > 0.005 && (
            <span className="text-xs text-amber-400 font-mono">Remaining: ${remaining.toFixed(2)}</span>
          )}
          {Math.abs(allocated - total) < 0.005 && allocated > 0 && (
            <span className="text-xs text-green-400">✓ Balanced</span>
          )}
        </div>

        {splits.map((split, i) => {
          const isCredit = split.method === 'CREDIT'
          return (
            <div key={i} className="flex gap-2 items-center">
              {/* Method picker */}
              <div className="grid grid-cols-4 gap-1 flex-1">
                {METHODS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => updateSplit(i, 'method', id)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-2 rounded-lg border text-[10px] font-medium transition-all',
                      split.method === id
                        ? id === 'CREDIT'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-gray-700 text-gray-500 hover:border-gray-600'
                    )}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" min="0" step="0.01"
                    value={split.amount}
                    onChange={e => updateSplit(i, 'amount', e.target.value)}
                    placeholder={remaining.toFixed(0)}
                    className="w-24 pl-5 pr-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
                               text-white font-mono outline-none focus:border-amber-500 [appearance:textfield]"
                  />
                </div>
                <button onClick={() => fillRemaining(i)}
                  className="text-xs text-gray-500 hover:text-amber-400 px-1 transition-colors" title="Fill remaining">
                  ↵
                </button>
              </div>

              {splits.length > 1 && (
                <button onClick={() => removeSplit(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}

        <button onClick={addSplit}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors mt-1">
          <Plus className="w-3.5 h-3.5" /> Add another payment method
        </button>

        {!customer && splits.some(s => s.method === 'CREDIT') && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Select a customer to use credit
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 shrink-0">
          {error}
        </p>
      )}

      <div className="mt-auto pt-2 shrink-0">
        <button onClick={handleCharge} disabled={disabled || isPending}
          className="w-full py-4 rounded-xl font-bold text-gray-950 text-lg
                     bg-amber-500 hover:bg-amber-400 active:scale-[0.98]
                     transition-all disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2">
          {isPending
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
            : `Charge $${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
