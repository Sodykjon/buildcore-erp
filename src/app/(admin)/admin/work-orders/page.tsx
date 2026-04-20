import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminWorkOrderManager } from '@/components/admin/work-orders/work-order-manager'

export const revalidate = 60

export default async function AdminWorkOrdersPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'ADMIN') redirect('/login')

  const workOrders = await prisma.workOrder.findMany({
    include: { store: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const serialized = workOrders.map(wo => ({
    ...wo,
    createdAt:   wo.createdAt.toISOString(),
    submittedAt: wo.submittedAt?.toISOString() ?? null,
    resolvedAt:  wo.resolvedAt?.toISOString()  ?? null,
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AdminWorkOrderManager workOrders={serialized} />
    </div>
  )
}
