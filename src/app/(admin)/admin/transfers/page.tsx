import { prisma } from '@/lib/prisma'
import { TransferManager } from '@/components/admin/transfers/transfer-manager'

export const revalidate = 0

export default async function TransfersPage() {
  const [transfers, stores, products] = await Promise.all([
    prisma.storeTransfer.findMany({
      include: {
        sourceStore: true,
        destStore:   true,
        items:       { include: { product: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true, sku: true, sellPrice: true, costPrice: true } }),
  ])

  const serialized = transfers.map(t => ({
    ...t,
    requestedAt: t.requestedAt.toISOString(),
    shippedAt:   t.shippedAt?.toISOString() ?? null,
    receivedAt:  t.receivedAt?.toISOString() ?? null,
    items: t.items.map(i => ({
      ...i,
      quantityShipped:  i.quantityShipped  ?? null,
      quantityReceived: i.quantityReceived ?? null,
      product: {
        ...i.product,
        costPrice: Number(i.product.costPrice),
        sellPrice: Number(i.product.sellPrice),
      },
    })),
  }))

  const serializedProducts = products.map(p => ({
    ...p,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
  }))

  return <TransferManager transfers={serialized} stores={stores} products={serializedProducts} />
}
