import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PurchaseOrderManager } from '@/components/admin/purchase-orders/purchase-order-manager'

export const revalidate = 60

export default async function PurchaseOrdersPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'ADMIN') redirect('/login')

  const [pos, suppliers, products, stores] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        store:    { select: { id: true, name: true } },
        items:    { include: { product: { select: { id: true, name: true, sku: true, unit: true, costPrice: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.store.findMany({ orderBy: { name: 'asc' } }),
  ])

  const serialized = pos.map(po => ({
    ...po,
    createdAt:  po.createdAt.toISOString(),
    orderedAt:  po.orderedAt?.toISOString()  ?? null,
    receivedAt: po.receivedAt?.toISOString() ?? null,
    items: po.items.map(i => ({ ...i, unitCost: Number(i.unitCost), product: { ...i.product, costPrice: Number(i.product.costPrice) } })),
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PurchaseOrderManager
        pos={serialized}
        suppliers={suppliers}
        products={products.map(p => ({ ...p, costPrice: Number(p.costPrice) }))}
        stores={stores}
      />
    </div>
  )
}
