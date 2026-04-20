'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CartLine, type CartItem } from './cart-line'
import { CustomerSearch, type Customer } from './customer-search'
import { ProductSearch } from './product-search'
import { PaymentPanel } from './payment-panel'
import { ScanFeedback, type ScanState } from './scan-feedback'
import { OrderHistory } from './order-history'
import { Barcode, Trash2, LogOut, History, FileText, Package, Users, ChevronDown } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import { useLang } from '@/i18n/context'

type ProductLookup = {
  productId: string; name: string; unit: string
  unitPrice: number; barcode: string; onHand: number; reserved: number
}

type Props = { storeId: string; staffId: string; storeName?: string; userName?: string }

function makeCartItem(data: ProductLookup): CartItem {
  return {
    productId:     data.productId,
    barcode:       data.barcode,
    name:          data.name,
    unit:          data.unit,
    unitPrice:     data.unitPrice,
    overridePrice: data.unitPrice,
    discountPct:   0,
    quantity:      1,
    maxStock:      data.onHand - data.reserved,
  }
}

export function PosTerminal({ storeId, staffId, storeName, userName }: Props) {
  const router = useRouter()
  const { t } = useLang()

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const barcodeBuffer = useRef('')
  const bufferTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [cart,        setCart]       = useState<CartItem[]>([])
  const [customer,    setCustomer]   = useState<Customer | null>(null)
  const [scanState,   setScanState]  = useState<ScanState>('idle')
  const [lastScanned, setLastScanned] = useState('')
  const [notes,       setNotes]      = useState('')
  const [showNotes,   setShowNotes]  = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showManage,  setShowManage]  = useState(false)

  const subtotal = cart.reduce((s, i) => s + i.overridePrice * i.quantity, 0)

  const { refetch: lookupBarcode } = useQuery<ProductLookup | null>({
    queryKey: ['barcode-lookup', storeId, lastScanned],
    enabled:  false,
    staleTime: 30_000,
    queryFn:  async () => {
      if (!lastScanned) return null
      const res = await fetch(`/api/products/barcode/${lastScanned}?storeId=${storeId}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  function addToCart(data: ProductLookup) {
    const available = data.onHand - data.reserved
    if (available <= 0) return
    setCart(prev => {
      const existing = prev.find(i => i.productId === data.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === data.productId
            ? { ...i, quantity: Math.min(i.quantity + 1, available) }
            : i
        )
      }
      return [...prev, makeCartItem(data)]
    })
  }

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setLastScanned(barcode)
    const { data } = await lookupBarcode()

    if (!data) {
      setScanState('not-found')
      setTimeout(() => setScanState('idle'), 2000)
      return
    }

    const available = data.onHand - data.reserved
    if (available <= 0) {
      setScanState('no-stock')
      setTimeout(() => setScanState('idle'), 2000)
      return
    }

    setScanState('found')
    setTimeout(() => setScanState('idle'), 800)
    addToCart(data)
  }, [lookupBarcode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim()
        barcodeBuffer.current = ''
        clearTimeout(bufferTimer.current)
        if (code.length >= 4) handleBarcodeScan(code)
        return
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        clearTimeout(bufferTimer.current)
        bufferTimer.current = setTimeout(() => {
          const code = barcodeBuffer.current.trim()
          barcodeBuffer.current = ''
          if (code.length >= 8) handleBarcodeScan(code)
        }, 100)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleBarcodeScan])

  const updateQty = (productId: string, qty: number) =>
    setCart(prev =>
      qty <= 0
        ? prev.filter(i => i.productId !== productId)
        : prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
    )

  const updatePrice = (productId: string, overridePrice: number, discountPct: number) =>
    setCart(prev => prev.map(i =>
      i.productId === productId ? { ...i, overridePrice, discountPct } : i
    ))

  const clearCart = () => { setCart([]); setCustomer(null); setNotes(''); setShowNotes(false) }

  if (showHistory) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <Barcode className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.pos.title}</span>
              {storeName && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{storeName}</span>}
            </div>
            <button onClick={() => setShowHistory(false)}
              className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--accent)' }}>
              ← {t.common.back}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderHistory storeId={storeId} onClose={() => setShowHistory(false)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Left: cart */}
      <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="px-4 md:px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <Barcode className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.pos.title}</span>
            {storeName && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{storeName}</span>}
            <ScanFeedback state={scanState} barcode={lastScanned} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {userName && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{userName}</span>}
            <button onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <History className="w-4 h-4" /> {t.pos.orderHistory}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowManage(v => !v)}
                className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}
              >
                Manage <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showManage && 'rotate-180')} />
              </button>
              {showManage && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl shadow-xl overflow-hidden"
                       style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <p className="px-3 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Quick links</p>
                    <Link href="/admin/inventory" target="_blank"
                      onClick={() => setShowManage(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <div>
                        <p className="font-medium">{t.nav.inventory}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add or edit products</p>
                      </div>
                    </Link>
                    <Link href="/admin/customers" target="_blank"
                      onClick={() => setShowManage(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <div>
                        <p className="font-medium">{t.nav.customers}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Edit customer info</p>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>

            <button onClick={clearCart}
              className="flex items-center gap-1.5 text-sm transition-colors hover:text-red-400" style={{ color: 'var(--text-secondary)' }}>
              <Trash2 className="w-4 h-4" /> {t.pos.clearCart}
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm transition-colors hover:text-red-400" style={{ color: 'var(--text-secondary)' }}>
              <LogOut className="w-4 h-4" /> {t.nav.signOut}
            </button>
          </div>
        </div>

        {/* Product search bar */}
        <div className="px-4 md:px-6 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <ProductSearch storeId={storeId} onAdd={addToCart} />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Barcode className="w-12 h-12 mb-3" style={{ color: 'var(--bg-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.pos.scanBarcode}</p>
            </div>
          ) : (
            cart.map(item => (
              <CartLine
                key={item.productId}
                item={item}
                onQuantityChange={qty => updateQty(item.productId, qty)}
                onPriceChange={(price, disc) => updatePrice(item.productId, price, disc)}
                onRemove={() => updateQty(item.productId, 0)}
              />
            ))
          )}
        </div>

        {/* Footer: customer + notes + subtotal */}
        <div className="px-4 md:px-6 py-4 space-y-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <CustomerSearch onSelect={setCustomer} />

          <button
            onClick={() => setShowNotes(s => !s)}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              showNotes || notes ? '' : ''
            )}
            style={{ color: showNotes || notes ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <FileText className="w-3.5 h-3.5" />
            {notes ? `Note: ${notes.slice(0, 40)}${notes.length > 40 ? '…' : ''}` : 'Add order note'}
          </button>
          {showNotes && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Order note…"
              className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-colors resize-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          )}

          <div className="flex items-center justify-between text-lg font-semibold">
            <span style={{ color: 'var(--text-secondary)' }}>{t.pos.subtotal}</span>
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Right: payment */}
      <div className="w-full md:w-96 flex flex-col shrink-0" style={{ background: 'var(--bg-surface)' }}>
        <PaymentPanel
          cart={cart}
          storeId={storeId}
          staffId={staffId}
          storeName={storeName ?? ''}
          customer={customer}
          subtotal={subtotal}
          notes={notes}
          onSuccess={clearCart}
        />
      </div>
    </div>
  )
}
