import { NextResponse } from 'next/server'

const TEMPLATE = [
  'name,sku,barcode,category,unit,costPrice,sellPrice,lowStockThreshold,description',
  'Cement Bag 50kg,CEM-50KG,1234567890001,Building Materials,bag,12.50,18.00,20,Portland cement',
  'Steel Rod 12mm,STL-12MM,1234567890002,Steel & Iron,piece,8.00,11.00,50,',
].join('\n')

export function GET() {
  return new NextResponse(TEMPLATE, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': 'attachment; filename="products-template.csv"',
    },
  })
}
