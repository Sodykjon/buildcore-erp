import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertInbox } from '@/components/admin/alerts/alert-inbox'

export const revalidate = 30

export default async function AlertsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'ADMIN') redirect('/login')

  const alerts = await prisma.lowStockAlert.findMany({
    include: {
      store:   { select: { name: true } },
      product: { select: { name: true, sku: true, unit: true } },
    },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  const serialized = alerts.map((a: typeof alerts[number]) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AlertInbox alerts={serialized} />
    </div>
  )
}
