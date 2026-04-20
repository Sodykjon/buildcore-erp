import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QuotationManager } from '@/components/admin/quotations/quotation-manager'

export const revalidate = 60

export default async function QuotationsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'STAFF') redirect('/admin')

  const storeFilter = profile.role === 'ADMIN' ? {} : { storeId: profile.storeId! }

  const [quotes, stores, customers, products] = await Promise.all([
    prisma.quotation.findMany({
      where:   storeFilter,
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        store:    { select: { id: true, name: true } },
        staff:    { select: { fullName: true } },
        items:    { include: { product: { select: { id: true, name: true, unit: true, sellPrice: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take:    200,
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' } }),
    prisma.customer.findMany({ orderBy: { fullName: 'asc' }, select: { id: true, fullName: true, phone: true } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true, sellPrice: true } }),
  ])

  const serialized = quotes.map(q => ({
    ...q,
    expiresAt:  q.expiresAt?.toISOString() ?? null,
    createdAt:  q.createdAt.toISOString(),
    updatedAt:  q.updatedAt.toISOString(),
    items: q.items.map(i => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      product:   { ...i.product, sellPrice: Number(i.product.sellPrice) },
    })),
  }))

  const serializedProducts = products.map(p => ({ ...p, sellPrice: Number(p.sellPrice) }))

  return (
    <QuotationManager
      quotes={serialized}
      stores={stores}
      customers={customers}
      products={serializedProducts}
      storeId={profile.storeId ?? undefined}
      staffId={profile.id}
    />
  )
}
