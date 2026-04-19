'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

type Props = {
  productName: string
  barcode:     string
  price:       number
  unit:        string
  storeName:   string
}

export function ThermalLabel({ productName, barcode, price, unit, storeName }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    JsBarcode(svgRef.current, barcode, {
      format:       'CODE128',
      width:        1.5,
      height:       40,
      displayValue: false,
      margin:       0,
    })
  }, [barcode])

  return (
    <div className="thermal-label">
      <p className="thermal-store">{storeName}</p>
      <p className="thermal-name">{productName}</p>
      <svg ref={svgRef} className="thermal-barcode" />
      <p className="thermal-barcode-text">{barcode}</p>
      <p className="thermal-price">${price.toFixed(2)} / {unit}</p>
    </div>
  )
}
