export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const sp   = req.nextUrl.searchParams
  const from = sp.get('from')
  const to   = sp.get('to')

  const now   = new Date()
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = to   ? new Date(to)   : now
  end.setHours(23, 59, 59, 999)

  const allowedStatuses = ['PAID', 'PARTIAL', 'FULFILLED'] as ('PAID' | 'PARTIAL' | 'FULFILLED')[]

  const [orders, inventory, loyalty] = await Promise.all([
    prisma.order.findMany({
      where:   { createdAt: { gte: start, lte: end }, status: { in: allowedStatuses } },
      include: {
        store:    { select: { name: true } },
        customer: { select: { fullName: true } },
        items:    { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    }),
    prisma.storeInventory.findMany({
      include: {
        store:   { select: { name: true } },
        product: { select: { name: true, sku: true, unit: true, costPrice: true } },
      },
    }),
    prisma.loyaltyTransaction.findMany({
      where:   { createdAt: { gte: start, lte: end } },
      include: { customer: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    }),
  ])

  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const sections: string[] = []

  // Revenue section
  sections.push('REVENUE')
  sections.push(['Date', 'Order #', 'Store', 'Customer', 'Total', 'Status'].map(q).join(','))
  for (const o of orders) {
    sections.push([
      q(o.createdAt.toISOString()),
      q(o.orderNumber),
      q(o.store.name),
      q(o.customer?.fullName ?? 'Guest'),
      Number(o.totalAmount).toFixed(2),
      q(o.status),
    ].join(','))
  }
  sections.push('')

  // Inventory value section
  sections.push('INVENTORY VALUE')
  sections.push(['Store', 'Product', 'SKU', 'Unit', 'On Hand', 'Cost Price', 'Total Value'].map(q).join(','))
  for (const inv of inventory) {
    const value = inv.quantityOnHand * Number(inv.product.costPrice)
    sections.push([
      q(inv.store.name),
      q(inv.product.name),
      q(inv.product.sku),
      q(inv.product.unit),
      inv.quantityOnHand,
      Number(inv.product.costPrice).toFixed(2),
      value.toFixed(2),
    ].join(','))
  }
  sections.push('')

  // Loyalty section
  sections.push('LOYALTY TRANSACTIONS')
  sections.push(['Date', 'Customer', 'Type', 'Points', 'Note'].map(q).join(','))
  for (const tx of loyalty) {
    sections.push([
      q(tx.createdAt.toISOString()),
      q(tx.customer?.fullName ?? 'Guest'),
      q(tx.type),
      tx.points,
      q(tx.note ?? ''),
    ].join(','))
  }

  const csv = sections.join('\n')
  const filename = `reports-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
