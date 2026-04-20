import { prisma } from '@/lib/prisma'
import { OrdersManager } from '@/components/admin/orders/orders-manager'

export const revalidate = 30

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const { status, search } = await searchParams

  const orders = await prisma.order.findMany({
    where: {
      ...(status && { status: status as never }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    include: { customer: true, store: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const rows = orders.map(o => ({
    id:          o.id,
    orderNumber: o.orderNumber,
    status:      o.status,
    totalAmount: Number(o.totalAmount),
    createdAt:   o.createdAt.toISOString(),
    customer:    o.customer ? { fullName: o.customer.fullName, phone: o.customer.phone } : { fullName: 'Guest', phone: '' },
    store:       { name: o.store.name },
    items:       o.items.map(i => ({
      id:              i.id,
      productName:     i.product.name,
      unit:            i.product.unit,
      unitPrice:       Number(i.unitPrice),
      quantityOrdered: i.quantityOrdered,
      quantityPickedUp: i.quantityPickedUp,
    })),
  }))

  return <OrdersManager orders={rows} currentStatus={status} currentSearch={search} />
}
