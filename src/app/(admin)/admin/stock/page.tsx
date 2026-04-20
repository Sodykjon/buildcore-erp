import { prisma } from '@/lib/prisma'
import { StockManager } from '@/components/admin/inventory/stock-manager'

export const revalidate = 30

export default async function StockPage() {
  const products = await prisma.product.findMany({
    where:   { isActive: true },
    include: {
      category: true,
      inventory: { include: { store: true }, orderBy: { store: { name: 'asc' } } },
    },
    orderBy: { name: 'asc' },
  })

  const rows = products.map(p => ({
    id:       p.id,
    name:     p.name,
    sku:      p.sku,
    unit:     p.unit,
    category: p.category.name,
    stores:   p.inventory.map(i => ({
      storeId:   i.storeId,
      storeName: i.store.name,
      onHand:    i.quantityOnHand,
      reserved:  i.quantityReserved,
      threshold: i.lowStockThreshold,
    })),
  }))

  return <StockManager products={rows} />
}
