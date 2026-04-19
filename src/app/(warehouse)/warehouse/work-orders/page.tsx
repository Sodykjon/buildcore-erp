import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WorkOrderManager } from '@/components/warehouse/work-orders/work-order-manager'

export const revalidate = 0

export default async function WorkOrdersPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'STAFF') redirect('/pos')

  const [workOrders, products] = await Promise.all([
    prisma.workOrder.findMany({
      where: profile.role === 'ADMIN' ? {} : { storeId: profile.storeId! },
      include: { store: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true, sku: true, costPrice: true, sellPrice: true } }),
  ])

  const serialized = workOrders.map(wo => ({
    ...wo,
    createdAt:   wo.createdAt.toISOString(),
    submittedAt: wo.submittedAt?.toISOString() ?? null,
    resolvedAt:  wo.resolvedAt?.toISOString()  ?? null,
    items: wo.items.map(i => ({
      ...i,
      product: { ...i.product, costPrice: Number(i.product.costPrice), sellPrice: Number(i.product.sellPrice) },
    })),
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <WorkOrderManager
        workOrders={serialized}
        products={products.map(p => ({ ...p, costPrice: Number(p.costPrice), sellPrice: Number(p.sellPrice) }))}
        storeId={profile.storeId ?? ''}
      />
    </div>
  )
}
