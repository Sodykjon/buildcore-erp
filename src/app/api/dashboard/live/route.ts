import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export const revalidate = 0

export async function GET() {
  const deny = await requireApiAuth()
  if (deny) return deny
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayEnd = new Date(todayStart)

  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)

  const [
    todayAgg, yesterdayAgg,
    recentOrders,
    hourlyRaw,
    topProducts,
    lowAlerts,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart }, status: { in: ['PAID', 'PARTIAL', 'FULFILLED'] } },
      _sum: { totalAmount: true }, _count: true,
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd }, status: { in: ['PAID', 'PARTIAL', 'FULFILLED'] } },
      _sum: { totalAmount: true }, _count: true,
    }),
    prisma.order.findMany({
      where:   { createdAt: { gte: todayStart } },
      include: { customer: { select: { fullName: true } }, store: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.$queryRaw<{ hour: number; revenue: number; orders: number }[]>`
      SELECT
        EXTRACT(HOUR FROM "createdAt")::int AS hour,
        SUM("totalAmount")::float           AS revenue,
        COUNT(*)::int                       AS orders
      FROM orders
      WHERE "createdAt" >= ${todayStart}
        AND status IN ('PAID','PARTIAL','FULFILLED')
      GROUP BY hour
      ORDER BY hour
    `,
    prisma.$queryRaw<{ name: string; unit: string; qty: number }[]>`
      SELECT p.name, p.unit, SUM(oi."quantityOrdered")::int AS qty
      FROM order_items oi
      JOIN products p ON p.id = oi."productId"
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."createdAt" >= ${weekStart}
        AND o.status IN ('PAID','PARTIAL','FULFILLED')
      GROUP BY p.id, p.name, p.unit
      ORDER BY qty DESC
      LIMIT 5
    `,
    prisma.lowStockAlert.count({ where: { isRead: false } }),
  ])

  const todayRev = Number(todayAgg._sum.totalAmount ?? 0)
  const yestRev  = Number(yesterdayAgg._sum.totalAmount ?? 0)
  const revChange = yestRev === 0 ? null : ((todayRev - yestRev) / yestRev) * 100

  return NextResponse.json({
    today: { revenue: todayRev, orders: todayAgg._count, revChange },
    yesterday: { revenue: yestRev, orders: yesterdayAgg._count },
    recentOrders: recentOrders.map(o => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status,
      totalAmount: Number(o.totalAmount),
      customerName: o.customer?.fullName ?? 'Guest', storeName: o.store.name,
      createdAt: o.createdAt.toISOString(),
    })),
    hourly: hourlyRaw,
    topProducts,
    lowAlerts,
  })
}
