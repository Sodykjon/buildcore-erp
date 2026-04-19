import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DeliveryManager } from '@/components/admin/delivery/delivery-manager'

export const revalidate = 0

export default async function DeliveryPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'STAFF') redirect('/admin')

  const storeFilter = profile.role === 'ADMIN' ? {} : { order: { storeId: profile.storeId! } }

  const deliveries = await prisma.delivery.findMany({
    where:   storeFilter,
    include: {
      order: {
        include: {
          customer: { select: { fullName: true, phone: true } },
          store:    { select: { name: true } },
          items:    { include: { product: { select: { name: true, unit: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take:    200,
  })

  // Fulfilled orders without a delivery record — available to dispatch
  const fulfilledOrders = await prisma.order.findMany({
    where: {
      status:   'FULFILLED',
      delivery: null,
      ...(profile.role !== 'ADMIN' && { storeId: profile.storeId! }),
    },
    include: {
      customer: { select: { fullName: true, phone: true } },
      store:    { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const serialized = deliveries.map(d => ({
    ...d,
    scheduledAt: d.scheduledAt?.toISOString() ?? null,
    deliveredAt: d.deliveredAt?.toISOString() ?? null,
    createdAt:   d.createdAt.toISOString(),
    updatedAt:   d.updatedAt.toISOString(),
    order: {
      ...d.order,
      totalAmount: Number(d.order.totalAmount),
      createdAt:   d.order.createdAt.toISOString(),
      updatedAt:   d.order.updatedAt.toISOString(),
      paidAt:      d.order.paidAt?.toISOString() ?? null,
      customer:    d.order.customer
        ? { fullName: d.order.customer.fullName, phone: d.order.customer.phone ?? '' }
        : { fullName: 'Guest', phone: '' },
      items: d.order.items.map(i => ({
        ...i,
        unitPrice: Number(i.unitPrice),
      })),
    },
  }))

  const serializedOrders = fulfilledOrders.map(o => ({
    id:         o.id,
    orderNumber: o.orderNumber,
    totalAmount: Number(o.totalAmount),
    createdAt:  o.createdAt.toISOString(),
    customerName: o.customer?.fullName ?? 'Guest',
    customerPhone: o.customer?.phone ?? '',
    storeName:  o.store.name,
  }))

  return <DeliveryManager deliveries={serialized} pendingOrders={serializedOrders} />
}
