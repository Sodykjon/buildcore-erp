import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from '@/components/admin/reports/reports-dashboard'

export const revalidate = 0

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'ADMIN') redirect('/login')

  const { from, to } = await searchParams
  const now   = new Date()
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = to   ? new Date(to)   : now
  end.setHours(23, 59, 59, 999)

  const allowedStatuses = ['PAID', 'PARTIAL', 'FULFILLED'] as ('PAID' | 'PARTIAL' | 'FULFILLED')[]
  const orderWhere = {
    createdAt: { gte: start, lte: end },
    status:    { in: allowedStatuses },
  }

  const [
    revAgg,
    revByDay,
    revByStore,
    topProducts,
    inventoryValue,
    loyaltyEarned,
    loyaltyRedeemed,
    pendingWOs,
  ] = await Promise.all([
    prisma.order.aggregate({ where: orderWhere, _sum: { totalAmount: true }, _count: true }),

    prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
      SELECT
        DATE_TRUNC('day', "createdAt")::date::text AS day,
        SUM("totalAmount")::float                  AS revenue,
        COUNT(*)::int                              AS orders
      FROM orders
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        AND status IN ('PAID','PARTIAL','FULFILLED')
      GROUP BY 1
      ORDER BY 1
    `,

    prisma.order.groupBy({
      by: ['storeId'], where: orderWhere,
      _sum: { totalAmount: true }, _count: true,
    }),

    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: start, lte: end }, status: { in: allowedStatuses } } },
      _sum: { quantityOrdered: true },
      orderBy: { _sum: { quantityOrdered: 'desc' } },
      take: 8,
    }),

    prisma.$queryRaw<{ storeName: string; value: number; units: number }[]>`
      SELECT
        s.name                                                    AS "storeName",
        SUM(si."quantityOnHand" * p."costPrice")::float          AS value,
        SUM(si."quantityOnHand")::int                            AS units
      FROM store_inventory si
      JOIN stores   s ON s.id = si."storeId"
      JOIN products p ON p.id = si."productId"
      GROUP BY s.name
      ORDER BY value DESC
    `,

    prisma.loyaltyTransaction.aggregate({
      where: { createdAt: { gte: start, lte: end }, type: 'EARN' },
      _sum: { points: true }, _count: true,
    }),

    prisma.loyaltyTransaction.aggregate({
      where: { createdAt: { gte: start, lte: end }, type: 'REDEEM' },
      _sum: { points: true }, _count: true,
    }),

    prisma.workOrder.count({ where: { status: 'SUBMITTED' } }),
  ])

  const storeIds   = revByStore.map(r => r.storeId)
  const productIds = topProducts.map(p => p.productId)
  const [stores, products] = await Promise.all([
    prisma.store.findMany({ where: { id: { in: storeIds } } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true } }),
  ])

  return (
    <ReportsDashboard
      from={start.toISOString().slice(0, 10)}
      to={end.toISOString().slice(0, 10)}
      summary={{
        revenue:    Number(revAgg._sum?.totalAmount ?? 0),
        orders:     revAgg._count as number,
        avgOrder:   (revAgg._count as number) > 0 ? Number(revAgg._sum?.totalAmount ?? 0) / (revAgg._count as number) : 0,
        pendingWOs,
      }}
      dailyRevenue={revByDay.map(d => ({ day: d.day, revenue: Number(d.revenue), orders: Number(d.orders) }))}
      revenueByStore={revByStore.map(r => ({
        storeName: stores.find(s => s.id === r.storeId)?.name ?? r.storeId,
        revenue:   Number(r._sum?.totalAmount ?? 0),
        orders:    r._count as number,
      }))}
      topProducts={topProducts.map(tp => ({
        name: products.find(p => p.id === tp.productId)?.name ?? 'Unknown',
        unit: products.find(p => p.id === tp.productId)?.unit ?? '',
        qty:  tp._sum.quantityOrdered ?? 0,
      }))}
      inventoryValue={inventoryValue.map(r => ({ ...r, value: Number(r.value), units: Number(r.units) }))}
      loyaltyStats={{
        earned:   loyaltyEarned._sum.points   ?? 0,
        redeemed: Math.abs(loyaltyRedeemed._sum.points ?? 0),
        txCount:  loyaltyEarned._count + loyaltyRedeemed._count,
      }}
    />
  )
}
