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
import { cn } from '@/lib/utils'

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
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Barcode className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Point of Sale</span>
              {storeName && <span className="text-xs text-gray-500">{storeName}</span>}
            </div>
            <div className="flex items-center gap-4">
              {userName && <span className="text-xs text-gray-600">{userName}</span>}
              <button onClick={() => setShowHistory(false)}
                className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                ← Back to POS
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderHistory storeId={storeId} onClose={() => setShowHistory(false)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left: cart */}
      <div className="flex-1 flex flex-col border-r border-gray-800 min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Barcode className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-white">Point of Sale</span>
            {storeName && <span className="text-xs text-gray-500">{storeName}</span>}
            <ScanFeedback state={scanState} barcode={lastScanned} />
          </div>
          <div className="flex items-center gap-3">
            {userName && <span className="text-xs text-gray-600">{userName}</span>}
            <button onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
              <History className="w-4 h-4" /> History
            </button>

            {/* Manage dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowManage(v => !v)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
              >
                Manage <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showManage && 'rotate-180')} />
              </button>
              {showManage && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    <p className="px-3 py-2 text-[10px] text-gray-600 uppercase tracking-wider border-b border-gray-800">Quick links</p>
                    <Link href="/admin/inventory" target="_blank"
                      onClick={() => setShowManage(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                      <Package className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="font-medium">Products</p>
                        <p className="text-xs text-gray-500">Add or edit products</p>
                      </div>
                    </Link>
                    <Link href="/admin/customers" target="_blank"
                      onClick={() => setShowManage(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                      <Users className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="font-medium">Customers</p>
                        <p className="text-xs text-gray-500">Edit customer info</p>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>

            <button onClick={clearCart}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>

        {/* Product search bar */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-800/60 shrink-0">
          <ProductSearch storeId={storeId} onAdd={addToCart} />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Barcode className="w-12 h-12 text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Scan a barcode or search for a product</p>
              <p className="text-gray-600 text-xs mt-1">Scanner ready — no click needed</p>
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
        <div className="border-t border-gray-800 px-6 py-4 space-y-3 shrink-0">
          <CustomerSearch onSelect={setCustomer} />

          {/* Order notes toggle */}
          <button
            onClick={() => setShowNotes(s => !s)}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              showNotes || notes ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            {notes ? `Note: ${notes.slice(0, 40)}${notes.length > 40 ? '…' : ''}` : 'Add order note'}
          </button>
          {showNotes && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Order note (e.g. delivery instructions, customer request…)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs
                         text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500
                         transition-colors resize-none"
            />
          )}

          <div className="flex items-center justify-between text-lg font-semibold">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white font-mono">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Right: payment */}
      <div className="w-96 flex flex-col bg-gray-900 shrink-0">
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
