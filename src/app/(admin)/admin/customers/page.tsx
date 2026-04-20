import { prisma } from '@/lib/prisma'
import { CustomerManager } from '@/components/admin/customers/customer-manager'

export const revalidate = 60

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: { select: { orders: true } },
      loyaltyTxs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const rows = customers.map(c => ({
    id:           c.id,
    fullName:     c.fullName,
    phone:        c.phone,
    email:        c.email,
    loyaltyPoints: c.loyaltyPoints,
    isActive:     c.isActive,
    orderCount:   c._count.orders,
    createdAt:    c.createdAt.toISOString(),
    loyaltyTxs:   c.loyaltyTxs.map(t => ({
      id:        t.id,
      type:      t.type,
      points:    t.points,
      note:      t.note,
      createdAt: t.createdAt.toISOString(),
    })),
  }))

  return <CustomerManager customers={rows} />
}
