export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const storeId = req.nextUrl.searchParams.get('storeId') ?? ''
  if (!storeId) return NextResponse.json([])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: { storeId, createdAt: { gte: today } },
    include: {
      customer: { select: { fullName: true, phone: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(orders.map(o => ({
    ...o,
    totalAmount: Number(o.totalAmount),
    createdAt:   o.createdAt.toISOString(),
    paidAt:      o.paidAt?.toISOString() ?? null,
    customer:    o.customer ? { fullName: o.customer.fullName, phone: o.customer.phone } : { fullName: 'Guest', phone: '' },
    items: o.items.map(i => ({
      ...i,
      unitPrice: Number(i.unitPrice),
    })),
  })))
}
