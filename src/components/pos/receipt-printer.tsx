'use client'

import { useRef } from 'react'
import { Printer } from 'lucide-react'
import type { CartItem } from './cart-line'
import type { Customer } from './customer-search'

interface Props {
  orderNumber:   string
  cart:          CartItem[]
  customer:      Customer | null
  subtotal:      number
  discount:      number
  total:         number
  storeName:     string
  paymentMethod: string
  fullWidth?:    boolean
}

export function ReceiptPrinter({ orderNumber, cart, customer, subtotal, discount, total, storeName, paymentMethod, fullWidth }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  function print() {
    const content = ref.current?.innerHTML ?? ''
    const win = window.open('', '_blank', 'width=320,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; padding: 12px; color: #000; }
          h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .bold { font-weight: bold; }
          .total { font-size: 14px; font-weight: bold; }
          .small { font-size: 10px; color: #555; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const now = new Date()

  return (
    <>
      <button onClick={print} className={fullWidth
        ? 'w-full py-3.5 rounded-xl font-bold border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm'
        : 'flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors'
      }>
        <Printer className={fullWidth ? 'w-4 h-4' : 'w-3.5 h-3.5'} /> Print Receipt
      </button>

      {/* Hidden receipt DOM — opened in popup for printing */}
      <div ref={ref} style={{ display: 'none' }}>
        <h1>BuildCore ERP</h1>
        <p className="center small">{storeName}</p>
        <div className="divider" />
        <p className="center">{orderNumber}</p>
        <p className="center small">{now.toLocaleDateString()} {now.toLocaleTimeString()}</p>
        {customer && <p className="center small">Customer: {customer.fullName}</p>}
        <div className="divider" />
        {cart.map(item => (
          <div key={item.productId}>
            <p>{item.name}</p>
            <div className="row">
              <span className="small">{item.quantity} × ${item.overridePrice.toFixed(2)}</span>
              <span>${(item.quantity * item.overridePrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="divider" />
        <div className="row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        {discount > 0 && <div className="row"><span>Loyalty Discount</span><span>-${discount.toFixed(2)}</span></div>}
        <div className="row total"><span>TOTAL</span><span>${total.toFixed(2)}</span></div>
        <div className="divider" />
        <p className="center small">Payment: {paymentMethod}</p>
        {customer && <p className="center small">Loyalty Points: {customer.loyaltyPoints}</p>}
        <div className="divider" />
        <p className="center small">Thank you for your business!</p>
      </div>
    </>
  )
}
