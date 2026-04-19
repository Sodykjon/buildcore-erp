export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const sp        = req.nextUrl.searchParams
  const storeId   = sp.get('storeId')   || undefined
  const productId = sp.get('productId') || undefined
  const type      = sp.get('type')      || undefined
  const from      = sp.get('from')
  const to        = sp.get('to')

  const now   = new Date()
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = to   ? new Date(to)   : now
  end.setHours(23, 59, 59, 999)

  const logs = await prisma.inventoryAdjustmentLog.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      ...(storeId   && { storeId }),
      ...(productId && { productId }),
      ...(type      && { type }),
    },
    include: {
      store:   { select: { name: true } },
      product: { select: { name: true, sku: true, unit: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const q = (s: string) => `"${s.replace(/"/g, '""')}"`

  const header = ['Date', 'Store', 'Product', 'SKU', 'Unit', 'Type', 'Before', 'After', 'Change', 'Reason', 'Work Order ID']
  const rows = logs.map(l => [
    q(l.createdAt.toISOString()),
    q(l.store.name),
    q(l.product.name),
    q(l.product.sku),
    q(l.product.unit),
    q(l.type),
    l.before,
    l.after,
    l.after - l.before,
    q(l.reason),
    q(l.workOrderId ?? ''),
  ])

  const csv = [header, ...rows].map(r => r.join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="audit-log-${start.toISOString().slice(0,10)}-to-${end.toISOString().slice(0,10)}.csv"`,
    },
  })
}
